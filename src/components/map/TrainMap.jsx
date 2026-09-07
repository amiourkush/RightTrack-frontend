import { Locate, Maximize2, Minimize2, RefreshCw, MapPinned } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatTimeOnly,
  getDistanceCovered,
  getLiveSequence,
  getMergedRouteStops,
  getStationEtaPredictions,
  isMainHalt,
  normalizeLive,
  stationCode,
  stationName,
} from '../../utils/train';
import { getStationCoords } from '../../utils/stationCoordinates';
import { loadGoogleMaps } from '../../services/maps/googleMapsLoader';
import { getCachedStatic, setCachedStatic } from '../../utils/trainCache';

// ── Coordinate helpers ────────────────────────────────────────────────────────

function toLatLng({ lat, lng }) { return { lat: Number(lat), lng: Number(lng) }; }

/** Resolve a stop's lat/lng: API data first, then dataset lookup. */
function resolveStopCoords(stop) {
  const lat = Number(stop?.latitude ?? stop?.lat);
  const lng = Number(stop?.longitude ?? stop?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  const code = stationCode(stop);
  return code ? getStationCoords(code) : null;
}

/** Calculate compass bearing (degrees) from A → B */
function calcBearing(aLat, aLng, bLat, bLng) {
  const r = d => d * Math.PI / 180;
  const dL = r(bLng - aLng);
  const y = Math.sin(dL) * Math.cos(r(bLat));
  const x = Math.cos(r(aLat)) * Math.sin(r(bLat)) - Math.sin(r(aLat)) * Math.cos(r(bLat)) * Math.cos(dL);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

// ── Info window HTML ──────────────────────────────────────────────────────────

function htmlInfoWindow(stop, etaPred, timeFormat) {
  const arr   = etaPred?.arrivalEta     ? formatTimeOnly(etaPred.arrivalEta,     timeFormat) : '—';
  const dep   = etaPred?.departureEta   ? formatTimeOnly(etaPred.departureEta,   timeFormat) : '—';
  const schedA = stop?.scheduledArrivalTime   ? formatTimeOnly(stop.scheduledArrivalTime,   timeFormat) : '—';
  const schedD = stop?.scheduledDepartureTime ? formatTimeOnly(stop.scheduledDepartureTime, timeFormat) : '—';
  const code  = stationCode(stop);
  const name  = stationName(stop);
  const tone  = etaPred?.arrivalTone || 'on-time';
  return `<div class="google-map-info">
    <div class="map-info-title"><strong>${name}</strong><span>${code}</span></div>
    <div class="map-info-grid"><span>Scheduled Arr.</span><b>${schedA}</b></div>
    <div class="map-info-grid"><span>ETA Arrival</span><b class="google-${tone}">${arr}</b></div>
    <div class="map-info-grid"><span>Scheduled Dep.</span><b>${schedD}</b></div>
    <div class="map-info-grid"><span>ETA Dep.</span><b class="google-${etaPred?.departureTone || 'on-time'}">${dep}</b></div>
    <div class="map-info-grid"><span>Platform</span><b>${stop?.platform || '—'}</b></div>
  </div>`;
}

// ── Animated position hook ────────────────────────────────────────────────────

function useAnimatedPosition(target, duration = 300) {
  const [point, setPoint] = useState(target);
  const prev  = useRef(target);
  const rafId = useRef(null);

  useEffect(() => {
    if (!target) return;
    // Initial mount or point just became available -> snap instantly without lag
    if (!prev.current || (prev.current[0] === target[0] && prev.current[1] === target[1])) {
      prev.current = target;
      setPoint(target);
      return;
    }

    const from = prev.current;
    const t0 = performance.now();
    cancelAnimationFrame(rafId.current);
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setPoint([from[0] + (target[0] - from[0]) * e, from[1] + (target[1] - from[1]) * e]);
      if (p < 1) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        prev.current = target;
      }
    };
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [target, duration]);

  return point;
}

// ── Live train position resolution (matches RouteTimeline calculations) ───────

function resolveTrainPosition(train, stops) {
  if (!stops || stops.length === 0) return null;
  const live     = normalizeLive(train?.live     || {});
  const location = normalizeLive(train?.location || {});
  const status   = String(live.status || '').toUpperCase();

  if (/NOT[_ -]?START|SCHEDULED|UPCOMING|YET/.test(status)) {
    const first = resolveStopCoords(stops[0]);
    return first ? [first.lat, first.lng] : null;
  }
  if (/CANCEL|COMPLET|TERMINAT/.test(status)) {
    const last = resolveStopCoords(stops[stops.length - 1]);
    return last ? [last.lat, last.lng] : null;
  }

  // 1. Direct GPS coordinates from live or location telemetry
  const gpsLat = Number(location.latitude ?? live.latitude);
  const gpsLng = Number(location.longitude ?? live.longitude);
  if (Number.isFinite(gpsLat) && Number.isFinite(gpsLng) && gpsLat !== 0 && gpsLng !== 0 && (location.locationAvailable !== false || live.locationAvailable !== false)) {
    return [gpsLat, gpsLng];
  }

  // 2. RailRadar / telemetry segmentProgress with previousHalt + nextHalt
  const prevCode = String(live.previousHalt?.stationCode || live.previousHaltCode || location.previousHaltCode || '').toUpperCase();
  const nextCode = String(live.nextHalt?.stationCode || live.nextHaltCode || location.nextHaltCode || '').toUpperCase();
  const rawProgress = Number(live.segmentProgress ?? location.segmentProgress);
  const progress = Number.isFinite(rawProgress) && rawProgress >= 0 && rawProgress <= 1
    ? rawProgress
    : (Number.isFinite(rawProgress) && rawProgress > 0 ? Math.max(0.01, Math.min(0.99, rawProgress)) : null);

  if (prevCode && nextCode && prevCode !== nextCode && progress != null) {
    const prev = stops.find((s) => stationCode(s).toUpperCase() === prevCode);
    const next = stops.find((s) => stationCode(s).toUpperCase() === nextCode);
    const a = prev ? resolveStopCoords(prev) : getStationCoords(prevCode);
    const b = next ? resolveStopCoords(next) : getStationCoords(nextCode);
    if (a && b) {
      return [a.lat + (b.lat - a.lat) * progress, a.lng + (b.lng - a.lng) * progress];
    }
    if (a) return [a.lat, a.lng];
  }

  // 3. RailRadar / telemetry distanceFromOriginKm interpolation
  const distFromOrigin = Number(live.distanceFromOriginKm ?? location.distanceFromOriginKm);
  if (Number.isFinite(distFromOrigin) && distFromOrigin > 0) {
    let pStop = null;
    let nStop = null;
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      const d = Number(s.distanceKm);
      const coords = resolveStopCoords(s);
      if (coords && Number.isFinite(d)) {
        if (d <= distFromOrigin) {
          pStop = { stop: s, coords, dist: d };
        } else if (d > distFromOrigin && !nStop) {
          nStop = { stop: s, coords, dist: d };
          break;
        }
      }
    }
    if (pStop && nStop && nStop.dist > pStop.dist) {
      const frac = Math.max(0, Math.min(1, (distFromOrigin - pStop.dist) / (nStop.dist - pStop.dist)));
      return [
        pStop.coords.lat + (nStop.coords.lat - pStop.coords.lat) * frac,
        pStop.coords.lng + (nStop.coords.lng - pStop.coords.lng) * frac,
      ];
    }
    if (pStop) return [pStop.coords.lat, pStop.coords.lng];
  }

  // 4. Distance covered calculation (fallback layer)
  const coveredDist = getDistanceCovered(train);
  if (coveredDist != null && coveredDist >= 0) {
    let prevStop = null;
    let nextStop = null;
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      const d = Number(s.distanceKm);
      const coords = resolveStopCoords(s);
      if (coords && Number.isFinite(d)) {
        if (d <= coveredDist) {
          prevStop = { stop: s, coords, dist: d };
        } else if (d > coveredDist && !nextStop) {
          nextStop = { stop: s, coords, dist: d };
          break;
        }
      }
    }
    if (prevStop && nextStop && nextStop.dist > prevStop.dist) {
      const frac = Math.max(0, Math.min(1, (coveredDist - prevStop.dist) / (nextStop.dist - prevStop.dist)));
      return [
        prevStop.coords.lat + (nextStop.coords.lat - prevStop.coords.lat) * frac,
        prevStop.coords.lng + (nextStop.coords.lng - prevStop.coords.lng) * frac,
      ];
    }
    if (prevStop) return [prevStop.coords.lat, prevStop.coords.lng];
  }

  // 5. Sequence interpolation (using getLiveSequence)
  const seq = getLiveSequence(train) || Number(live.currentSequence ?? location.currentSequence ?? 0);
  if (seq > 0) {
    let prevStop = null;
    let nextStop = null;
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      const sSeq = Number(s.sequence || i + 1);
      const coords = resolveStopCoords(s);
      if (coords) {
        if (sSeq <= seq) {
          prevStop = { stop: s, coords, seq: sSeq };
        } else if (sSeq > seq && !nextStop) {
          nextStop = { stop: s, coords, seq: sSeq };
          break;
        }
      }
    }
    if (prevStop && nextStop && nextStop.seq > prevStop.seq) {
      const seqFrac = (seq - prevStop.seq) / (nextStop.seq - prevStop.seq);
      const frac = Math.max(0, Math.min(1, progress != null ? progress : seqFrac));
      return [
        prevStop.coords.lat + (nextStop.coords.lat - prevStop.coords.lat) * frac,
        prevStop.coords.lng + (nextStop.coords.lng - prevStop.coords.lng) * frac,
      ];
    }
    if (prevStop) return [prevStop.coords.lat, prevStop.coords.lng];
  }

  // 6. Current station exact coordinate match
  const curCode = String(live.currentStationCode || location.currentStationCode || '').toUpperCase();
  if (curCode) {
    const cur = stops.find((s) => stationCode(s).toUpperCase() === curCode);
    const c = cur ? resolveStopCoords(cur) : getStationCoords(curCode);
    if (c) return [c.lat, c.lng];
  }

  // 7. Fallback to origin coords if running
  const firstCoords = resolveStopCoords(stops[0]);
  return firstCoords ? [firstCoords.lat, firstCoords.lng] : null;
}

// ── LocalStorage for resolved route coords ────────────────────────────────────

const ROUTE_CACHE_KEY = 'resolvedRouteCoords';

function saveRouteCoords(trainNumber, coords) {
  if (!trainNumber || coords.length < 2) return;
  try {
    const existing = getCachedStatic(trainNumber) || {};
    setCachedStatic(trainNumber, { ...existing, [ROUTE_CACHE_KEY]: coords });
  } catch { /* noop */ }
}

function loadRouteCoordsFromCache(trainNumber) {
  if (!trainNumber) return null;
  try {
    const arr = getCachedStatic(trainNumber)?.[ROUTE_CACHE_KEY];
    if (Array.isArray(arr) && arr.length > 1) return arr;
  } catch { /* noop */ }
  return null;
}

// ── Google Maps icon factories ────────────────────────────────────────────────

function makeStationIcon(isEndpoint) {
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: isEndpoint ? 10 : 7,
    fillColor: isEndpoint ? '#0d716a' : '#2a9d8f',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: isEndpoint ? 3 : 2,
  };
}

/**
 * Blue arrow-head train marker pointing in direction of movement.
 * Shape: rectangle body with a pointed nose at the top.
 */
function makeTrainIcon(isLive, bearing = 0) {
  return {
    path: 'M 0,-14 L 7,4 L 0,10 L -7,4 Z',   // diamond / arrowhead shape
    fillColor: isLive ? '#1a56db' : '#374151',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    rotation: bearing,
    scale: 1.5,
    anchor: new window.google.maps.Point(0, 0),
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TrainMap({ train, fullscreen, onToggleFullscreen, onRefresh, timeFormat = 'H24' }) {
  const trainNumber = train?.search?.number || train?.details?.trainNumber || String(train?.trainNumber || '');

  const hostRef        = useRef(null);
  const mapRef         = useRef(null);
  const polylineRef    = useRef(null);
  const markersRef     = useRef([]);
  const trainMarker    = useRef(null);
  const infoRef        = useRef(null);
  const fittedRef      = useRef(false);   // whether full-route fitBounds was done
  const liveZoomedRef  = useRef(false);   // whether first live-window zoom was done

  const [mapStatus, setMapStatus] = useState('loading');
  const [errorMsg,  setErrorMsg]  = useState('');

  const live  = useMemo(() => normalizeLive(train?.live     || {}), [train?.live]);
  const stops = useMemo(() => getMergedRouteStops(train),           [train]);

  // ── 1. Main-halt markers (only main stations) ────────────────────────────
  const mainHalts = useMemo(
    () => stops.filter((s, i, arr) => isMainHalt(s, i, arr)),
    [stops]
  );

  // ── 2. Full route coordinates (all stops for polyline) ──────────────────
  const routeCoords = useMemo(() => {
    const fromStops = stops.map(s => resolveStopCoords(s)).filter(Boolean);
    if (fromStops.length > 1) return fromStops;
    const cached = loadRouteCoordsFromCache(trainNumber);
    if (cached) return cached.map(([lat, lng]) => ({ lat, lng }));
    return [];
  }, [stops, trainNumber]);

  // ── 3. Running status ────────────────────────────────────────────────────
  const isRunning = useMemo(() => {
    const v = String(live.status || '').toUpperCase();
    return /RUN|DELAY|LATE|EARLY|ACTIVE|EN[_ -]?ROUTE|ON[_ -]?TIME/.test(v)
        && !/NOT[_ -]?START|SCHEDULED|UPCOMING|YET|CANCEL|COMPLET|TERMINAT/.test(v);
  }, [live.status]);

  // ── 4. Live train position + smooth animation ────────────────────────────
  const positionTarget   = useMemo(() => resolveTrainPosition(train, stops), [train, stops]);
  const animatedPosition = useAnimatedPosition(positionTarget);

  // ── 5. Bearing towards next station ─────────────────────────────────────
  const bearing = useMemo(() => {
    const loc = normalizeLive(train?.location || {});
    const prevCode = String(live.previousHalt?.stationCode || live.previousHaltCode || loc.previousHaltCode || '').toUpperCase();
    const nextCode = String(live.nextHalt?.stationCode || live.nextHaltCode || loc.nextHaltCode || '').toUpperCase();
    if (prevCode && nextCode && prevCode !== nextCode) {
      const p1 = resolveStopCoords(stops.find(s => stationCode(s).toUpperCase() === prevCode)) || getStationCoords(prevCode);
      const p2 = resolveStopCoords(stops.find(s => stationCode(s).toUpperCase() === nextCode)) || getStationCoords(nextCode);
      if (p1 && p2 && (p1.lat !== p2.lat || p1.lng !== p2.lng)) return calcBearing(p1.lat, p1.lng, p2.lat, p2.lng);
    }
    if (stops.length >= 2) {
      const seq = getLiveSequence(train) || 0;
      let curIdx = stops.findIndex(s => Number(s.sequence) >= seq);
      if (curIdx < 0) curIdx = 0;
      const s1 = stops[Math.max(0, curIdx - 1)] || stops[0];
      const s2 = stops[Math.min(stops.length - 1, curIdx + 1)] || stops.at(-1);
      const p1 = resolveStopCoords(s1);
      const p2 = resolveStopCoords(s2);
      if (p1 && p2 && (p1.lat !== p2.lat || p1.lng !== p2.lng)) {
        return calcBearing(p1.lat, p1.lng, p2.lat, p2.lng);
      }
    }
    return 0;
  }, [live.previousHalt?.stationCode, live.previousHaltCode, live.nextHalt?.stationCode, live.nextHaltCode, train, stops]);

  // ── 6. Zoom window: prev halt + train + next halt ────────────────────────
  const liveWindow = useMemo(() => {
    if (!isRunning || !animatedPosition || !window.google?.maps?.LatLngBounds) return null;
    const loc      = normalizeLive(train?.location || {});
    const prevCode = String(live.previousHalt?.stationCode || live.previousHaltCode || loc.previousHaltCode || '').toUpperCase();
    const nextCode = String(live.nextHalt?.stationCode     || live.nextHaltCode     || loc.nextHaltCode     || '').toUpperCase();

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: animatedPosition[0], lng: animatedPosition[1] });

    const addCode = (code) => {
      if (!code) return;
      const stop = stops.find(s => stationCode(s).toUpperCase() === code);
      const c = stop ? resolveStopCoords(stop) : getStationCoords(code);
      if (c) bounds.extend({ lat: c.lat, lng: c.lng });
    };
    addCode(prevCode);
    addCode(nextCode);
    return bounds.isEmpty() ? null : bounds;
  }, [isRunning, animatedPosition, live.previousHalt?.stationCode, live.previousHaltCode, live.nextHalt?.stationCode, live.nextHaltCode, stops, train]);

  // ── Effect A: Init Google Maps ────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    loadGoogleMaps()
      .then(() => {
        if (!alive || !hostRef.current || mapRef.current) return;
        // Default center = India midpoint; will be overridden by fitBounds immediately
        mapRef.current = new window.google.maps.Map(hostRef.current, {
          center:            { lat: 22.9, lng: 80 },
          zoom:              5,
          mapTypeControl:    false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling:   'greedy',
          styles: [
            { featureType: 'poi',     stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        });
        infoRef.current = new window.google.maps.InfoWindow();
        setMapStatus('ready');
      })
      .catch(e => {
        if (alive) { setMapStatus('error'); setErrorMsg(e.message || 'Google Maps failed to load'); }
      });

    return () => {
      alive = false;
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      trainMarker.current?.setMap(null);
      polylineRef.current?.setMap(null);
      mapRef.current = null;
    };
  }, []);

  // ── Effect B: Draw polyline when coords are ready ─────────────────────────
  useEffect(() => {
    if (mapStatus !== 'ready' || routeCoords.length < 2) return;

    // Persist to localStorage (24h static cache)
    if (trainNumber) saveRouteCoords(trainNumber, routeCoords.map(c => [c.lat, c.lng]));

    // Rebuild polyline
    if (polylineRef.current) polylineRef.current.setMap(null);
    polylineRef.current = new window.google.maps.Polyline({
      map:           mapRef.current,
      path:          routeCoords.map(toLatLng),
      strokeColor:   '#0d716a',
      strokeOpacity: 0.9,
      strokeWeight:  5,
      geodesic:      true,
    });

    // Fit full route once (before any live zoom override)
    if (!fittedRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      routeCoords.forEach(c => bounds.extend(toLatLng(c)));
      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });
        // Clamp zoom: not too close, not too far
        window.google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
          const z = mapRef.current?.getZoom() ?? 6;
          if (z > 12) mapRef.current.setZoom(12);
          if (z < 5)  mapRef.current.setZoom(5);
        });
      }
      fittedRef.current = true;
    }
  }, [routeCoords, mapStatus, trainNumber]);

  // ── Effect C: Station markers — ENDPOINTS ONLY ───────────────────────────
  useEffect(() => {
    if (mapStatus !== 'ready') return;

    // Clear previous markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const endpoints = stops.length > 0 ? [stops[0], stops[stops.length - 1]] : [];
    endpoints.forEach((stop) => {
      const coords = resolveStopCoords(stop);
      if (!coords) return;

      const marker = new window.google.maps.Marker({
        map:      mapRef.current,
        position: toLatLng(coords),
        title:    stationName(stop),
        icon:     makeStationIcon(true),
        label: {
          text:      stationCode(stop),
          color:     '#ffffff',
          fontSize:  '9px',
          fontWeight: 'bold',
        },
        zIndex: 30,
      });

      const etaPred = getStationEtaPredictions(train, stop);
      marker.addListener('mouseover', () => {
        infoRef.current?.setContent(htmlInfoWindow(stop, etaPred, timeFormat));
        infoRef.current?.open({ map: mapRef.current, anchor: marker });
      });
      marker.addListener('mouseout', () => infoRef.current?.close());
      markersRef.current.push(marker);
    });
  }, [stops, mapStatus, train, timeFormat]);

  // ── Effect D: Animated directional train marker ───────────────────────────
  useEffect(() => {
    if (mapStatus !== 'ready' || !animatedPosition) return;
    const pos = { lat: Number(animatedPosition[0]), lng: Number(animatedPosition[1]) };
    if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return;

    const icon = makeTrainIcon(isRunning, bearing);
    if (!trainMarker.current) {
      trainMarker.current = new window.google.maps.Marker({
        map:      mapRef.current,
        position: pos,
        title:    'Train current position',
        icon,
        zIndex:   50,
        optimized: false,
      });
    } else {
      trainMarker.current.setPosition(pos);
      trainMarker.current.setIcon(icon);
    }
  }, [animatedPosition, mapStatus, isRunning, bearing]);

  // ── Effect E: Live zoom → focus on prev+train+next segment ───────────────
  useEffect(() => {
    if (mapStatus !== 'ready' || !liveWindow || !mapRef.current) return;
    if (!liveZoomedRef.current) {
      // First time: fit and clamp zoom
      mapRef.current.fitBounds(liveWindow, { top: 100, right: 80, bottom: 100, left: 80 });
      window.google.maps.event.addListenerOnce(mapRef.current, 'idle', () => {
        const z = mapRef.current?.getZoom() ?? 8;
        if (z > 11) mapRef.current.setZoom(11);
        if (z < 7)  mapRef.current.setZoom(7);
      });
      liveZoomedRef.current = true;
    } else {
      // Subsequent: gentle pan only, no zoom change
      mapRef.current.panToBounds(liveWindow, { top: 100, right: 80, bottom: 100, left: 80 });
    }
  }, [liveWindow, mapStatus]);

  // ── Effect F: Fullscreen resize ───────────────────────────────────────────
  useEffect(() => {
    if (fullscreen) setTimeout(() => window.google?.maps?.event?.trigger(mapRef.current, 'resize'), 150);
  }, [fullscreen]);

  // ── Render ────────────────────────────────────────────────────────────────
  const hasPos    = Boolean(animatedPosition);
  const chipLabel = isRunning && hasPos ? 'Live position' : isRunning ? 'Tracking…' : 'Waiting for live status';

  if (mapStatus === 'error') {
    return (
      <div className="train-map-shell is-map-error">
        <div className="map-error-card">
          <MapPinned size={22} />
          <strong>{errorMsg}</strong>
          <span>Add <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env</code>.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`train-map-shell ${fullscreen ? 'is-fullscreen' : ''}`}>
      <div ref={hostRef} className="train-map" />

      {mapStatus === 'loading' && (
        <div className="map-loading-overlay">
          <span className="map-loading-spinner" />
        </div>
      )}

      <div className="map-status-chip">
        <Locate size={12} className={isRunning && hasPos ? 'chip-icon-live' : ''} />
        <span>{chipLabel}</span>
        {live.dataFreshnessSeconds != null && <small>{Math.round(live.dataFreshnessSeconds)}s old</small>}
        {routeCoords.length > 1 && <small className="chip-stop-count">{mainHalts.length} stations</small>}
      </div>

      {onToggleFullscreen && (
        <button className="map-fullscreen" onClick={onToggleFullscreen} aria-label="Toggle fullscreen">
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      )}

      <div className="map-floating-actions">
        <button onClick={onRefresh}><RefreshCw size={14} /> Refresh</button>
        <span>Google Maps</span>
      </div>
    </div>
  );
}
