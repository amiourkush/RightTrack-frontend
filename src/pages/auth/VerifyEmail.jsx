import { CheckCircle2, Mail, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../../components/auth/AuthShell';
import Spinner from '../../components/common/Spinner';
import { resendOtp, verifyEmailOtp } from '../../services/api/authApi';
import { getApiErrorMessage } from '../../utils/errors';

export default function VerifyEmail() {
  const [params] = useSearchParams(); const navigate = useNavigate();
  const initialEmail = params.get('email') || '';
  const [email, setEmail] = useState(initialEmail); const [editingEmail, setEditingEmail] = useState(!initialEmail);
  const [otp, setOtp] = useState(''); const [loading, setLoading] = useState(false); const [resending, setResending] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [seconds, setSeconds] = useState(45);
  const inputRefs = useRef([]);
  useEffect(() => { if (seconds <= 0) return undefined; const id = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => clearInterval(id); }, [seconds]);
  useEffect(() => { setEditingEmail(!initialEmail); }, [initialEmail]);
  const masked = useMemo(() => { const [name, domain] = email.split('@'); if (!name || !domain) return email; return `${name.slice(0,2)}${'*'.repeat(Math.max(2,name.length-2))}@${domain}`; }, [email]);
  const verify = async (event) => { event.preventDefault(); if (!email.trim()) { setError('Enter the email address used to register.'); return; } setLoading(true); setError(''); try { await verifyEmailOtp({ email: email.trim(), otp }); setNotice('Email verified successfully.'); setTimeout(() => navigate(`/login?email=${encodeURIComponent(email.trim())}`, { replace: true }), 650); } catch (err) { setError(getApiErrorMessage(err, 'Invalid or expired OTP.')); } finally { setLoading(false); } };
  const resend = async () => { if (!email.trim() || seconds > 0) return; setResending(true); setError(''); try { await resendOtp(email.trim()); setSeconds(45); setNotice('A new OTP has been sent to your email.'); } catch (err) { setError(getApiErrorMessage(err, 'Unable to resend OTP.')); } finally { setResending(false); } };
  const handleOtp = (index, value) => { const clean = value.replace(/\D/g, '').slice(-1); const chars = otp.padEnd(6, ' ').split(''); chars[index] = clean || ' '; const next = chars.join('').replace(/ /g, '').slice(0,6); setOtp(next); if (clean) inputRefs.current[index + 1]?.focus(); };
  return <AuthShell title="Verify your email" subtitle={editingEmail ? 'Enter the email you used to create your account' : 'We’ve sent a 6-digit code to'}>
    <div className="verify-summary"><div className="verify-icon"><Mail size={26}/></div>{editingEmail ? <div className="field"><Mail size={16}/><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" autoFocus/></div> : <><strong>{masked}</strong><button type="button" className="text-button" onClick={()=>setEditingEmail(true)}>Change email</button></>}</div>
    <form className="auth-form" onSubmit={verify}><div className="otp-grid">{Array.from({length:6}).map((_,index)=><input key={index} ref={(node)=>{inputRefs.current[index]=node}} inputMode="numeric" autoComplete={index===0?'one-time-code':'off'} value={otp[index]||''} maxLength={1} onChange={(e)=>handleOtp(index,e.target.value)} onKeyDown={(e)=>{if(e.key==='Backspace'&&!otp[index])inputRefs.current[index-1]?.focus();}} aria-label={`OTP digit ${index+1}`}/>)}</div><div className="resend-row"><span>Didn’t receive the code?</span><button type="button" className="text-button" onClick={resend} disabled={seconds>0||resending||!email.trim()}>{resending?'Sending…':seconds>0?`Resend in 00:${String(seconds).padStart(2,'0')}`:<><RotateCcw size={13}/> Resend OTP</>}</button></div>{error&&<div className="form-alert error">{error}</div>}{notice&&<div className="form-alert success"><CheckCircle2 size={15}/>{notice}</div>}<button className="primary-button" disabled={loading||otp.length!==6||!email.trim()}>{loading?<><Spinner small/>Verifying…</>:'Verify and continue'}</button><div className="verify-footer-note">Your data is secure with us.</div></form><p className="auth-switch"><Link to="/login">Back to sign in</Link></p></AuthShell>;
}
