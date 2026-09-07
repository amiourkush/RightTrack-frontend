import axios from 'axios';
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

/**
 * RailRadar Direct Live Tracking API
 * Request geometry=false&includeCoordinates=false to conserve bandwidth and budget.
 */
export const getRailRadarLive = async (trainNumber) => {
  const url = `https://railradar.in/app/v1/trains/${encodeURIComponent(trainNumber)}/live?geometry=false&includeCoordinates=false`;
  return axios.get(url, { timeout: 10000 });
};

/**
 * RailRadar-first live status resolver with graceful backend fallback.
 * STEP 1: Attempt RailRadar direct request.
 * STEP 2: If 2xx and valid payload returned, use RailRadar without calling backend.
 * STEP 3: If RailRadar fails (CORS, network error, timeout, non-2xx), fallback to backend /live-status.
 */
export const getPreferredLiveStatus = async (trainNumber, journeyDate) => {
  try {
    const res = await getRailRadarLive(trainNumber);
    if (res && res.status >= 200 && res.status < 300 && res.data) {
      const payload = res.data;
      const root = payload?.data || payload;
      if (root && (root.currentLocation || root.status || root.trainNumber || payload.success === true)) {
        return { data: payload, source: 'railradar' };
      }
    }
  } catch {
    // RailRadar request failed or blocked by browser CORS -> proceed to backend fallback
  }

  const backendRes = await getLiveStatus(trainNumber, journeyDate);
  return { data: backendRes.data, source: 'backend' };
};


