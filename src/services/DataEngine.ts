/**
 * DataEngine: one place for every call the app makes to the backend.
 *
 *   dataEngine.query('/assets', { status: 'repair' })          // GET
 *   dataEngine.mutate('POST', '/assets', { name: 'Laptop' })   // POST / PUT / PATCH / DELETE
 *   dataEngine.auth.login({ username, password })              // sign in, sign out, refresh, session
 *
 * Plain fetch, no dependencies. It attaches the bearer token, refreshes it once on a
 * 401 and retries, times out slow calls, and throws one error type for everything.
 */

/* ---------- Types ---------- */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type MutateMethod = Exclude<HttpMethod, 'GET'>;

export type QueryValue = string | number | boolean | Date | null | undefined;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export interface RequestOptions {
    /** Extra headers for this call. */
    headers?: Record<string, string>;
    /** Cancel the call from outside (e.g. when a screen unmounts). */
    signal?: AbortSignal;
    /** Overrides the engine's default timeout. */
    timeoutMs?: number;
    /** Set false for public endpoints so no token is sent. Default true. */
    auth?: boolean;
}

export interface AuthUser {
    id: string;
    name: string;
    role?: string;
    [key: string]: unknown;
}

export interface Session {
    accessToken: string;
    refreshToken?: string;
    /** Epoch milliseconds when the access token stops working. */
    expiresAt?: number;
    user: AuthUser | null;
}

export type Credentials = { username: string; password: string } & Record<string, unknown>;

export interface SessionStorageAdapter {
    load(): Session | null;
    save(session: Session | null): void;
}

export interface DataEngineConfig {
    /** e.g. https://api.example.com/v1 or /api */
    baseUrl: string;
    /** Default 15 000 ms. */
    timeoutMs?: number;
    /** Where the session is kept. Default: localStorage, falling back to memory. */
    storage?: SessionStorageAdapter;
    /** Change these if your backend uses other paths. */
    endpoints?: Partial<Record<'login' | 'refresh' | 'logout' | 'me', string>>;
    /** Turn your backend's login/refresh response into a Session. */
    parseSession?: (raw: unknown, previous: Session | null) => Session;
    /** Inject a fetch (tests, mocks, native HTTP). Default: global fetch. */
    fetchImpl?: typeof fetch;
}

/* ---------- Errors ---------- */

export class DataEngineError extends Error {
    readonly status: number; // HTTP status, or 0 for network / timeout / client errors
    readonly code?: string;
    readonly details?: unknown;

    constructor(message: string, status: number, code?: string, details?: unknown) {
        super(message);
        this.name = 'DataEngineError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export const isDataEngineError = (e: unknown): e is DataEngineError => e instanceof DataEngineError;

/* ---------- Defaults ---------- */

const SESSION_KEY = 'assets-mis-session';
const REFRESH_SKEW_MS = 30_000;

const DEFAULT_ENDPOINTS = {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
};

function createDefaultStorage(): SessionStorageAdapter {
    let memory: Session | null = null;
    const ls = (): Storage | null => {
        try {
            return typeof localStorage === 'undefined' ? null : localStorage;
        } catch {
            return null;
        }
    };
    return {
        load() {
            const store = ls();
            if (!store) return memory;
            try {
                const raw = store.getItem(SESSION_KEY);
                return raw ? (JSON.parse(raw) as Session) : null;
            } catch {
                return null;
            }
        },
        save(session) {
            memory = session;
            const store = ls();
            if (!store) return;
            try {
                if (session) store.setItem(SESSION_KEY, JSON.stringify(session));
                else store.removeItem(SESSION_KEY);
            } catch {
                /* storage full or blocked: memory copy still works for this run */
            }
        },
    };
}

/** Accepts { accessToken | access_token | token, refreshToken?, expiresIn?, user? }. */
function defaultParseSession(raw: unknown, previous: Session | null): Session {
    const r = (raw ?? {}) as Record<string, unknown>;
    const accessToken = r.accessToken ?? r.access_token ?? r.token;
    if (typeof accessToken !== 'string' || !accessToken) {
        throw new DataEngineError('The server response did not include an access token.', 0, 'BAD_AUTH_RESPONSE');
    }
    const refreshToken = r.refreshToken ?? r.refresh_token ?? previous?.refreshToken;
    const expiresIn = r.expiresIn ?? r.expires_in;
    return {
        accessToken,
        refreshToken: typeof refreshToken === 'string' ? refreshToken : undefined,
        expiresAt: typeof expiresIn === 'number' ? Date.now() + expiresIn * 1000 : undefined,
        user: (r.user as AuthUser | undefined) ?? previous?.user ?? null,
    };
}

function toQueryString(params?: QueryParams): string {
    if (!params) return '';
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        const list = Array.isArray(value) ? value : [value];
        for (const v of list) {
            if (v === undefined || v === null) continue;
            qs.append(key, v instanceof Date ? v.toISOString() : String(v));
        }
    }
    return qs.toString();
}

/* ---------- Engine ---------- */

export class DataEngine {
    private readonly baseUrl: string;
    private readonly timeoutMs: number;
    private readonly storage: SessionStorageAdapter;
    private readonly endpoints: typeof DEFAULT_ENDPOINTS;
    private readonly parseSession: (raw: unknown, previous: Session | null) => Session;
    private readonly fetchImpl: typeof fetch;

    private session: Session | null;
    private listeners = new Set<(s: Session | null) => void>();
    private refreshing: Promise<Session> | null = null;
    private inFlight = new Map<string, Promise<unknown>>();

    constructor(config: DataEngineConfig) {
        this.baseUrl = config.baseUrl.replace(/\/+$/, '');
        this.timeoutMs = config.timeoutMs ?? 15_000;
        this.storage = config.storage ?? createDefaultStorage();
        this.endpoints = { ...DEFAULT_ENDPOINTS, ...config.endpoints };
        this.parseSession = config.parseSession ?? defaultParseSession;
        this.fetchImpl = config.fetchImpl ?? ((...args) => fetch(...args));
        this.session = this.storage.load();
    }

    /* ----- query: reads ----- */

    /** GET a resource. Identical calls made at the same time share one request. */
    query<T = unknown>(resource: string, params?: QueryParams, options: RequestOptions = {}): Promise<T> {
        const url = this.buildUrl(resource, params);
        // Calls with their own signal are never shared, so cancelling one can't cancel another.
        if (options.signal) return this.request<T>('GET', url, undefined, options);

        const key = `${options.auth === false ? 'public' : 'auth'}:${url}`;
        const existing = this.inFlight.get(key);
        if (existing) return existing as Promise<T>;

        const promise = this.request<T>('GET', url, undefined, options).finally(() => this.inFlight.delete(key));
        this.inFlight.set(key, promise);
        return promise;
    }

    /* ----- mutate: writes ----- */

    /** POST / PUT / PATCH / DELETE a resource. Objects are sent as JSON; FormData is passed through. */
    mutate<T = unknown>(
        method: MutateMethod,
        resource: string,
        body?: unknown,
        options: RequestOptions = {},
    ): Promise<T> {
        return this.request<T>(method, this.buildUrl(resource), body, options);
    }

    /* ----- auth ----- */

    readonly auth = {
        /** Sign in and keep the session. */
        login: async (credentials: Credentials): Promise<Session> => {
            const raw = await this.request<unknown>('POST', this.buildUrl(this.endpoints.login), credentials, { auth: false });
            let session = this.parseSession(raw, null);
            this.setSession(session);
            if (!session.user) {
                // The login response had tokens only; ask the server who this is.
                try {
                    const user = await this.query<AuthUser>(this.endpoints.me);
                    session = { ...session, user };
                    this.setSession(session);
                } catch (e) {
                    this.setSession(null);
                    throw e;
                }
            }
            return session;
        },

        /** Tell the server (best effort), then forget the session. */
        logout: async (): Promise<void> => {
            if (this.session) {
                try {
                    await this.request<unknown>('POST', this.buildUrl(this.endpoints.logout), undefined, { timeoutMs: 5_000 });
                } catch {
                    /* signing out locally matters more than the server call */
                }
            }
            this.setSession(null);
        },

        /** Swap the refresh token for a new access token. Concurrent calls share one request. */
        refresh: (): Promise<Session> => {
            if (this.refreshing) return this.refreshing;
            const current = this.session;
            if (!current?.refreshToken) {
                return Promise.reject(new DataEngineError('Your session has expired. Sign in again.', 401, 'NO_REFRESH_TOKEN'));
            }
            this.refreshing = (async () => {
                try {
                    const raw = await this.request<unknown>(
                        'POST',
                        this.buildUrl(this.endpoints.refresh),
                        { refreshToken: current.refreshToken },
                        { auth: false },
                    );
                    const next = this.parseSession(raw, current);
                    this.setSession(next);
                    return next;
                } catch (e) {
                    this.setSession(null);
                    throw e;
                } finally {
                    this.refreshing = null;
                }
            })();
            return this.refreshing;
        },

        getSession: (): Session | null => this.session,
        getUser: (): AuthUser | null => this.session?.user ?? null,
        isAuthenticated: (): boolean => this.session !== null,

        /** Called whenever the session changes (login, refresh, logout, expiry). Returns an unsubscribe function. */
        subscribe: (listener: (s: Session | null) => void): (() => void) => {
            this.listeners.add(listener);
            return () => this.listeners.delete(listener);
        },
    };

    /* ----- internals ----- */

    private setSession(session: Session | null) {
        this.session = session;
        this.storage.save(session);
        this.listeners.forEach((l) => l(session));
    }

    private buildUrl(resource: string, params?: QueryParams): string {
        const isAbsolute = /^https?:\/\//i.test(resource);
        const path = isAbsolute ? resource : `${this.baseUrl}${resource.startsWith('/') ? '' : '/'}${resource}`;
        const qs = toQueryString(params);
        return qs ? `${path}${path.includes('?') ? '&' : '?'}${qs}` : path;
    }

    private async request<T>(
        method: HttpMethod,
        url: string,
        body: unknown,
        options: RequestOptions,
        retried = false,
    ): Promise<T> {
        const useAuth = options.auth !== false;

        if (useAuth) await this.refreshIfExpiring();

        const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
        let payload: BodyInit | undefined;
        if (body !== undefined && body !== null) {
            if (typeof FormData !== 'undefined' && body instanceof FormData) {
                payload = body; // the browser sets the multipart boundary
            } else if (typeof Blob !== 'undefined' && body instanceof Blob) {
                payload = body;
            } else {
                headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
                payload = JSON.stringify(body);
            }
        }
        if (useAuth && this.session) headers.Authorization = `Bearer ${this.session.accessToken}`;

        const res = await this.send(method, url, headers, payload, options);

        if (res.status === 401 && useAuth && !retried && this.session?.refreshToken) {
            await this.auth.refresh(); // throws and clears the session if the refresh token is no good
            return this.request<T>(method, url, body, options, true);
        }

        if (res.status === 401 && useAuth && this.session) {
            this.setSession(null); // token rejected and cannot be refreshed
        }

        const data = await this.readBody(res);
        if (!res.ok) throw this.toError(res, data);
        return data as T;
    }

    private async refreshIfExpiring() {
        const s = this.session;
        if (!s?.refreshToken || !s.expiresAt) return;
        if (Date.now() < s.expiresAt - REFRESH_SKEW_MS) return;
        try {
            await this.auth.refresh();
        } catch {
            /* the request will go out and fail with a clear 401 */
        }
    }

    private async send(
        method: HttpMethod,
        url: string,
        headers: Record<string, string>,
        body: BodyInit | undefined,
        options: RequestOptions,
    ): Promise<Response> {
        const controller = new AbortController();
        const timeoutMs = options.timeoutMs ?? this.timeoutMs;
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeoutMs);

        const onOuterAbort = () => controller.abort();
        if (options.signal) {
            if (options.signal.aborted) controller.abort();
            else options.signal.addEventListener('abort', onOuterAbort, { once: true });
        }

        try {
            return await this.fetchImpl(url, { method, headers, body, signal: controller.signal });
        } catch (e) {
            if (timedOut) throw new DataEngineError(`The request timed out after ${timeoutMs / 1000}s.`, 0, 'TIMEOUT');
            if (controller.signal.aborted) throw new DataEngineError('The request was cancelled.', 0, 'ABORTED');
            throw new DataEngineError('Could not reach the server. Check your connection.', 0, 'NETWORK', e);
        } finally {
            clearTimeout(timer);
            options.signal?.removeEventListener('abort', onOuterAbort);
        }
    }

    private async readBody(res: Response): Promise<unknown> {
        if (res.status === 204) return undefined;
        const type = res.headers.get('content-type') ?? '';
        try {
            return type.includes('json') ? await res.json() : await res.text();
        } catch {
            return undefined;
        }
    }

    private toError(res: Response, data: unknown): DataEngineError {
        const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
        const message =
            (typeof d.message === 'string' && d.message) ||
            (typeof d.error === 'string' && d.error) ||
            (typeof data === 'string' && data.trim().slice(0, 200)) ||
            `Request failed (${res.status}).`;
        return new DataEngineError(message, res.status, typeof d.code === 'string' ? d.code : undefined, data);
    }
}