import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './reduxHooks';
import { fetchTrainBundle, mergeLiveTelemetry, pollTrainLive, rehydrateFromCache, selectTrain } from '../features/trains/trainSlice';
import { selectTrainByNumber } from '../features/trains/trainSelectors';
import { getCachedLive, getCachedStatic, isLiveFresh } from '../utils/trainCache';

export function useTrain(trainNumber, journeyDate, { poll = true, intervalSeconds = 60 } = {}) {
  const dispatch = useAppDispatch();
  const normalized = trainNumber ? String(trainNumber) : '';
  const train = useAppSelector(selectTrainByNumber(normalized));
  const selected = useAppSelector((s) => s.trains.selectedTrainNumber);

  const inFlight = useRef(false);
  const timerRef = useRef(null);
  const isMounted = useRef(true);
  const bundleRequested = useRef('');

  const pollIntervalMs = Math.max(10_000, (Number(intervalSeconds) || 60) * 1000);

  useEffect(() => {
    if (normalized) dispatch(selectTrain(normalized));
  }, [dispatch, normalized]);

  // ── Step 1: Instant rehydration from localStorage cache ──────────────────
  useEffect(() => {
    if (!normalized) return;

    // 1a. Hydrate static data if not yet present in Redux
    const cachedStatic = getCachedStatic(normalized);
    if (cachedStatic?.details && cachedStatic?.route && (!train?.details || !train?.route)) {
      dispatch(rehydrateFromCache({ trainNumber: normalized, bundle: cachedStatic }));
    }

    // 1b. Hydrate date-scoped live cache for immediate map marker placement
    const cachedLive = getCachedLive(normalized, journeyDate);
    if (cachedLive?.live) {
      dispatch(mergeLiveTelemetry({
        trainNumber: normalized,
        live: cachedLive.live,
        ...(cachedLive.eta         ? { eta: cachedLive.eta }                 : {}),
        ...(cachedLive.stationEtas ? { stationEtas: cachedLive.stationEtas } : {}),
        journeyDate: cachedLive.journeyDate || journeyDate,
        lastUpdated: cachedLive.liveLastUpdated || Date.now(),
      }));
    }
  }, [dispatch, normalized, journeyDate, train?.details, train?.route]);

  // ── Step 2: Fetch static data from network if missing from cache (first ever load) ──
  const hasDetails = Boolean(train?.details);
  const hasRoute = Boolean(train?.route);
  const isLoading = Boolean(train?.loading);

  useEffect(() => {
    if (!normalized || isLoading) return;
    const cachedStatic = getCachedStatic(normalized);
    if (cachedStatic?.details && cachedStatic?.route) return; // Static cached
    if (hasDetails && hasRoute) return; // In Redux

    const reqKey = `${normalized}:${journeyDate || ''}`;
    if (bundleRequested.current === reqKey) return;
    bundleRequested.current = reqKey;

    dispatch(fetchTrainBundle({ trainNumber: normalized, journeyDate }));
  }, [dispatch, normalized, journeyDate, hasDetails, hasRoute, isLoading]);

  // ── Step 3: Network-aware, Visibility-aware 60s Recursive Polling ─────────
  const runPoll = useCallback(async () => {
    if (!normalized || !poll || !isMounted.current) return;
    if (document.visibilityState !== 'visible') return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    if (inFlight.current) return;

    inFlight.current = true;
    try {
      await dispatch(pollTrainLive({ trainNumber: normalized, journeyDate })).unwrap();
    } catch {
      // Errors preserve previous live & ETA state silently
    } finally {
      inFlight.current = false;
      if (isMounted.current && poll && document.visibilityState === 'visible' && (!navigator || navigator.onLine !== false)) {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => runPoll(), pollIntervalMs);
      }
    }
  }, [dispatch, normalized, journeyDate, poll, pollIntervalMs]);

  useEffect(() => {
    isMounted.current = true;
    if (!normalized || !poll) return;

    // Clear any existing timer
    clearTimeout(timerRef.current);

    // Initial poll check: if live cache is stale or absent, trigger immediate poll
    const isFresh = isLiveFresh(normalized, journeyDate);
    if (!isFresh) {
      runPoll();
    } else {
      // Start recursive cycle after interval
      timerRef.current = setTimeout(() => runPoll(), pollIntervalMs);
    }

    // Online event handler: immediate poll on network reconnect
    const handleOnline = () => {
      clearTimeout(timerRef.current);
      runPoll();
    };

    // Offline event handler: pause scheduling
    const handleOffline = () => {
      clearTimeout(timerRef.current);
    };

    // Visibility change handler
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timerRef.current);
        runPoll();
      } else {
        clearTimeout(timerRef.current);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted.current = false;
      clearTimeout(timerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [normalized, journeyDate, poll, pollIntervalMs, runPoll]);

  // ── Manual Refresh action: directly triggers optimized live poll without POST /refresh ──
  const refreshLive = useCallback(async () => {
    if (!normalized || inFlight.current) return;
    inFlight.current = true;
    try {
      await dispatch(pollTrainLive({ trainNumber: normalized, journeyDate })).unwrap();
    } catch {
      // Errors preserve previous live & ETA state silently
    } finally {
      inFlight.current = false;
      // Reschedule next background poll from current completion timestamp
      if (isMounted.current && poll && document.visibilityState === 'visible' && (!navigator || navigator.onLine !== false)) {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => runPoll(), pollIntervalMs);
      }
    }
  }, [dispatch, normalized, journeyDate, poll, pollIntervalMs, runPoll]);

  return useMemo(
    () => ({ train, isSelected: selected === normalized, refreshLive }),
    [train, selected, normalized, refreshLive]
  );
}

