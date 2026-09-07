import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getCurrentUser, loginUser, loginWithGoogle, logoutUser } from '../../services/api/authApi';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../../services/api/client';

const readUser = () => {
  try { return JSON.parse(localStorage.getItem('railai.user') || 'null'); } catch { return null; }
};
const saveUser = (user) => user ? localStorage.setItem('railai.user', JSON.stringify(user)) : localStorage.removeItem('railai.user');

const initialState = { user: readUser(), accessToken: getAccessToken(), refreshToken: getRefreshToken(), loading: false, initialized: false, error: null };

export const restoreSession = createAsyncThunk('auth/restoreSession', async (_, { rejectWithValue }) => {
  if (!getAccessToken()) return null;
  try { return (await getCurrentUser()).data; }
  catch (error) { return rejectWithValue(error); }
});

export const signIn = createAsyncThunk('auth/signIn', async (payload, { rejectWithValue }) => {
  try { const { data } = await loginUser(payload); setTokens(data); saveUser(data.user); return data; }
  catch (error) { return rejectWithValue({ message: error?.response?.data?.message || error?.response?.data?.error || error?.message, status: error?.response?.status }); }
});

export const signInWithGoogle = createAsyncThunk('auth/signInWithGoogle', async (idToken, { rejectWithValue }) => {
  try { const { data } = await loginWithGoogle(idToken); setTokens(data); saveUser(data.user); return data; }
  catch (error) { return rejectWithValue({ message: error?.response?.data?.message || error?.response?.data?.error || error?.message, status: error?.response?.status }); }
});

export const signOut = createAsyncThunk('auth/signOut', async (_, { dispatch }) => {
  const refreshToken = getRefreshToken();
  try { if (refreshToken) await logoutUser(refreshToken); }
  finally { clearTokens(); saveUser(null); dispatch(clearAuth()); }
});

const slice = createSlice({
  name: 'auth', initialState,
  reducers: {
    clearAuth(state) { state.user = null; state.accessToken = null; state.refreshToken = null; state.loading = false; state.error = null; },
    clearAuthError(state) { state.error = null; },
    setAuthUser(state, action) { state.user = action.payload; saveUser(action.payload); },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => { state.loading = true; })
      .addCase(restoreSession.fulfilled, (state, action) => { state.loading = false; state.initialized = true; if (action.payload) { state.user = action.payload; saveUser(action.payload); } })
      .addCase(restoreSession.rejected, (state) => { state.loading = false; state.initialized = true; state.user = null; clearTokens(); saveUser(null); })
      .addCase(signIn.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(signIn.fulfilled, (state, action) => { state.loading = false; state.user = action.payload.user; state.accessToken = action.payload.accessToken; state.refreshToken = action.payload.refreshToken; })
      .addCase(signIn.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(signInWithGoogle.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(signInWithGoogle.fulfilled, (state, action) => { state.loading = false; state.user = action.payload.user; state.accessToken = action.payload.accessToken; state.refreshToken = action.payload.refreshToken; })
      .addCase(signInWithGoogle.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});

export const { clearAuth, clearAuthError, setAuthUser } = slice.actions;
export default slice.reducer;
