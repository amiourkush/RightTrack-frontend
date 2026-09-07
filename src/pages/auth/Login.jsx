import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AuthShell from '../../components/auth/AuthShell';
import AuthDivider from '../../components/auth/AuthDivider';
import GoogleSignIn from '../../components/auth/GoogleSignIn';
import Spinner from '../../components/common/Spinner';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { useAuth } from '../../hooks/useAuth';
import { clearAuthError, signIn, signInWithGoogle } from '../../features/auth/authSlice';
import { looksLikeUnverifiedEmail } from '../../utils/errors';

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading, error } = useAuth(); const next = params.get('next') || '/';
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { email: params.get('email') || '' }, mode: 'onTouched' });
  const email = watch('email');

  useEffect(() => { if (isAuthenticated) navigate('/', { replace: true }); }, [isAuthenticated, navigate]);
  useEffect(() => () => { dispatch(clearAuthError()); }, [dispatch]);

  const submit = async (values) => { const result = await dispatch(signIn({ email: values.email.trim(), password: values.password })); if (signIn.fulfilled.match(result)) navigate(next, { replace: true }); };
  const google = useCallback(async (idToken) => { setGoogleLoading(true); const result = await dispatch(signInWithGoogle(idToken)); setGoogleLoading(false); if (signInWithGoogle.fulfilled.match(result)) navigate(next, { replace: true }); }, [dispatch, navigate]);
  const unverified = looksLikeUnverifiedEmail(error?.message || '');

  return <AuthShell title="Welcome back" subtitle="Sign in to continue your journey"><form className="auth-form" onSubmit={handleSubmit(submit)}>{error?.message && <div className="form-alert error"><span>{error.message}</span>{unverified && <Link to={`/verify-email?email=${encodeURIComponent(email || '')}`}>Verify email</Link>}</div>}<label className="field-label">Email address</label><div className={`field ${errors.email ? 'field-error' : ''}`}><Mail size={16} /><input type="email" placeholder="you@example.com" {...register('email', { required: 'Email is required' })} /></div>{errors.email && <span className="field-message">{errors.email.message}</span>}<label className="field-label">Password</label><div className={`field ${errors.password ? 'field-error' : ''}`}><LockKeyhole size={16} /><input type={showPassword ? 'text' : 'password'} placeholder="Password" {...register('password', { required: 'Password is required' })} /><button type="button" className="field-action" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>{errors.password && <span className="field-message">{errors.password.message}</span>}<div className="form-row-between"><label className="checkbox-label"><input type="checkbox" defaultChecked /> Keep me signed in</label><button type="button" className="text-button" disabled>Forgot password?</button></div><button className="primary-button" disabled={loading}>{loading ? <><Spinner small /> Signing in…</> : 'Sign in'}</button></form><AuthDivider /><GoogleSignIn onCredential={google} loading={googleLoading} /><p className="auth-switch">Don’t have an account? <Link to="/register">Create account</Link></p></AuthShell>;
}
