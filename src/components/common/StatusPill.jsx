export default function StatusPill({ tone = 'on-time', children }) { return <span className={`status-pill status-${tone}`}><span className="status-dot" />{children}</span>; }
