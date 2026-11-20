import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { addOutline, downloadOutline } from 'ionicons/icons';
import '../styles/DashboardContainer.css';

/* ---------- Dummy data (swap for API calls later) ---------- */

const kpis = [
  { label: 'Total assets', value: '1,248', note: '+32 this month', tone: 'neutral' },
  { label: 'Assigned', value: '842', note: '67% of fleet', tone: 'neutral' },
  { label: 'In store', value: '214', note: 'Ready to issue', tone: 'good' },
  { label: 'Under repair', value: '37', note: '9 over 14 days', tone: 'warn' },
  { label: 'Warranty expiring', value: '58', note: 'Next 60 days', tone: 'bad' },
];

const statusBreakdown = [
  { label: 'Assigned', value: 842, color: '#0F6B73' },
  { label: 'In store', value: 214, color: '#7FB7BE' },
  { label: 'Under repair', value: 37, color: '#D39A1E' },
  { label: 'Lost / stolen', value: 9, color: '#B5452F' },
  { label: 'Retired', value: 146, color: '#A7B0B8' },
];

const categories = [
  { label: 'Laptops', value: 380 },
  { label: 'Desktops', value: 250 },
  { label: 'POS terminals', value: 210 },
  { label: 'Network gear', value: 118 },
  { label: 'ATMs', value: 96 },
  { label: 'Servers', value: 64 },
  { label: 'Printers & scanners', value: 130 },
];

const acquisitions = [
  { m: 'Dec', v: 22 }, { m: 'Jan', v: 41 }, { m: 'Feb', v: 18 }, { m: 'Mar', v: 55 },
  { m: 'Apr', v: 30 }, { m: 'May', v: 27 }, { m: 'Jun', v: 64 }, { m: 'Jul', v: 35 },
  { m: 'Aug', v: 24 }, { m: 'Sep', v: 48 }, { m: 'Oct', v: 29 }, { m: 'Nov', v: 32 },
];

const sites = [
  { site: 'Head Office, Lilongwe', total: 318, assigned: 276, repair: 11 },
  { site: 'Blantyre Main Branch', total: 287, assigned: 241, repair: 9 },
  { site: 'Mzuzu Branch', total: 204, assigned: 158, repair: 6 },
  { site: 'Zomba Branch', total: 196, assigned: 149, repair: 8 },
  { site: 'Operations Centre', total: 243, assigned: 218, repair: 3 },
];

const expiring = [
  { tag: 'AST-001482', name: 'Dell Latitude 5440', site: 'Zomba Branch', days: 6 },
  { tag: 'AST-000917', name: 'NCR cash dispenser ATM', site: 'Blantyre Main', days: 12 },
  { tag: 'AST-002210', name: 'Cisco Catalyst 2960', site: 'Operations Centre', days: 19 },
  { tag: 'AST-000355', name: 'Verifone VX520 POS', site: 'Mzuzu Branch', days: 33 },
  { tag: 'AST-001988', name: 'Dell PowerEdge R450', site: 'Head Office', days: 47 },
];

const activity = [
  { who: 'Chikondi M.', what: 'issued laptop AST-001533 to Treasury', when: '12 min ago' },
  { who: 'Thoko B.', what: 'logged a repair request for ATM AST-000917', when: '1 h ago' },
  { who: 'Yamikani P.', what: 'received 12 desktops into Central Store', when: '3 h ago' },
  { who: 'Chikondi M.', what: 'transferred AST-002051 from Zomba to Mzuzu', when: 'Yesterday' },
  { who: 'Admin', what: 'retired 4 receipt printers after audit', when: 'Yesterday' },
];

/* ---------- Small chart helpers (plain SVG, no extra dependencies) ---------- */

const Donut: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className="amis-donut" role="img" aria-label="Assets by status">
      <g transform="rotate(-90 70 70)">
        {data.map((d) => {
          const len = (d.value / total) * c;
          const el = (
            <circle
              key={d.label}
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth="18"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </g>
      <text x="70" y="68" textAnchor="middle" className="amis-donut-value">
        {total.toLocaleString()}
      </text>
      <text x="70" y="84" textAnchor="middle" className="amis-donut-label">
        assets
      </text>
    </svg>
  );
};

const MonthlyBars: React.FC = () => {
  const max = Math.max(...acquisitions.map((a) => a.v));
  const w = 360;
  const h = 150;
  const bw = 20;
  const gap = (w - bw * acquisitions.length) / (acquisitions.length - 1);
  return (
    <svg viewBox={`0 0 ${w} ${h + 20}`} className="amis-bars" role="img" aria-label="Assets acquired per month">
      {acquisitions.map((a, i) => {
        const bh = (a.v / max) * h;
        const x = i * (bw + gap);
        const peak = a.v === max;
        return (
          <g key={a.m}>
            <rect x={x} y={h - bh} width={bw} height={bh} rx="3" className={peak ? 'amis-bar amis-bar-peak' : 'amis-bar'} />
            {peak && (
              <text x={x + bw / 2} y={h - bh - 6} textAnchor="middle" className="amis-bar-value">
                {a.v}
              </text>
            )}
            <text x={x + bw / 2} y={h + 15} textAnchor="middle" className="amis-axis">
              {a.m}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ---------- Component ---------- */

const DashboardContainer: React.FC = () => {
  const maxCat = Math.max(...categories.map((c) => c.value));

  return (
    <div className="amis">
      <header className="amis-head">
        <div>
          <h1>Asset overview</h1>
          <p>All branches · last updated today, 08:40</p>
        </div>
        <div className="amis-actions">
          <IonButton fill="outline" size="small">
            <IonIcon slot="start" icon={downloadOutline} />
            Export report
          </IonButton>
          <IonButton size="small">
            <IonIcon slot="start" icon={addOutline} />
            Add asset
          </IonButton>
        </div>
      </header>

      <section className="amis-kpis">
        {kpis.map((k) => (
          <div key={k.label} className={`amis-kpi amis-kpi-${k.tone}`}>
            <span className="amis-kpi-label">{k.label}</span>
            <span className="amis-kpi-value">{k.value}</span>
            <span className="amis-kpi-note">{k.note}</span>
          </div>
        ))}
      </section>

      <section className="amis-grid amis-grid-charts">
        <article className="amis-panel">
          <h2>Assets by status</h2>
          <div className="amis-status">
            <Donut data={statusBreakdown} />
            <ul className="amis-legend">
              {statusBreakdown.map((s) => (
                <li key={s.label}>
                  <span className="amis-dot" style={{ background: s.color }} />
                  <span>{s.label}</span>
                  <strong>{s.value}</strong>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="amis-panel">
          <h2>Assets by category</h2>
          <ul className="amis-hbars">
            {categories.map((c) => (
              <li key={c.label}>
                <span className="amis-hbar-label">{c.label}</span>
                <span className="amis-hbar-track">
                  <span className="amis-hbar-fill" style={{ width: `${(c.value / maxCat) * 100}%` }} />
                </span>
                <strong>{c.value}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="amis-panel amis-span-2">
          <h2>Assets acquired per month</h2>
          <MonthlyBars />
        </article>
      </section>

      <section className="amis-grid amis-grid-tables">
        <article className="amis-panel amis-span-2">
          <h2>Assets by branch</h2>
          <div className="amis-scroll">
            <table className="amis-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th className="num">Total</th>
                  <th className="num">Assigned</th>
                  <th className="num">Under repair</th>
                  <th>Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => {
                  const pct = Math.round((s.assigned / s.total) * 100);
                  return (
                    <tr key={s.site}>
                      <td>{s.site}</td>
                      <td className="num">{s.total}</td>
                      <td className="num">{s.assigned}</td>
                      <td className="num">{s.repair}</td>
                      <td>
                        <span className="amis-meter">
                          <span style={{ width: `${pct}%` }} />
                        </span>
                        <span className="amis-pct">{pct}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="amis-panel">
          <h2>Warranties ending soon</h2>
          <ul className="amis-list">
            {expiring.map((e) => (
              <li key={e.tag}>
                <div>
                  <strong>{e.name}</strong>
                  <small>
                    {e.tag} · {e.site}
                  </small>
                </div>
                <span className={e.days <= 14 ? 'amis-chip amis-chip-bad' : 'amis-chip amis-chip-warn'}>{e.days} days</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="amis-panel">
          <h2>Recent activity</h2>
          <ul className="amis-list amis-activity">
            {activity.map((a, i) => (
              <li key={i}>
                <div>
                  <span>
                    <strong>{a.who}</strong> {a.what}
                  </span>
                  <small>{a.when}</small>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
};

export default DashboardContainer;