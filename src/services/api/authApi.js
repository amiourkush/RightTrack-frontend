import api from './client';

export const registerUser = (payload) => api.post('/api/v1/auth/register', payload);
export const verifyEmailOtp = (payload) => api.post('/api/v1/auth/verify-email-otp', payload);
export const resendOtp = (email) => api.post('/api/v1/auth/resend-otp', { email });
export const loginUser = (payload) => api.post('/api/v1/auth/login', payload);
export const loginWithGoogle = (idToken) => api.post('/api/v1/auth/google', { idToken });
export const refreshAccessToken = (refreshToken) => api.post('/api/v1/auth/refresh', { refreshToken });
export const logoutUser = (refreshToken) => api.post('/api/v1/auth/logout', { refreshToken });
export const getCurrentUser = () => api.get('/api/v1/auth/me');
export const checkAdmin = () => api.get('/api/v1/auth/admin', { responseType: 'text' });
export const checkControlRoom = () => api.get('/api/v1/auth/control-room', { responseType: 'text' });
