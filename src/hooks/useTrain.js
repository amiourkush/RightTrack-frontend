import { useEffect, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './reduxHooks';
import { fetchTrainBundle, mergeLiveTelemetry, pollTrainLive, rehydrateFromCache, selectTrain } from '../features/trains/trainSlice';
import { selectTrainByNumber } from '../features/trains/trainSelectors';
import { getCachedBundle, isLiveFresh } from '../utils/trainCache';

export function useTrain(trainNumber, journeyDate, { poll = true, intervalSeconds = 30 } = {}) {
  const dispatch = useAppDispatch();
  const normalized = trainNumber ? String(trainNumber) : '';
  const train = useAppSelector(selectTrainByNumber(normalized));
  const selected = useAppSelector((s) => s.trains.selectedTrainNumber);
  const inFlight = useRef(false);
  const requested = useRef('');
  const livePolledOnce = useRef(false);

  useEffect(() => {
    if (normalized) dispatch(selectTrain(normalized));
  }, [dispatch, normalized]);

  // ── Step 1: Instant rehydration from localStorage cache ──────────────────
  // On first render, if Redux has no data yet, populate from cache so the page
  // shows static data (name, route, timetable) instantly without any network wait.
  useEffect(() => {
    if (!normalized) return;
    if (train?.details && train?.route) return; // Already in Redux
    const bundle = getCachedBundle(normalized);
    if (bundle) {
      dispatch(rehydrateFromCache({ trainNumber: normalized, bundle }));
    }
  }, [dispatch, normalized]);

  // ── Step 2: Fetch static data from network if not cached (first ever load) ──
  useEffect(() => {
    if (!normalized || train?.loading) return;
    if (train?.details && train?.route) return; // Served from cache in Step 1
    const k = `${normalized}:${journeyDate || ''}`;
    if (requested.current === k) return;
    requested.current = k;
    dispatch(fetchTrainBundle({ trainNumber: normalized, journeyDate }));
  }, [dispatch, normalized, journeyDate, Boolean(train?.details), Boolean(train?.route), Boolean(train?.loading)]);

  // ── Step 3: Live polling ─────────────────────────────────────────────────
  const fetchLive = () => {
    if (!normalized || document.visibilityState !== 'visible' || inFlight.current) return;
    inFlight.current = true;
    dispatch(pollTrainLive({ trainNumber: normalized, journeyDate })).finally(() => {
      inFlight.current = false;
      livePolledOnce.current = true;
    });
  };

  // On mount: instantly hydrate from live cache (to show last known position immediately).
  // Then, if the cache is stale (> 2 mins), trigger an immediate poll.
  useEffect(() => {
    if (!normalized) return;
    livePolledOnce.current = false;

    // Always rehydrate whatever live data is in cache to show the map marker instantly
    const bundle = getCachedBundle(normalized);
    if (bundle?.live) {
      dispatch(mergeLiveTelemetry({
        trainNumber: normalized,
        live: bundle.live,
        ...(bundle.eta         ? { eta: bundle.eta }                 : {}),
        ...(bundle.mlEta       ? { mlEta: bundle.mlEta }             : {}),
        ...(bundle.stationEtas ? { stationEtas: bundle.stationEtas } : {}),
        journeyDate: bundle.journeyDate || journeyDate,
        lastUpdated: bundle.liveLastUpdated || Date.now(),
      }));
    }

    const liveCacheFresh = isLiveFresh(normalized);
    if (!liveCacheFresh) {
      // Cache is stale or absent – poll right now
      fetchLive();
    }

    const vis = () => {
      if (document.visibilityState === 'visible') fetchLive();
    };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [dispatch, normalized, journeyDate]);

  // Pure HTTP Polling – pauses when tab is hidden
  useEffect(() => {
    if (!normalized || !poll) return;
    const id = window.setInterval(fetchLive, Math.max(10, Number(intervalSeconds) || 30) * 1000);
    return () => window.clearInterval(id);
  }, [dispatch, normalized, journeyDate, poll, intervalSeconds]);

  return useMemo(() => ({ train, isSelected: selected === normalized }), [train, selected, normalized]);
}
