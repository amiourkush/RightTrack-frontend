import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  changePassword, getAccountOverview, getProfile, getSettings, replaceSettings,
  updateAvatar, updateDisplaySettings, updateNotifications, updateProfile,
} from '../../services/api/userApi';

const initialState = { overview: null, profile: null, settings: null, loading: false, error: null };

export const loadAccount = createAsyncThunk('user/loadAccount', async (_, { rejectWithValue }) => {
  try {
    const [overview, profile, settings] = await Promise.all([getAccountOverview(), getProfile(), getSettings()]);
    return { overview: overview.data, profile: profile.data, settings: settings.data };
  } catch (error) { return rejectWithValue(error?.response?.data?.message || error?.message); }
});

export const saveProfile = createAsyncThunk('user/saveProfile', async (payload, { rejectWithValue }) => {
  try { return (await updateProfile(payload)).data; } catch (error) { return rejectWithValue(error?.response?.data?.message || error?.message); }
});
export const saveAvatar = createAsyncThunk('user/saveAvatar', async (url, { rejectWithValue }) => {
  try { return (await updateAvatar(url)).data; } catch (error) { return rejectWithValue(error?.response?.data?.message || error?.message); }
});
export const savePassword = createAsyncThunk('user/savePassword', async (payload, { rejectWithValue }) => {
  try { return (await changePassword(payload)).data; } catch (error) { return rejectWithValue(error?.response?.data?.message || error?.message); }
});
export const saveSettings = createAsyncThunk('user/saveSettings', async (payload, { rejectWithValue }) => {
  try { return (await replaceSettings(payload)).data; } catch (error) { return rejectWithValue(error?.response?.data?.message || error?.message); }
});
export const saveNotificationSettings = createAsyncThunk('user/saveNotificationSettings', async (payload, { rejectWithValue }) => {
  try { return (await updateNotifications(payload)).data; } catch (error) { return rejectWithValue(error?.response?.data?.message || error?.message); }
});
export const saveDisplaySettings = createAsyncThunk('user/saveDisplaySettings', async (payload, { rejectWithValue }) => {
  try { return (await updateDisplaySettings(payload)).data; } catch (error) { return rejectWithValue(error?.response?.data?.message || error?.message); }
});

const slice = createSlice({
  name: 'user', initialState,
  reducers: { clearUser(state) { state.overview = null; state.profile = null; state.settings = null; } },
  extraReducers: (builder) => builder
    .addCase(loadAccount.pending, (state) => { state.loading = true; state.error = null; })
    .addCase(loadAccount.fulfilled, (state, action) => { state.loading = false; Object.assign(state, action.payload); })
    .addCase(loadAccount.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
    .addCase(saveProfile.fulfilled, (state, action) => { state.profile = action.payload; })
    .addCase(saveAvatar.fulfilled, (state, action) => { state.profile = action.payload; })
    .addCase(saveSettings.fulfilled, (state, action) => { state.settings = action.payload; })
    .addCase(saveNotificationSettings.fulfilled, (state, action) => { state.settings = action.payload; })
    .addCase(saveDisplaySettings.fulfilled, (state, action) => { state.settings = action.payload; }),
});

export const { clearUser } = slice.actions;
export default slice.reducer;
