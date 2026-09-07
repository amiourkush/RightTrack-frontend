import { useEffect, useRef, useState } from 'react';
const SCRIPT_ID = 'google-identity-services';
function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google);
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) { existing.addEventListener('load', () => resolve(window.google), { once: true }); existing.addEventListener('error', reject, { once: true }); return; }
    const script = document.createElement('script'); script.id = SCRIPT_ID; script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; script.onload = () => resolve(window.google); script.onerror = reject; document.head.appendChild(script);
  });
}
export function useGoogleAuth({ onCredential }) {
  const containerRef = useRef(null);
  const [available, setAvailable] = useState(true);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!clientId) { setAvailable(false); return; }
    let cancelled = false;
    loadScript().then((google) => {
      if (cancelled || !containerRef.current) return;
      google.accounts.id.initialize({ client_id: clientId, callback: (response) => onCredential(response.credential), ux_mode: 'popup', auto_select: false });
      containerRef.current.innerHTML = '';
      google.accounts.id.renderButton(containerRef.current, { theme: 'outline', size: 'large', width: 360, text: 'continue_with', shape: 'rectangular' });
      setAvailable(true);
    }).catch(() => setAvailable(false));
    return () => { cancelled = true; };
  }, [clientId, onCredential]);
  return { containerRef, configured: Boolean(clientId), available };
}
