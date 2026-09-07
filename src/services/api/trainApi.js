import api from './client';
export const searchTrainsPost = (query) => api.post('/api/v1/trains/search', { query }, { timeout: 45000 });
export const searchTrainsGet = (query) => api.get('/api/v1/trains/search', { params:{q:query}, timeout:45000 });
export const getTrainDetails = (trainNumber) => api.get(`/api/v1/trains/${encodeURIComponent(trainNumber)}`, { timeout:20000 });
export const getTrainRoute = (trainNumber, params={}) => api.get(`/api/v1/trains/${encodeURIComponent(trainNumber)}/route`, { params, timeout:30000 });
export const getLiveStatus = (trainNumber, journeyDate) => api.get(`/api/v1/trains/${encodeURIComponent(trainNumber)}/live-status`, { params: journeyDate ? {journeyDate} : undefined, timeout:12000 });
export const getLiveStatusShort = (trainNumber, journeyDate) => api.get(`/api/v1/trains/${encodeURIComponent(trainNumber)}/live`, { params: journeyDate ? {journeyDate} : undefined, timeout:12000 });
export const getLocation = (trainNumber, journeyDate) => api.get(`/api/v1/trains/${encodeURIComponent(trainNumber)}/location`, { params: journeyDate ? {journeyDate} : undefined, timeout:12000 });
export const getTrainRun = (trainNumber, journeyDate) => api.get(`/api/v1/trains/${encodeURIComponent(trainNumber)}/runs/${encodeURIComponent(journeyDate)}`, { timeout:20000 });
export const getTrainEta = (trainNumber, journeyDate) => api.get(`/api/v1/trains/${encodeURIComponent(trainNumber)}/eta`, { params: journeyDate ? {journeyDate} : undefined, timeout:15000 });
export const getStationEta = (trainNumber, stationCode, journeyDate) => api.get(`/api/v1/trains/${encodeURIComponent(trainNumber)}/eta/${encodeURIComponent(stationCode)}`, { params: journeyDate ? {journeyDate} : undefined, timeout:15000 });
export const getTrainsBetween = ({from,to,journeyDate}) => api.get('/api/v1/trains/between', { params:{from,to,...(journeyDate?{journeyDate}:{})}, timeout:20000 });
export const refreshTrain = (trainNumber, journeyDate) => api.post(`/api/v1/trains/${encodeURIComponent(trainNumber)}/refresh`, null, { params: journeyDate ? {journeyDate} : undefined, timeout:10000 });
export const getLiveEtaML = (trainNumber) => api.get(`/api/v1/trains/live-eta/${encodeURIComponent(trainNumber)}`, { timeout:15000 });
export const predictEta = (payload) => api.post('/api/v1/trains/eta/predict', payload, { timeout:15000 });

