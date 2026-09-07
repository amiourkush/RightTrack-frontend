import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getRailRadarHistoricalRun,
  getRailRadarLive,
  getTrainDetails,
  getTrainRoute,
  getTrainsBetween,
  predictLiveEta,
  refreshTrain,
  searchTrainsGet,
  searchTrainsPost,
} from '../../services/api/trainApi';
import {
  addMinutesToTime,
  calculateFutureStationPredictions,
  getMergedRouteStops,
  normalizeLive,
  normalizeSearchResult,
  stationCode,
} from '../../utils/train';
import {
  bustLiveCache,
  getCachedHistory,
  getCachedLive,
  getCachedSearch,
  getCachedStatic,
  setCachedHistory,
  setCachedLive,
  setCachedPrediction,
  setCachedSearch,
  setCachedStatic,
  todayISO,
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
// Fetch Train Bundle – static details & route (24h cache) + live poll
// ─────────────────────────────────────────────────────────
export const fetchTrainBundle = createAsyncThunk('trains/fetchBundle', async ({ trainNumber, journeyDate }) => {
  const key = String(trainNumber);

  // 1. Serve static timetable and details from cache (24h static tier)
  let cachedStatic = getCachedStatic(key);
  let details = cachedStatic?.details || null;
  let route = cachedStatic?.route || null;

  if (!details || !route) {
    const results = await Promise.allSettled([
      getTrainDetails(trainNumber),
      getTrainRoute(trainNumber),
    ]);

    const detailsRaw = results[0].status === 'fulfilled' ? results[0].value.data : null;
    const routeRaw   = results[1].status === 'fulfilled' ? results[1].value.data : null;
    details = rootData(detailsRaw);
    route   = rootData(routeRaw);

    if (details || route) {
      setCachedStatic(key, { details, route });
    }
  }

  return {
    trainNumber: key,
    journeyDate,
    ...(details ? { details } : {}),
    ...(route ? { route } : {}),
  };
});

// ─────────────────────────────────────────────────────────
// Hydrate Train Summary (FindTrain cards) – static (24h) + cached live (2min)
// ─────────────────────────────────────────────────────────
export const hydrateTrainSummary = createAsyncThunk('trains/hydrateSummary', async ({ trainNumber, journeyDate }, { dispatch, rejectWithValue }) => {
  try {
    const key = String(trainNumber);
    let cachedStatic = getCachedStatic(key);
    let details = cachedStatic?.details || null;
    let route = cachedStatic?.route || null;

    if (!details || !route) {
      const results = await Promise.allSettled([
        getTrainDetails(trainNumber),
        getTrainRoute(trainNumber),
      ]);
      details = rootData(results[0].status === 'fulfilled' ? results[0].value.data : null);
      route = rootData(results[1].status === 'fulfilled' ? results[1].value.data : null);
      if (details || route) setCachedStatic(key, { details, route });
    }

    // Hydrate cached live data if fresh
    const cachedLive = getCachedLive(key, journeyDate);
    if (cachedLive) {
      dispatch(mergeLiveTelemetry({
        trainNumber: key,
        live: cachedLive.live,
        mlEta: cachedLive.mlEta,
        stationEtas: cachedLive.stationEtas,
        journeyDate: cachedLive.journeyDate,
        lastUpdated: cachedLive.liveLastUpdated || Date.now(),
      }));
    }

    return {
      trainNumber: key,
      journeyDate,
      ...(details ? { details } : {}),
      ...(route ? { route } : {}),
      ...(cachedLive?.live ? { live: cachedLive.live } : {}),
      ...(cachedLive?.mlEta ? { mlEta: cachedLive.mlEta } : {}),
      ...(cachedLive?.stationEtas ? { stationEtas: cachedLive.stationEtas } : {}),
    };
  } catch (error) {
    return rejectWithValue(error?.message || 'Summary unavailable');
  }
});

// ─────────────────────────────────────────────────────────
// Poll Train Live – Strictly governed request architecture
//
// PHASE A (First Acquisition when history is not cached):
//   1 Current RailRadar GET + 4 Historical RailRadar GETs (in parallel)
//   = 5 RailRadar requests maximum
//   Then: 1 ML /predict if running
//
// PHASE B (Normal 60-second Polling when history is cached):
//   Request 1: Current RailRadar GET
//   Request 2: ML /predict (POST) if status === "running"
//   Total: EXACTLY 2 requests (1 RailRadar + 1 ML)
// ─────────────────────────────────────────────────────────
export const pollTrainLive = createAsyncThunk('trains/pollLive', async ({ trainNumber, journeyDate }, { dispatch, getState, rejectWithValue }) => {
  const key = String(trainNumber);

  // REQUEST 1: Current RailRadar /live
  let liveRaw;
  try {
    const liveRes = await getRailRadarLive(key);
    liveRaw = liveRes?.data?.data || liveRes?.data;
  } catch {
    return rejectWithValue('Current RailRadar live status unavailable');
  }

  if (!liveRaw || (!liveRaw.status && !liveRaw.currentLocation && !liveRaw.trainNumber)) {
    return rejectWithValue('Invalid RailRadar response');
  }

  // ONE RailRadar response provides BOTH live location AND current delay
  const liveData = normalizeLive(liveRaw);
  const activeDate = (liveRaw.startDate || '').substring(0, 10) || journeyDate || liveData.journeyDate || todayISO();
  liveData.journeyDate = activeDate;
  if (Array.isArray(liveRaw.route)) {
    liveData.route = liveRaw.route;
  }

  const status = String(liveRaw.status || liveData.status || '').toLowerCase().trim();

  // Rule 4: If train is NOT running:
  // DO NOT call /predict.
  // DO NOT perform future station ETA distribution.
  // DO NOT fetch historical runs.
  // Predictions UI displays "..."
  if (status !== 'running') {
    const nonRunningTelemetry = {
      trainNumber: key,
      live: liveData,
      mlEta: null,
      stationEtas: {},
      journeyDate: activeDate,
      lastUpdated: Date.now(),
    };
    dispatch(mergeLiveTelemetry(nonRunningTelemetry));
    setCachedLive(key, activeDate, {
      trainNumber: key,
      journeyDate: activeDate,
      live: liveData,
      mlEta: null,
      stationEtas: {},
      liveLastUpdated: Date.now(),
    });
    return { trainNumber: key, journeyDate: activeDate, lastUpdated: Date.now() };
  }

  // TRAIN IS RUNNING: Proceed to ML prediction workflow
  // Step A: Check 4-day history cache
  let historicalRuns = getCachedHistory(key, activeDate);
  if (!historicalRuns || !Array.isArray(historicalRuns)) {
    // FIRST ACQUISITION: 4 historical days in parallel
    const anchor = new Date(activeDate);
    const histFetches = [1, 2, 3, 4].map(async (daysBack) => {
      const d = new Date(anchor);
      d.setDate(d.getDate() - daysBack);
      const dateStr = d.toISOString().substring(0, 10);
      try {
        const r = await getRailRadarHistoricalRun(key, dateStr);
        const json = r.data || {};
        const hd = json.data || json;
        if (hd.status === 'completed' && typeof hd.delayMinutes === 'number') {
          return { date: dateStr, final_delay_minutes: hd.delayMinutes };
        }
      } catch {
        // Silently skip missing historical run
      }
      return null;
    });

    const results = await Promise.all(histFetches);
    historicalRuns = results.filter(Boolean);
    setCachedHistory(key, activeDate, historicalRuns);
  }

  // Step B: Build payload for REQUEST 2 (ML /predict)
  const currentTrainState = getState().trains.byNumber[key] || {};
  const routeStops = getMergedRouteStops({
    ...currentTrainState,
    live: liveData,
    route: currentTrainState.route || liveRaw.route,
  });

  const cl = liveRaw.currentLocation || liveData.currentLocation || {};
  const nh = liveRaw.nextHalt || liveData.nextHalt || {};

  // Destination = last stop with isHalt !== false
  const destStop = [...routeStops].reverse().find((s) => s.isHalt !== false) || routeStops.at(-1);

  // Current stop schedule
  const curStop = routeStops.find((s) =>
    (cl.sequence != null && Number(s.sequence) === Number(cl.sequence)) ||
    (cl.stationCode && stationCode(s).toUpperCase() === String(cl.stationCode).toUpperCase())
  ) || {};

  const currentDelay = typeof liveRaw.delayMinutes === 'number'
    ? liveRaw.delayMinutes
    : Number(liveData.delayMinutes || 0);

  const payload = {
    train_number: key,
    train_name: liveRaw.trainName || currentTrainState.details?.trainName || '',
    journey_date: activeDate,
    status: liveRaw.status || 'running',
    current_delay_minutes: currentDelay,
    distance_km: Number(liveRaw.train?.distance || liveRaw.distanceKm || currentTrainState.details?.distanceKm || destStop?.distanceKm || 0),
    last_updated_at: liveRaw.lastUpdatedAt || liveData.lastUpdatedAt || new Date().toISOString(),
    destination: {
      station_code: destStop?.stationCode || destStop?.code || '',
      station_name: destStop?.stationName || destStop?.name || '',
      scheduled_arrival: destStop?.scheduledArrivalTime || destStop?.scheduledArrival || '',
    },
    current_location: {
      station_code: cl.stationCode || '',
      station_name: cl.stationName || '',
      sequence: Number(cl.sequence || 0),
      location_status: cl.status || '',
      scheduled_departure: curStop?.scheduledDepartureTime || curStop?.scheduledDeparture || null,
      scheduled_arrival: curStop?.scheduledArrivalTime || curStop?.scheduledArrival || null,
    },
    next_halt: {
      station_code: nh.stationCode || '',
      station_name: nh.stationName || '',
      scheduled_arrival: nh.scheduledArrival || null,
      estimated_arrival: nh.estimatedArrival || null,
    },
    historical_runs: (historicalRuns || []).map((r) => ({
      date: r.date || r.journey_date,
      final_delay_minutes: Number(r.final_delay_minutes),
    })),
  };

  // REQUEST 2: ML /predict
  let mlEta;
  try {
    const mlRes = await predictLiveEta(payload);
    mlEta = mlRes?.data?.data || mlRes?.data;
  } catch {
    mlEta = {
      predicted_destination_eta: destStop?.scheduledArrivalTime
        ? addMinutesToTime(destStop.scheduledArrivalTime, currentDelay)
        : null,
      predicted_final_delay_minutes: currentDelay,
      current_live_delay_minutes: currentDelay,
    };
  }

  // Future Station ETA Distribution (Distance-based formula)
  const stationEtas = calculateFutureStationPredictions(
    { ...currentTrainState, live: liveData, route: currentTrainState.route || liveRaw.route },
    mlEta
  );

  const telemetry = {
    trainNumber: key,
    live: liveData,
    mlEta,
    stationEtas,
    journeyDate: activeDate,
    lastUpdated: Date.now(),
  };

  dispatch(mergeLiveTelemetry(telemetry));

  // Persist to 2-minute live cache and prediction cache
  setCachedLive(key, activeDate, {
    live: liveData,
    mlEta,
    stationEtas,
    journeyDate: activeDate,
    liveLastUpdated: Date.now(),
  });
  setCachedPrediction(key, activeDate, mlEta);

  return { trainNumber: key, journeyDate: activeDate, lastUpdated: Date.now() };
});

export const fetchTrainsBetween = createAsyncThunk('trains/between', async (payload, { rejectWithValue }) => {
  try { return extractSearchItems((await getTrainsBetween(payload)).data); }
  catch (error) { return rejectWithValue(error?.response?.data?.message || error?.message); }
});

export const requestTrainRefresh = createAsyncThunk('trains/refresh', async ({ trainNumber, journeyDate }, { rejectWithValue }) => {
  bustLiveCache(trainNumber, journeyDate);
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
    selectTrain(state, action) {
      const newTrain = action.payload ? String(action.payload) : null;
      if (state.selectedTrainNumber && state.selectedTrainNumber !== newTrain) {
        // Reset previous train's live state to prevent cross-train leakage
        const prevKey = state.selectedTrainNumber;
        if (state.byNumber[prevKey]) {
          state.byNumber[prevKey] = {
            details: state.byNumber[prevKey].details,
            route: state.byNumber[prevKey].route,
            search: state.byNumber[prevKey].search,
          };
        }
      }
      state.selectedTrainNumber = newTrain;
    },
    clearSelectedTrain(state) { state.selectedTrainNumber = null; },
    mergeLiveTelemetry(state, action) {
      const key = String(action.payload.trainNumber);
      const current = state.byNumber[key] || {};
      const newJourneyDate = action.payload.journeyDate;
      const isDifferentDate = Boolean(newJourneyDate && current.journeyDate && newJourneyDate !== current.journeyDate);

      state.byNumber[key] = {
        ...current,
        ...(action.payload.live        ? { live: action.payload.live }               : (isDifferentDate ? { live: null } : {})),
        ...(action.payload.eta         ? { eta: action.payload.eta }                 : (isDifferentDate ? { eta: null } : {})),
        ...(action.payload.location    ? { location: action.payload.location }       : (isDifferentDate ? { location: null } : {})),
        mlEta: action.payload.mlEta !== undefined ? action.payload.mlEta : (isDifferentDate ? null : current.mlEta),
        stationEtas: action.payload.stationEtas !== undefined ? action.payload.stationEtas : (isDifferentDate ? {} : (current.stationEtas || {})),
        ...(newJourneyDate ? { journeyDate: newJourneyDate } : {}),
        ...(action.payload.lastUpdated ? { liveLastUpdated: action.payload.lastUpdated } : {}),
      };
    },
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
      .addCase(fetchTrainsBetween.fulfilled, (state, action) => { state.between = action.payload; })
      .addCase(requestTrainRefresh.fulfilled, (state, action) => { state.refreshAccepted = action.payload; });
  },
});

export const { setSearchQuery, selectTrain, clearSelectedTrain, mergeLiveTelemetry, rehydrateFromCache } = slice.actions;
export default slice.reducer;
