import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
export default function ProtectedRoute() { const { initialized, isAuthenticated } = useAuth(); const location = useLocation(); if (!initialized) return <div className="loading-page">Loading session…</div>; return isAuthenticated ? <Outlet /> : <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />; }
