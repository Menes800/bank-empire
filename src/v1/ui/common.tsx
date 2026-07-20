import type { PropsWithChildren, ReactNode } from 'react';
import { COUNTRY_LABELS } from '../game/config';
import type { Branch, CountryCode } from '../game/types';

export const money = (value: number) =>
  new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    maximumFractionDigits: 0,
    notation: Math.abs(value) >= 10_000_000 ? 'compact' : 'standard',
  }).format(value);

export const number = (value: number) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(value);
export const decimal = (value: number) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 }).format(value);
export const monthName = (year: number, month: number) =>
  new Intl.DateTimeFormat('nb-NO', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
export const latestReport = (branch: Branch) => branch.reports.at(-1);
export const countryName = (code: CountryCode) => COUNTRY_LABELS[code];

export function Metric({ label, value, tone, hint }: { label: string; value: ReactNode; tone?: 'positive' | 'negative' | 'warning'; hint?: string }) {
  return (
    <article className={`v1-metric ${tone ?? ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

export function Panel({ eyebrow, title, aside, children, className = '' }: PropsWithChildren<{ eyebrow?: string; title: string; aside?: ReactNode; className?: string }>) {
  return (
    <section className={`v1-panel ${className}`}>
      <div className="v1-panel-heading">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h3>{title}</h3>
        </div>
        {aside && <div className="panel-aside">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export function Progress({ value, max, label }: { value: number; max: number; label?: string }) {
  const percent = Math.min(100, Math.max(0, max === 0 ? 0 : (value / max) * 100));
  return (
    <div className="v1-progress-wrap">
      {label && <div className="v1-progress-label"><span>{label}</span><strong>{Math.round(percent)}%</strong></div>}
      <div className="v1-progress"><span style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

export function Empty({ title, children }: PropsWithChildren<{ title: string }>) {
  return <div className="v1-empty"><strong>{title}</strong><p>{children}</p></div>;
}
