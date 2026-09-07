import api from './client';

export const getStation = (stationCode) => api.get(`/api/v1/stations/${encodeURIComponent(stationCode)}`);
export const getStationWeather = (stationCode) => api.get(`/api/v1/stations/${encodeURIComponent(stationCode)}/weather`);
