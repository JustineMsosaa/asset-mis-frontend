import { DataEngine } from './DataEngine';

/**
 * The app-wide instance. Set VITE_API_URL in .env (for example
 * VITE_API_URL=https://api.yourbank.example/v1). Without it, calls go to /api.
 */
export const dataEngine = new DataEngine({
    baseUrl: import.meta.env.VITE_API_URL ?? '/api',
});

export * from './DataEngine';