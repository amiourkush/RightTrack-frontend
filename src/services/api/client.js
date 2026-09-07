import axios from 'axios';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://railai-yqqj.onrender.com';
const api = axios.create({baseURL:API_BASE_URL,headers:{'Content-Type':'application/json'},timeout:10000});
const ACCESS_KEY='railai.accessToken', REFRESH_KEY='railai.refreshToken';
export const getAccessToken=()=>localStorage.getItem(ACCESS_KEY); export const getRefreshToken=()=>localStorage.getItem(REFRESH_KEY);
export function setTokens({accessToken,refreshToken}){if(accessToken)localStorage.setItem(ACCESS_KEY,accessToken);if(refreshToken)localStorage.setItem(REFRESH_KEY,refreshToken)}
export function clearTokens(){localStorage.removeItem(ACCESS_KEY);localStorage.removeItem(REFRESH_KEY)}
api.interceptors.request.use(config=>{const token=getAccessToken();if(token)config.headers.Authorization=`Bearer ${token}`;return config});
let refreshPromise=null;
api.interceptors.response.use(r=>r,async error=>{const original=error.config, refreshToken=getRefreshToken(), isRefresh=original?.url?.includes('/api/v1/auth/refresh');
 if(error.response?.status!==401||!refreshToken||isRefresh||original?._retry)return Promise.reject(error);
 original._retry=true;
 if(!refreshPromise){refreshPromise=axios.post(`${API_BASE_URL}/api/v1/auth/refresh`,{refreshToken},{timeout:15000}).then(r=>{setTokens(r.data);return r.data.accessToken}).catch(e=>{clearTokens();throw e}).finally(()=>{refreshPromise=null})}
 const token=await refreshPromise; original.headers=original.headers||{}; original.headers.Authorization=`Bearer ${token}`; return api(original);
});
export default api;
