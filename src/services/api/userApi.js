import api from './client';

export const getAccountOverview = () => api.get('/api/v1/users/me');
export const getProfile = () => api.get('/api/v1/users/profile');
export const updateProfile = (payload) => api.put('/api/v1/users/profile', payload);
export const updateAvatar = (avatarUrl) => api.post('/api/v1/users/profile/avatar', { avatarUrl });
export const changePassword = (payload) => api.put('/api/v1/users/change-password', payload);
export const getSettings = () => api.get('/api/v1/users/settings');
export const replaceSettings = (payload) => api.put('/api/v1/users/settings', payload);
export const updateNotifications = (payload) => api.patch('/api/v1/users/settings/notifications', payload);
export const updateDisplaySettings = (payload) => api.patch('/api/v1/users/settings/display', payload);
export const deleteAccount = () => api.delete('/api/v1/users/account');
