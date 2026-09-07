import { useCallback, useEffect, useMemo, useState } from 'react';

const KEY = 'railai.recentSearches';
const LIMIT = 8;

function readRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalize(train = {}) {
  if (!train?.number && !train?.trainNumber) return null;
  const stops = Array.isArray(train.routeStops) ? train.routeStops : [];
  const firstStop = stops[0];
  const lastStop = stops.at(-1);
  const sourceName = train.sourceName || train.sourceStationName || firstStop?.stationName || firstStop?.stationCode || '';
  const destinationName = train.destinationName || train.destinationStationName || lastStop?.stationName || lastStop?.stationCode || '';
  return {
    number: String(train.number || train.trainNumber),
    name: train.name || train.trainName || 'Unnamed service',
    route: train.route || `${sourceName || 'Origin'} → ${destinationName || 'Destination'}`,
    sourceName,
    destinationName,
    sourceCode: train.sourceCode || train.sourceStationCode || firstStop?.stationCode || '',
    destinationCode: train.destinationCode || train.destinationStationCode || lastStop?.stationCode || '',
    scheduledDepartureTime: train.scheduledDepartureTime || firstStop?.scheduledDepartureTime || '',
    scheduledArrivalTime: train.scheduledArrivalTime || lastStop?.scheduledArrivalTime || '',
  };
}

export function addRecentSearch(train) {
  const item = normalize(train);
  if (!item) return;
  const current = readRecentSearches();
  const next = [item, ...current.filter((entry) => String(entry.number) !== item.number)].slice(0, LIMIT);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('righttrack:recent-searches-updated', { detail: next }));
  } catch {
    // Ignore storage failures; the search itself still works.
  }
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent('righttrack:recent-searches-updated', { detail: [] }));
  } catch {
    // Ignore storage failures.
  }
}

export function useRecentSearches() {
  const [recent, setRecent] = useState(readRecentSearches);
  const refresh = useCallback(() => setRecent(readRecentSearches()), []);

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('righttrack:recent-searches-updated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('righttrack:recent-searches-updated', handler);
      window.removeEventListener('storage', handler);
    };
  }, [refresh]);

  return useMemo(() => ({ recent, clear: clearRecentSearches }), [recent]);
}
