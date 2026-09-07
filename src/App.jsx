import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAppDispatch } from './hooks/reduxHooks';
import { restoreSession } from './features/auth/authSlice';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
const Landing = lazy(() => import('./pages/auth/Landing'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const FindTrain = lazy(() => import('./pages/FindTrain'));
const TrainDetails = lazy(() => import('./pages/TrainDetails'));
const Saved = lazy(() => import('./pages/Saved'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Station = lazy(() => import('./pages/Station'));
const AccessCenter = lazy(() => import('./pages/AccessCenter'));
const NotFound = lazy(() => import('./pages/NotFound'));

function SessionBootstrap() {
  const dispatch = useAppDispatch();
  useEffect(() => { dispatch(restoreSession()); }, [dispatch]);
  return null;
}

export default function App() {
  return <Suspense fallback={<div className="loading-page">Loading RightTrack…</div>}>
    <SessionBootstrap />
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/find-train" element={<FindTrain />} />
          <Route path="/train/:trainNumber" element={<TrainDetails />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/station/:stationCode" element={<Station />} />
          <Route path="/access" element={<AccessCenter />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>;
}
