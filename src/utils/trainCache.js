/**
 * Tiered Caching for Train Data
 *
 * THREE tiers:
 * - STATIC  (24h) : Train details, route/timetable, search results – these almost never change
 * - LIVE    (2min): Current live status, delay, ETA, location – must be fresh
 * - SESSION (tab) : Intermediate selections / UI state (no persistence needed)
 *
 * Key convention:  railai:<tier>:<trainNumber|query>[:<date>]
 * Date-scoped live cache ensures yesterday's "running" status never shows today.
 */

const PREFIX = 'railai';
export const TTL = {
  STATIC:     24 * 60 * 60 * 1000, // 24 hours
  LIVE:        2 * 60 * 1000,      // 2 minutes
  PREDICTION:  2 * 60 * 1000,      // 2 minutes
  HISTORY:    24 * 60 * 60 * 1000, // 24 hours (strictly scoped to journeyDate)
};

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function normalizeDateString(dateStr) {
  if (!dateStr) return todayISO();
  return String(dateStr).trim().substring(0, 10);
}

function makeKey(tier, ...parts) {
  return [PREFIX, tier, ...parts].join(':');
}

function write(key, value, extraMeta = {}) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), value, ...extraMeta }));
  } catch {
    // Storage full / private mode – fail silently
  }
}

function read(key, ttl, expectedDate = null, expectedTrainNumber = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const { ts, value, journeyDate, trainNumber } = parsed;

    // Verify TTL
    if (Date.now() - ts > ttl) {
      localStorage.removeItem(key);
      return null;
    }

    // Verify journeyDate if expected
    if (expectedDate && journeyDate && normalizeDateString(journeyDate) !== normalizeDateString(expectedDate)) {
      localStorage.removeItem(key);
      return null;
    }

    // Verify trainNumber if expected
    if (expectedTrainNumber && trainNumber && String(trainNumber) !== String(expectedTrainNumber)) {
      localStorage.removeItem(key);
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

function remove(key) {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────
// Search Results (24h)
// ─────────────────────────────────────────────────────────
export function getCachedSearch(query) {
  return read(makeKey('search', String(query).toLowerCase()), TTL.STATIC);
}
export function setCachedSearch(query, results) {
  write(makeKey('search', String(query).toLowerCase()), results);
}

// ─────────────────────────────────────────────────────────
// Static Train Data: details + route/timetable (24h)
// Timetable & route geometry are static per trainNumber
// ─────────────────────────────────────────────────────────
export function getCachedStatic(trainNumber) {
  if (!trainNumber) return null;
  return read(makeKey('static', String(trainNumber)), TTL.STATIC);
}
export function setCachedStatic(trainNumber, data) {
  if (!trainNumber || !data) return;
  const rest = { ...data };
  delete rest.live;
  delete rest.eta;
  delete rest.mlEta;
  delete rest.stationEtas;
  delete rest.liveLastUpdated;
  delete rest.location;
  const hasDetails = rest.details && Object.keys(rest.details).length > 0;
  const hasRoute = (Array.isArray(rest.route) && rest.route.length > 0) || (rest.route && typeof rest.route === 'object');
  if (hasDetails || hasRoute || rest.resolvedRouteCoords) {
    write(makeKey('static', String(trainNumber)), rest, { trainNumber: String(trainNumber) });
  }
}

// ─────────────────────────────────────────────────────────
// Live Data: live status & telemetry (2min, date-scoped)
// Key: railai:live:{trainNumber}:{journeyDate}
// ─────────────────────────────────────────────────────────
export function getCachedLive(trainNumber, journeyDate) {
  if (!trainNumber) return null;
  const date = normalizeDateString(journeyDate);
  return read(makeKey('live', String(trainNumber), date), TTL.LIVE, date, String(trainNumber));
}

export function setCachedLive(trainNumber, journeyDateOrData, maybeData) {
  if (!trainNumber) return;
  let date;
  let data;
  if (typeof journeyDateOrData === 'string' && journeyDateOrData && maybeData !== undefined) {
    date = normalizeDateString(journeyDateOrData);
    data = maybeData;
  } else {
    data = journeyDateOrData;
    date = normalizeDateString(data?.journeyDate || data?.live?.journeyDate || todayISO());
  }
  if (!data) return;
  write(makeKey('live', String(trainNumber), date), data, {
    trainNumber: String(trainNumber),
    journeyDate: date,
  });
}

export function isLiveFresh(trainNumber, journeyDate) {
  return getCachedLive(trainNumber, journeyDate) !== null;
}

// ─────────────────────────────────────────────────────────
// Historical Runs Cache (24h, strictly scoped to journeyDate)
// Key: railai:history:{trainNumber}:{journeyDate}
// Stores: [{ date: 'YYYY-MM-DD', final_delay_minutes: Number }]
// ─────────────────────────────────────────────────────────
export function getCachedHistory(trainNumber, journeyDate) {
  if (!trainNumber) return null;
  const date = normalizeDateString(journeyDate);
  const result = read(makeKey('history', String(trainNumber), date), TTL.HISTORY, date, String(trainNumber));
  return Array.isArray(result) && result.length > 0 ? result : null;
}

export function setCachedHistory(trainNumber, journeyDate, historicalRuns) {
  if (!trainNumber || !Array.isArray(historicalRuns)) return;
  const date = normalizeDateString(journeyDate);
  write(makeKey('history', String(trainNumber), date), historicalRuns, {
    trainNumber: String(trainNumber),
    journeyDate: date,
  });
}

// ─────────────────────────────────────────────────────────
// ML Prediction Cache (2min, strictly scoped to journeyDate)
// Key: railai:prediction:{trainNumber}:{journeyDate}
// ─────────────────────────────────────────────────────────
export function getCachedPrediction(trainNumber, journeyDate) {
  if (!trainNumber) return null;
  const date = normalizeDateString(journeyDate);
  return read(makeKey('prediction', String(trainNumber), date), TTL.PREDICTION, date, String(trainNumber));
}

export function setCachedPrediction(trainNumber, journeyDate, prediction) {
  if (!trainNumber || !prediction) return;
  const date = normalizeDateString(journeyDate);
  write(makeKey('prediction', String(trainNumber), date), prediction, {
    trainNumber: String(trainNumber),
    journeyDate: date,
  });
}

/**
 * Invalidate live and prediction cache for a train/journey.
 */
export function bustLiveCache(trainNumber, journeyDate) {
  if (!trainNumber) return;
  const date = journeyDate ? normalizeDateString(journeyDate) : todayISO();
  remove(makeKey('live', String(trainNumber), date));
  remove(makeKey('prediction', String(trainNumber), date));
  try {
    const livePrefix = makeKey('live', String(trainNumber)) + ':';
    const predPrefix = makeKey('prediction', String(trainNumber)) + ':';
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(livePrefix) || k.startsWith(predPrefix))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* noop */ }
}

/**
 * Prune expired entries across the whole railai namespace.
 * Also discards entries belonging to older journey dates.
 */
export function pruneExpiredCache() {
  try {
    const toRemove = [];
    const today = todayISO();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX + ':')) continue;
      try {
        const item = JSON.parse(localStorage.getItem(k));
        const { ts, journeyDate } = item;
        const tier = k.split(':')[1];
        let maxAge = TTL.STATIC;
        if (tier === 'live') maxAge = TTL.LIVE;
        else if (tier === 'prediction') maxAge = TTL.PREDICTION;
        else if (tier === 'history') maxAge = TTL.HISTORY;

        if (Date.now() - ts > maxAge) {
          toRemove.push(k);
        } else if ((tier === 'live' || tier === 'prediction') && journeyDate && normalizeDateString(journeyDate) !== today) {
          // Stale live/prediction from yesterday
          toRemove.push(k);
        }
      } catch {
        toRemove.push(k); // Corrupt entry
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* noop */ }
}

