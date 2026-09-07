import { AlertCircle } from 'lucide-react';
import Spinner from '../common/Spinner';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';

export default function GoogleSignIn({ onCredential, loading }) {
  const { containerRef, configured, available } = useGoogleAuth({ onCredential });
  if (!configured) return <div className="google-config-note"><AlertCircle size={14} /> Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable Google Sign-In.</div>;
  if (!available) return <div className="google-config-note"><AlertCircle size={14} /> Google Sign-In could not load. Check your network or OAuth configuration.</div>;
  return <div className="google-login-wrap"> <div ref={containerRef} className="google-button-container" />{loading && <div className="google-loading-overlay"><Spinner small /></div>}</div>;
}
