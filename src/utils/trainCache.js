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
  return read(makeKey('static', String(trainNumber)), TTL.STATIC);
}
export function setCachedStatic(trainNumber, data) {
  // Only persist details & route – never live payload inside static
  const { live, eta, mlEta, stationEtas, liveLastUpdated, ...rest } = data;
  const hasDetails = rest.details && Object.keys(rest.details).length > 0;
  const hasRoute = Array.isArray(rest.route) && rest.route.length > 0;
  if (hasDetails || hasRoute) {
    write(makeKey('static', String(trainNumber)), rest);
  }
}

// ─────────────────────────────────────────────────────────
// Live Data: live status, ETA, location (2min, date-scoped)
// Scoped to today's date so yesterday's status is never used
// ─────────────────────────────────────────────────────────
export function getCachedLive(trainNumber) {
  const date = todayISO();
  return read(makeKey('live', String(trainNumber), date), TTL.LIVE);
}
export function setCachedLive(trainNumber, data) {
  const date = todayISO();
  write(makeKey('live', String(trainNumber), date), data);
}

/**
 * Check if live cache is fresh enough to use immediately (< 2 min old)
 * Returns true if fresh, false if stale/absent
 */
export function isLiveFresh(trainNumber) {
  return getCachedLive(trainNumber) !== null;
}

/**
 * Hydrate static + live separately for a train bundle.
 * Returns merged bundle or null fields where not cached.
 */
export function getCachedBundle(trainNumber) {
  const staticData = getCachedStatic(trainNumber);
  const liveData   = getCachedLive(trainNumber);
  if (!staticData && !liveData) return null;
  return { ...(staticData || {}), ...(liveData || {}) };
}

/**
 * Bust all live cache entries for a train (e.g., after manual refresh).
 */
export function bustLiveCache(trainNumber) {
  const date = todayISO();
  remove(makeKey('live', String(trainNumber), date));
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
