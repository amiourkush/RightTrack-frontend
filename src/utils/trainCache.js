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
const TTL = {
  STATIC: 24 * 60 * 60 * 1000,     // 24 hours
  LIVE:    2  * 60 * 1000,          // 2 minutes
};

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function makeKey(tier, ...parts) {
  return [PREFIX, tier, ...parts].join(':');
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), value }));
  } catch {
    // Storage full / private mode – fail silently
  }
}

function read(key, ttl) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, value } = JSON.parse(raw);
    if (Date.now() - ts > ttl) {
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
// ─────────────────────────────────────────────────────────
export function getCachedStatic(trainNumber) {
  if (!trainNumber) return null;
  return read(makeKey('static', String(trainNumber)), TTL.STATIC);
}
export function setCachedStatic(trainNumber, data) {
  if (!trainNumber || !data) return;
  // Only persist details & route – never live payload inside static
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
    write(makeKey('static', String(trainNumber)), rest);
  }
}

// ─────────────────────────────────────────────────────────
// Live Data: live status, ETA, location (2min, date-scoped)
// Scoped to specific journeyDate (e.g. railai:live:20423:2026-09-07)
// ─────────────────────────────────────────────────────────
export function getCachedLive(trainNumber, journeyDate) {
  if (!trainNumber) return null;
  const date = journeyDate || todayISO();
  return read(makeKey('live', String(trainNumber), date), TTL.LIVE);
}

export function setCachedLive(trainNumber, journeyDateOrData, maybeData) {
  if (!trainNumber) return;
  let date;
  let data;
  if (typeof journeyDateOrData === 'string' && journeyDateOrData && maybeData !== undefined) {
    date = journeyDateOrData;
    data = maybeData;
  } else {
    data = journeyDateOrData;
    date = data?.journeyDate || data?.live?.journeyDate || todayISO();
  }
  if (!data) return;
  write(makeKey('live', String(trainNumber), date), data);
}

/**
 * Check if live cache is fresh enough to use immediately (< 2 min old)
 * Returns true if fresh, false if stale/absent
 */
export function isLiveFresh(trainNumber, journeyDate) {
  return getCachedLive(trainNumber, journeyDate) !== null;
}

/**
 * Hydrate static + live separately for a train bundle.
 * Returns merged bundle or null fields where not cached.
 */
export function getCachedBundle(trainNumber, journeyDate) {
  const staticData = getCachedStatic(trainNumber);
  const liveData   = getCachedLive(trainNumber, journeyDate);
  if (!staticData && !liveData) return null;
  return { ...(staticData || {}), ...(liveData || {}) };
}

/**
 * Bust live cache entries for a train (e.g., after manual refresh).
 */
export function bustLiveCache(trainNumber, journeyDate) {
  if (!trainNumber) return;
  if (journeyDate) {
    remove(makeKey('live', String(trainNumber), journeyDate));
  } else {
    remove(makeKey('live', String(trainNumber), todayISO()));
    try {
      const prefix = makeKey('live', String(trainNumber)) + ':';
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch { /* noop */ }
  }
}

/**
 * Prune expired entries across the whole railai namespace.
 * Call once on app startup to keep localStorage tidy.
 */
export function pruneExpiredCache() {
  try {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX + ':')) continue;
      try {
        const { ts } = JSON.parse(localStorage.getItem(k));
        const tier = k.split(':')[1];
        const maxAge = tier === 'live' ? TTL.LIVE : TTL.STATIC;
        if (Date.now() - ts > maxAge) toRemove.push(k);
      } catch {
        toRemove.push(k); // Corrupt entry
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch { /* noop */ }
}

