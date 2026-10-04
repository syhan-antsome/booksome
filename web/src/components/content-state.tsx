import type { ReactNode } from 'react';

export function ContentState({ title, children, action, error = false, heading = 'h2' }: { title: string; children?: ReactNode; action?: ReactNode; error?: boolean; heading?: 'h1' | 'h2' }) {
  const Heading = heading;
  return <div className={`content-state${error ? ' content-state--error' : ''}`} role={error ? 'alert' : undefined}><Heading>{title}</Heading>{children ? <p>{children}</p> : null}{action}</div>;
}

export function ContentLoading({ label = '불러오는 중…' }: { label?: string }) {
  return <div className="content-loading" role="status"><span className="loading-dot" aria-hidden="true" />{label}<div className="skeleton-row" aria-hidden="true" /><div className="skeleton-row" aria-hidden="true" /></div>;
}
