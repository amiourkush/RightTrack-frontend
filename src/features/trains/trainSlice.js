import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getPreferredLiveStatus, getTrainDetails, getTrainEta,
  getTrainRoute, getStationEta, getTrainsBetween, refreshTrain,
  searchTrainsGet, searchTrainsPost,
} from '../../services/api/trainApi';
import { normalizeEta, normalizeLive, normalizeSearchResult } from '../../utils/train';
import {
  bustLiveCache,
  getCachedLive,
  getCachedSearch,
  getCachedStatic,
  isLiveFresh,
  setCachedLive,
  setCachedSearch,
  setCachedStatic,
} from '../../utils/trainCache';

const initialState = {
  search: [], searchQuery: '', searchLoading: false, searchError: null,
  selectedTrainNumber: null, byNumber: {}, between: [], refreshAccepted: null,
};

function rootData(payload) {
  return payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data : payload;
}

function extractSearchItems(payload) {
  const root = rootData(payload);
  const items = Array.isArray(root)
    ? root
    : Array.isArray(root?.trains)
    ? root.trains
    : Array.isArray(root?.results)
    ? root.results
    : [];
  return items.map(normalizeSearchResult);
}

// ─────────────────────────────────────────────────────────
// Search Trains  (Cache: 24h)
// ─────────────────────────────────────────────────────────
export const searchTrains = createAsyncThunk('trains/search', async (query, { rejectWithValue }) => {
  // Return cached results immediately if still valid
  const cached = getCachedSearch(query);
  if (cached) return { query, results: cached, fromCache: true };

  try {
    const { data } = await searchTrainsPost(query);
    const results = extractSearchItems(data);
    setCachedSearch(query, results);
    return { query, results };
  } catch (postError) {
    try {
      const { data } = await searchTrainsGet(query);
      const results = extractSearchItems(data);
      setCachedSearch(query, results);
      return { query, results };
    } catch (getError) {
      return rejectWithValue(getError?.response?.data?.message || postError?.response?.data?.message || getError?.message);
    }
  }
});

// ─────────────────────────────────────────────────────────
// Fetch Train Bundle – static (24h) + live (2min)
// ─────────────────────────────────────────────────────────
export const fetchTrainBundle = createAsyncThunk('trains/fetchBundle', async ({ trainNumber, journeyDate }, { rejectWithValue }) => {
  const key = String(trainNumber);

  // 1. Serve static data (details + route) from cache if available
  const cachedStatic = getCachedStatic(key);
  if (cachedStatic?.details && cachedStatic?.route) {
    // Static data is fresh in cache – only fetch live status & ETA
    const liveFresh = isLiveFresh(key, journeyDate);
    const [liveRes, etaRes] = await Promise.allSettled([
      liveFresh ? Promise.resolve({ data: getCachedLive(key, journeyDate)?.live || getCachedLive(key, journeyDate) }) : getPreferredLiveStatus(trainNumber, journeyDate),
      getTrainEta(trainNumber, journeyDate),
    ]);

    const liveRaw = liveRes.status === 'fulfilled' ? liveRes.value?.data : null;
    const etaRaw  = etaRes.status === 'fulfilled' ? etaRes.value?.data : null;

    const live = liveRaw ? normalizeLive(liveRaw) : null;
    const activeDate = live?.journeyDate || journeyDate;
    const eta  = etaRaw  ? normalizeEta(etaRaw)   : null;

    const stationEtasMap = {};
    if (Array.isArray(eta?.stationEtas)) {
      eta.stationEtas.forEach((s) => {
        const code = String(s?.stationCode || s?.code || '').toUpperCase();
        if (code) stationEtasMap[code] = s;
      });
    }

    // Persist fresh live data to date-scoped live cache
    if (live) {
      setCachedLive(key, activeDate, {
        live,
        ...(eta ? { eta } : {}),
        ...(Object.keys(stationEtasMap).length > 0 ? { stationEtas: stationEtasMap } : {}),
        journeyDate: activeDate,
        liveLastUpdated: Date.now(),
      });
    }

    return {
      trainNumber: key,
      journeyDate: activeDate,
      details: cachedStatic.details,
      route:   cachedStatic.route,
      ...(live ? { live } : {}),
      ...(eta  ? { eta }  : {}),
      ...(Object.keys(stationEtasMap).length > 0 ? { stationEtas: stationEtasMap } : {}),
    };
  }

  // 2. Full network fetch (first ever load for this train when static cache is missing)
  const results = await Promise.allSettled([
    getTrainDetails(trainNumber),
    getTrainRoute(trainNumber),
    getPreferredLiveStatus(trainNumber, journeyDate),
    getTrainEta(trainNumber, journeyDate),
  ]);

  const detailsRaw = results[0].status === 'fulfilled' ? results[0].value.data : null;
  const routeRaw   = results[1].status === 'fulfilled' ? results[1].value.data : null;
  const liveRaw    = results[2].status === 'fulfilled' ? results[2].value.data : null;
  const etaRaw     = results[3].status === 'fulfilled' ? results[3].value.data : null;

  const details = rootData(detailsRaw);
  const route   = rootData(routeRaw);

  if (!details && !route) return rejectWithValue('No train data is available.');

  const live = liveRaw ? normalizeLive(liveRaw) : null;
  const activeDate = live?.journeyDate || journeyDate;
  const eta  = etaRaw  ? normalizeEta(etaRaw)   : null;

  const stationEtasMap = {};
  if (Array.isArray(eta?.stationEtas)) {
    eta.stationEtas.forEach((s) => {
      const code = String(s?.stationCode || s?.code || '').toUpperCase();
      if (code) stationEtasMap[code] = s;
    });
  }

  const bundle = {
    trainNumber: key,
    journeyDate: activeDate,
    details,
    route,
    ...(live ? { live } : {}),
    ...(eta  ? { eta }  : {}),
    ...(Object.keys(stationEtasMap).length > 0 ? { stationEtas: stationEtasMap } : {}),
  };

  // Cache static tier (24h) and live tier (2min, date-scoped) separately
  setCachedStatic(key, bundle);
  if (live) {
    setCachedLive(key, activeDate, {
      live,
      ...(eta ? { eta } : {}),
      ...(Object.keys(stationEtasMap).length > 0 ? { stationEtas: stationEtasMap } : {}),
      journeyDate: activeDate,
      liveLastUpdated: Date.now(),
    });
  }

  return bundle;
});

// ─────────────────────────────────────────────────────────
// Hydrate Train Summary (FindTrain cards)  – static (24h) + live (2min)
// ─────────────────────────────────────────────────────────
export const hydrateTrainSummary = createAsyncThunk('trains/hydrateSummary', async ({ trainNumber, journeyDate }, { rejectWithValue }) => {
  try {
    const key = String(trainNumber);
    const cachedStatic = getCachedStatic(key);
    const cachedLive   = getCachedLive(key, journeyDate);
    const hasStatic    = cachedStatic?.details && cachedStatic?.route;
    const hasLive      = isLiveFresh(key, journeyDate);

    const promises = await Promise.allSettled([
      hasStatic ? Promise.resolve({ data: cachedStatic.details }) : getTrainDetails(trainNumber),
      hasStatic ? Promise.resolve({ data: cachedStatic.route })   : getTrainRoute(trainNumber),
      hasLive   ? Promise.resolve({ data: cachedLive?.live || cachedLive }) : getPreferredLiveStatus(trainNumber, journeyDate),
      getTrainEta(trainNumber, journeyDate),
    ]);

    const detailsRaw = promises[0].status === 'fulfilled' ? promises[0].value.data : null;
    const routeRaw   = promises[1].status === 'fulfilled' ? promises[1].value.data : null;
    const liveRaw    = promises[2].status === 'fulfilled' ? promises[2].value.data : null;
    const etaRaw     = promises[3].status === 'fulfilled' ? promises[3].value.data : null;

    const details = rootData(detailsRaw);
    const route   = rootData(routeRaw);
    const live = liveRaw ? normalizeLive(liveRaw) : null;
    const activeDate = live?.journeyDate || journeyDate;
    const eta  = etaRaw  ? normalizeEta(etaRaw)   : null;

    const stationEtasMap = {};
    if (Array.isArray(eta?.stationEtas)) {
      eta.stationEtas.forEach((s) => {
        const code = String(s?.stationCode || s?.code || '').toUpperCase();
        if (code) stationEtasMap[code] = s;
      });
    }

    const bundle = {
      trainNumber: key,
      journeyDate: activeDate,
      ...(details ? { details } : {}),
      ...(route   ? { route }   : {}),
      ...(live    ? { live }    : {}),
      ...(eta     ? { eta }     : {}),
      ...(Object.keys(stationEtasMap).length > 0 ? { stationEtas: stationEtasMap } : {}),
    };

    if (details || route) setCachedStatic(key, bundle);
    if (live) {
      setCachedLive(key, activeDate, {
        live,
        ...(eta ? { eta } : {}),
        ...(Object.keys(stationEtasMap).length > 0 ? { stationEtas: stationEtasMap } : {}),
        journeyDate: activeDate,
        liveLastUpdated: Date.now(),
      });
    }

    return bundle;
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error?.message || 'Summary unavailable');
  }
});

// ─────────────────────────────────────────────────────────
// Poll Train Live – strictly live telemetry (preferred live + ETA) in parallel
// ─────────────────────────────────────────────────────────
export const pollTrainLive = createAsyncThunk('trains/pollLive', async ({ trainNumber, journeyDate }, { dispatch, rejectWithValue }) => {
  const key = String(trainNumber);

  // Poll only live telemetry: preferred live status (RailRadar with backend fallback) and ETA in parallel
  const [liveRes, etaRes] = await Promise.allSettled([
    getPreferredLiveStatus(trainNumber, journeyDate),
    getTrainEta(trainNumber, journeyDate),
  ]);

  const liveRaw = liveRes.status === 'fulfilled' && liveRes.value?.data
    ? liveRes.value.data
    : null;

  if (!liveRaw && etaRes.status !== 'fulfilled') {
    const err = liveRes.status === 'rejected' ? liveRes.reason : null;
    return rejectWithValue(err?.response?.data?.message || err?.message || 'Live status unavailable');
  }

  const liveData = liveRaw ? normalizeLive(liveRaw) : null;
  const activeDate = liveData?.journeyDate || journeyDate;
  const etaPayload = etaRes.status === 'fulfilled' ? normalizeEta(etaRes.value?.data) : null;

  const stationEtasMap = {};
  if (Array.isArray(etaPayload?.stationEtas)) {
    etaPayload.stationEtas.forEach((s) => {
      const code = String(s?.stationCode || s?.code || '').toUpperCase();
      if (code) stationEtasMap[code] = s;
    });
  }

  const telemetry = {
    trainNumber: key,
    ...(liveData ? { live: liveData } : {}),
    ...(etaPayload ? { eta: etaPayload } : {}),
    ...(Object.keys(stationEtasMap).length > 0 ? { stationEtas: stationEtasMap } : {}),
    journeyDate: activeDate,
    lastUpdated: Date.now(),
  };

  dispatch(mergeLiveTelemetry(telemetry));

  // Persist fresh live data to date-scoped 2min cache for fast re-open
  if (liveData) {
    setCachedLive(key, activeDate, {
      live: liveData,
      ...(etaPayload ? { eta: etaPayload } : {}),
      ...(Object.keys(stationEtasMap).length > 0 ? { stationEtas: stationEtasMap } : {}),
      journeyDate: activeDate,
      liveLastUpdated: Date.now(),
    });
  }

  return { trainNumber: key, journeyDate: activeDate, lastUpdated: Date.now() };
});

// ─────────────────────────────────────────────────────────
// Remaining thunks – unchanged
// ─────────────────────────────────────────────────────────
export const fetchStationEta = createAsyncThunk('trains/fetchStationEta', async ({ trainNumber, stationCode }, { rejectWithValue }) => {
  try {
    return { trainNumber, stationCode, data: normalizeEta((await getStationEta(trainNumber, stationCode)).data) };
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error?.message);
  }
});

export const fetchTrainsBetween = createAsyncThunk('trains/between', async (payload, { rejectWithValue }) => {
  try { return extractSearchItems((await getTrainsBetween(payload)).data); }
  catch (error) { return rejectWithValue(error?.response?.data?.message || error?.message); }
});

export const requestTrainRefresh = createAsyncThunk('trains/refresh', async ({ trainNumber, journeyDate }, { rejectWithValue }) => {
  bustLiveCache(trainNumber); // Immediately invalidate 2min live cache on manual refresh
  try { return (await refreshTrain(trainNumber, journeyDate)).data; }
  catch (error) { return rejectWithValue(error?.response?.data?.message || error?.message); }
});

// ─────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────
const slice = createSlice({
  name: 'trains', initialState,
  reducers: {
    setSearchQuery(state, action) { state.searchQuery = action.payload; },
    selectTrain(state, action) { state.selectedTrainNumber = String(action.payload); },
    clearSelectedTrain(state) { state.selectedTrainNumber = null; },
    mergeLiveTelemetry(state, action) {
      const key = String(action.payload.trainNumber);
      const current = state.byNumber[key] || {};
      state.byNumber[key] = {
        ...current,
        ...(action.payload.live        ? { live: action.payload.live }               : {}),
        ...(action.payload.eta         ? { eta: action.payload.eta }                 : {}),
        ...(action.payload.location    ? { location: action.payload.location }       : {}),
        ...(action.payload.mlEta       ? { mlEta: action.payload.mlEta }             : {}),
        ...(action.payload.stationEtas ? { stationEtas: { ...(current.stationEtas || {}), ...action.payload.stationEtas } } : {}),
        ...(action.payload.journeyDate ? { journeyDate: action.payload.journeyDate } : {}),
        ...(action.payload.lastUpdated ? { liveLastUpdated: action.payload.lastUpdated } : {}),
      };
    },
    /** Rehydrate Redux store from localStorage cache on page load */
    rehydrateFromCache(state, action) {
      const { trainNumber, bundle } = action.payload;
      const key = String(trainNumber);
      if (bundle) {
        state.byNumber[key] = { ...(state.byNumber[key] || {}), ...bundle };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchTrains.pending,  (state) => { state.searchLoading = true; state.searchError = null; })
      .addCase(searchTrains.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchQuery = action.payload.query;
        state.search = action.payload.results;
        action.payload.results.forEach((item) => {
          state.byNumber[item.number] = { ...(state.byNumber[item.number] || {}), search: item };
        });
      })
      .addCase(searchTrains.rejected, (state, action) => { state.searchLoading = false; state.searchError = action.payload; })
      .addCase(fetchTrainBundle.pending, (state, action) => {
        const key = String(action.meta.arg.trainNumber);
        state.byNumber[key] = { ...(state.byNumber[key] || {}), loading: true };
      })
      .addCase(fetchTrainBundle.fulfilled, (state, action) => {
        const key = action.payload.trainNumber;
        state.byNumber[key] = { ...(state.byNumber[key] || {}), ...action.payload, loading: false };
      })
      .addCase(fetchTrainBundle.rejected, (state, action) => {
        const key = String(action.meta.arg.trainNumber);
        state.byNumber[key] = { ...(state.byNumber[key] || {}), loading: false, error: action.payload };
      })
      .addCase(hydrateTrainSummary.fulfilled, (state, action) => {
        const key = action.payload.trainNumber;
        state.byNumber[key] = { ...(state.byNumber[key] || {}), ...action.payload };
      })
      .addCase(pollTrainLive.fulfilled, (state, action) => {
        const key = action.payload.trainNumber;
        state.byNumber[key] = {
          ...(state.byNumber[key] || {}),
          journeyDate: action.payload.journeyDate || state.byNumber[key]?.journeyDate,
          liveLastUpdated: action.payload.lastUpdated,
        };
      })
      .addCase(pollTrainLive.rejected, (state, action) => {
        const key = String(action.meta.arg.trainNumber);
        state.byNumber[key] = { ...(state.byNumber[key] || {}), liveError: action.payload };
      })
      .addCase(fetchStationEta.fulfilled, (state, action) => {
        const key = String(action.payload.trainNumber);
        state.byNumber[key] = {
          ...(state.byNumber[key] || {}),
          stationEtas: { ...(state.byNumber[key]?.stationEtas || {}), [action.payload.stationCode]: action.payload.data },
        };
      })
      .addCase(fetchTrainsBetween.fulfilled, (state, action) => { state.between = action.payload; })
      .addCase(requestTrainRefresh.fulfilled, (state, action) => { state.refreshAccepted = action.payload; });
  },
});

export const { setSearchQuery, selectTrain, clearSelectedTrain, mergeLiveTelemetry, rehydrateFromCache } = slice.actions;
export default slice.reducer;
