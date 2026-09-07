import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from './reduxHooks';
import { signOut, setAuthUser } from '../features/auth/authSlice';

export function useAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  return useMemo(() => ({
    ...auth,
    isAuthenticated: Boolean(auth.accessToken && auth.user),
    logout: () => dispatch(signOut()),
    setUser: (user) => dispatch(setAuthUser(user)),
  }), [auth, dispatch]);
}
