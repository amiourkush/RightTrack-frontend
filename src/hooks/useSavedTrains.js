import { useCallback, useEffect, useMemo, useState } from 'react';

const KEY = 'railai.savedTrains';

const read = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

function normalize(train = {}) {
  const stops = Array.isArray(train.routeStops) ? train.routeStops : [];
  const firstStop = stops[0];
  const lastStop = stops.at(-1);
  const sourceName = train.sourceName || train.sourceStationName || firstStop?.stationName || firstStop?.stationCode || '';
  const destinationName = train.destinationName || train.destinationStationName || lastStop?.stationName || lastStop?.stationCode || '';
  return {
    number: String(train.number || train.trainNumber || ''),
    name: train.name || train.trainName || 'Unnamed service',
    sourceName,
    destinationName,
    sourceCode: train.sourceCode || train.sourceStationCode || firstStop?.stationCode || '',
    destinationCode: train.destinationCode || train.destinationStationCode || lastStop?.stationCode || '',
    route: train.route || `${sourceName || 'Origin'} → ${destinationName || 'Destination'}`,
    type: train.type || train.trainType || train.category || '',
    distanceKm: train.distanceKm ?? null,
    runsOnDays: train.runsOnDays || '',
    scheduledDepartureTime: train.scheduledDepartureTime || firstStop?.scheduledDepartureTime || '',
    scheduledArrivalTime: train.scheduledArrivalTime || lastStop?.scheduledArrivalTime || '',
  };
}

export function useSavedTrains() {
  const [saved, setSaved] = useState(read);

  useEffect(() => {
    const sync = () => setSaved(read());
    window.addEventListener('storage', sync);
    window.addEventListener('righttrack:saved-trains-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('righttrack:saved-trains-updated', sync);
    };
  }, []);

  const commit = useCallback((next) => {
    setSaved(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('righttrack:saved-trains-updated', { detail: next }));
    } catch {
      // Ignore storage failures; the current UI state still updates.
    }
  }, []);

  const isSaved = useCallback((number) => saved.some((item) => String(item.number) === String(number)), [saved]);

  const toggleSaved = useCallback((train) => {
    const number = String(train?.number || train?.trainNumber || '');
    if (!number) return;
    const next = isSaved(number)
      ? saved.filter((item) => String(item.number) !== number)
      : [normalize(train), ...saved];
    commit(next);
  }, [commit, isSaved, saved]);

  return useMemo(() => ({ saved, isSaved, toggleSaved }), [saved, isSaved, toggleSaved]);
}
