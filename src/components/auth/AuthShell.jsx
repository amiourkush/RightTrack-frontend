import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../common/Logo';

export default function AuthShell({ children, title, subtitle }) {
  const navigate = useNavigate();
  return (
    <div className="auth-page">
      <div className="auth-card">
        <section className="auth-visual">
          <div className="auth-brand-row"><Logo /></div>
          <div className="auth-hero-copy"><p className="eyebrow">Live train tracking across India.</p><h1>Every journey,<br />right on track.</h1><p>Simple. Reliable. For everyone.</p><div className="auth-visual-tags"><span>◉ Live train status</span><span>◷ Accurate ETAs</span><span>✓ Trusted & secure</span></div></div>
          <div className="auth-scenery" aria-hidden="true"><div className="hill hill-one" /><div className="hill hill-two" /><div className="bridge"><div className="bridge-rail" /><div className="bridge-pillars" /></div><div className="scene-train"><span /><span /><span /><span /><span /></div></div>
          <p className="auth-signoff">India moves.<br />You move with confidence.</p>
        </section>
        <section className="auth-content">
          <button className="round-back" type="button" aria-label="Back" onClick={() => navigate(-1)}><ArrowLeft size={17} /></button>
          <div className="auth-content-inner"><div className="auth-content-brand"><Logo /></div><h2>{title}</h2><p className="auth-subtitle">{subtitle}</p>{children}</div>
          <div className="auth-footer"><ShieldCheck size={14} /> Safe. Secure. Always with you.</div>
        </section>
      </div>
    </div>
  );
}
