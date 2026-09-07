import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthShell from '../../components/auth/AuthShell';
import AuthDivider from '../../components/auth/AuthDivider';
import GoogleSignIn from '../../components/auth/GoogleSignIn';
import Spinner from '../../components/common/Spinner';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { signInWithGoogle } from '../../features/auth/authSlice';
import { registerUser } from '../../services/api/authApi';
import { getApiErrorMessage, looksLikeExistingEmail } from '../../utils/errors';

export default function Register() {
  const navigate = useNavigate(); const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false); const [googleLoading, setGoogleLoading] = useState(false); const [serverError, setServerError] = useState(''); const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ mode: 'onTouched' });
  const email = watch('email');
  const submit = async (values) => { setLoading(true); setServerError(''); try { await registerUser({ email: values.email.trim(), password: values.password, fullName: values.fullName.trim() }); navigate(`/verify-email?email=${encodeURIComponent(values.email.trim())}`, { replace: true }); } catch (error) { setServerError(getApiErrorMessage(error)); } finally { setLoading(false); } };
  const google = useCallback(async (idToken) => { setGoogleLoading(true); setServerError(''); const result = await dispatch(signInWithGoogle(idToken)); setGoogleLoading(false); if (signInWithGoogle.fulfilled.match(result)) navigate('/', { replace: true }); else setServerError(result.payload?.message || 'Google sign-in failed.'); }, [dispatch, navigate]);
  const existing = looksLikeExistingEmail(serverError);
  return <AuthShell title="Create your account" subtitle="Join thousands tracking smarter journeys"><form className="auth-form" onSubmit={handleSubmit(submit)}>{serverError && <div className="form-alert error"><span>{serverError}</span>{existing && <Link to={`/verify-email?email=${encodeURIComponent(email || '')}`}>Verify this email</Link>}</div>}<label className="field-label">Full name</label><div className="field"><UserRound size={16} /><input placeholder="Kush Singh" {...register('fullName', { required: 'Full name is required', minLength: { value: 2, message: 'Enter your full name' } })} /></div>{errors.fullName && <span className="field-message">{errors.fullName.message}</span>}<label className="field-label">Email address</label><div className="field"><Mail size={16} /><input type="email" placeholder="you@example.com" {...register('email', { required: 'Email is required' })} /></div>{errors.email && <span className="field-message">{errors.email.message}</span>}<label className="field-label">Password</label><div className="field"><LockKeyhole size={16} /><input type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Use at least 8 characters' } })} /><button type="button" className="field-action" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>{errors.password && <span className="field-message">{errors.password.message}</span>}<button className="primary-button" disabled={loading}>{loading ? <><Spinner small /> Creating account…</> : 'Create account'}</button></form><AuthDivider /><GoogleSignIn onCredential={google} loading={googleLoading} /><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p></AuthShell>;
}
