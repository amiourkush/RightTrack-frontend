function isDateTime(value) {
  return typeof value === 'string' && /\d{4}-\d{2}-\d{2}T/.test(value);
}

function extractClockMinutes(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (isDateTime(text)) {
    const d = new Date(text);
    if (!Number.isNaN(d.getTime())) {
      const parts = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(d);
      const h = Number(parts.find((p) => p.type === 'hour')?.value);
      const m = Number(parts.find((p) => p.type === 'minute')?.value);
      if (Number.isFinite(h) && Number.isFinite(m)) {
        return h * 60 + m;
      }
    }
  }
  const clock = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*([AP]M))?$/i);
  if (clock) {
    let hour = Number(clock[1]);
    const minute = Number(clock[2]);
    const meridiem = clock[3]?.toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }
  const isoTime = text.match(/T(\d{2}):(\d{2})/);
  if (isoTime) return Number(isoTime[1]) * 60 + Number(isoTime[2]);
  return null;
}

export function getDelayMinutes(scheduled, estimated) {
  if (!scheduled || !estimated) return null;
  if (isDateTime(scheduled) && isDateTime(estimated)) {
    const diff = new Date(estimated).getTime() - new Date(scheduled).getTime();
    if (Number.isFinite(diff)) return Math.round(diff / 60000);
  }
  const a = extractClockMinutes(scheduled);
  const b = extractClockMinutes(estimated);
  if (a == null || b == null) return null;
  const candidates = [b - a, b + 1440 - a, b - 1440 - a];
  return candidates.reduce((best, current) => Math.abs(current) < Math.abs(best) ? current : best);
}


export function formatDelay(delayMinutes) {
  if (delayMinutes == null || !Number.isFinite(Number(delayMinutes))) return { label: '—', tone: 'unknown' };
  const value = Math.round(Number(delayMinutes));
  if (value === 0) return { label: 'On time', tone: 'on-time' };
  if (value < 0) return { label: `${Math.abs(value)} min early`, tone: 'early' };
  return { label: `+${value} min late`, tone: 'late' };
}

export function formatTimeOnly(value, format = 'H24') {
  if (!value) return '—';
  let hour24; let minute;
  const text = String(value).trim();
  if (isDateTime(text)) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) {
      const parts = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
      hour24 = Number(parts.find((p) => p.type === 'hour')?.value);
      minute = Number(parts.find((p) => p.type === 'minute')?.value);
    }
  }
  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    const minutes = extractClockMinutes(text);
    if (minutes == null) return '—';
    hour24 = Math.floor(minutes / 60) % 24;
    minute = minutes % 60;
  }
  if (format === 'H12') {
    const h = hour24 % 12 || 12;
    return `${h}:${String(minute).padStart(2, '0')} ${hour24 >= 12 ? 'PM' : 'AM'}`;
  }
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function addMinutesToTime(value, minutes) {
  if (!value || !Number.isFinite(Number(minutes))) return null;
  const amount = Number(minutes);
  if (isDateTime(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : new Date(d.getTime() + amount * 60000).toISOString();
  }
  const base = extractClockMinutes(value);
  if (base == null) return null;
  const next = ((base + amount) % 1440 + 1440) % 1440;
  return `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`;
}

export function isTimeAfter(a, b) {
  if (!a || !b) return false;
  if (isDateTime(a) && isDateTime(b)) {
    return new Date(a).getTime() > new Date(b).getTime();
  }
  const minA = extractClockMinutes(a);
  const minB = extractClockMinutes(b);
  if (minA == null || minB == null) return false;
  return minA > minB;
}

export function unwrapData(payload) {
  return payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data) ? payload.data : payload;
}

export function normalizeLive(payload) {
  const root = unwrapData(payload) || {};
  const current = root.currentLocation || {};
  const prevHalt = root.previousHalt || {};
  const nextHalt = root.nextHalt || {};
  const flat = { ...root };

  if (!flat.trainNumber) flat.trainNumber = root.trainNumber || null;
  if (!flat.trainName) flat.trainName = root.trainName || null;
  if (!flat.journeyDate) flat.journeyDate = root.startDate || root.journeyDate || current.startDate || current.journeyDate || null;
  if (!flat.status && current.status) flat.status = current.status;
  if (flat.delayMinutes == null) {
    flat.delayMinutes = current.delayMinutes != null ? current.delayMinutes : (root.delayMinutes ?? null);
  }

  if (flat.currentStationCode == null) {
    flat.currentStationCode = current.stationCode || current.currentStationCode || root.currentStationCode || null;
  }
  if (flat.currentStationName == null) {
    flat.currentStationName = current.stationName || current.currentStationName || root.currentStationName || null;
  }
  if (flat.currentSequence == null) {
    flat.currentSequence = current.sequence != null ? current.sequence : (root.currentSequence ?? null);
  }

  const prevCode = prevHalt.stationCode || prevHalt.code || root.previousHaltCode || root.previousStationCode || current.previousHaltCode || current.previousStationCode || null;
  const nextCode = nextHalt.stationCode || nextHalt.code || root.nextHaltCode || root.nextStationCode || current.nextHaltCode || current.nextStationCode || null;

  if (flat.previousHaltCode == null) flat.previousHaltCode = prevCode;
  if (flat.nextHaltCode == null) flat.nextHaltCode = nextCode;

  if (root.previousHalt) {
    flat.previousHalt = {
      stationCode: prevHalt.stationCode || prevHalt.code || prevCode,
      stationName: prevHalt.stationName || prevHalt.name || null,
      sequence: prevHalt.sequence != null ? Number(prevHalt.sequence) : null,
      distance: prevHalt.distance != null ? Number(prevHalt.distance) : null,
    };
  }
  if (root.nextHalt) {
    flat.nextHalt = {
      stationCode: nextHalt.stationCode || nextHalt.code || nextCode,
      stationName: nextHalt.stationName || nextHalt.name || null,
      sequence: nextHalt.sequence != null ? Number(nextHalt.sequence) : null,
      distance: nextHalt.distance != null ? Number(nextHalt.distance) : null,
    };
  }

  if (flat.segmentProgress == null) {
    flat.segmentProgress = current.segmentProgress != null ? current.segmentProgress : (root.segmentProgress ?? null);
  }
  if (flat.speedKmh == null) {
    flat.speedKmh = current.speedKmh != null ? current.speedKmh : (root.speedKmh ?? null);
  }
  if (flat.bearingDegrees == null) {
    flat.bearingDegrees = current.bearingDegrees != null ? current.bearingDegrees : (root.bearingDegrees ?? null);
  }
  if (flat.lastUpdatedAt == null) {
    flat.lastUpdatedAt = root.lastUpdatedAt || current.lastUpdatedAt || root.updatedAt || null;
  }
  if (flat.dataFreshnessSeconds == null) {
    flat.dataFreshnessSeconds = root.dataFreshnessSeconds ?? current.dataFreshnessSeconds ?? null;
  }
  if (flat.distanceFromOriginKm == null) {
    flat.distanceFromOriginKm = current.distanceFromOriginKm != null ? current.distanceFromOriginKm : (root.distanceFromOriginKm ?? null);
  }
  if (flat.distanceFromLastStationKm == null) {
    flat.distanceFromLastStationKm = current.distanceFromLastStationKm != null ? current.distanceFromLastStationKm : (root.distanceFromLastStationKm ?? null);
  }

  if (flat.isLive == null) flat.isLive = root.isLive ?? null;
  if (flat.trackingMode == null) flat.trackingMode = root.trackingMode ?? current.trackingMode ?? null;
  if (flat.positionSource == null) flat.positionSource = current.positionSource || root.positionSource || null;
  if (flat.confidenceLevel == null) flat.confidenceLevel = root.confidenceLevel ?? current.confidenceLevel ?? null;

  const lat = current.latitude != null ? current.latitude : (root.latitude ?? null);
  const lng = current.longitude != null ? current.longitude : (root.longitude ?? null);
  flat.latitude = lat;
  flat.longitude = lng;
  if (flat.locationAvailable == null) {
    flat.locationAvailable = (lat != null && lng != null && lat !== 0 && lng !== 0);
  }

  return flat;
}

export function normalizeEta(payload) {
  if (!payload) return {};
  if (Array.isArray(payload)) return { stationEtas: payload };
  const root = unwrapData(payload) || {};
  if (Array.isArray(root)) return { stationEtas: root };
  if (Array.isArray(root.stationEtas)) return root;
  if (Array.isArray(root.etas)) return { ...root, stationEtas: root.etas };
  if (root.predictions && Array.isArray(root.predictions)) return { ...root, stationEtas: root.predictions };
  return root;
}

export function getEtaEntries(etaState) {
  const root = normalizeEta(etaState);
  const candidates = [root?.stationEtas, root?.data?.stationEtas];
  for (const value of candidates) if (Array.isArray(value)) return value.filter(Boolean);
  if (root && typeof root === 'object' && !Array.isArray(root)) {
    const mapped = Object.entries(root)
      .filter(([key, value]) => value && typeof value === 'object' && !Array.isArray(value) && !['data','weights','meta'].includes(key))
      .map(([key, value]) => ({ stationCode: value.stationCode || value.code || key, ...value }));
    if (mapped.some((v) => v.predictedArrival || v.predictedDeparture)) return mapped;
  }
  return [];
}

export function findStationEta(etaState, code) {
  const target = String(code || '').trim().toUpperCase();
  if (!target) return null;
  return getEtaEntries(etaState).find((item) => String(item?.stationCode || item?.code || '').trim().toUpperCase() === target) || null;
}

export function findStationEtaFromMap(mapState, code) {
  const target = String(code || '').trim().toUpperCase();
  if (!target || !mapState) return null;
  if (Array.isArray(mapState)) return mapState.find((x) => String(x?.stationCode || x?.code || '').trim().toUpperCase() === target) || null;
  const direct = mapState[target] || mapState[code];
  return direct && typeof direct === 'object' ? direct : Object.values(mapState).find((x) => String(x?.stationCode || x?.code || '').trim().toUpperCase() === target) || null;
}

export function getRouteStops(train) {
  const details = train?.details?.routeStops;
  const route = train?.route;
  const candidates = [
    route?.properties?.routeStations,
    route?.routeStations,
    route?.route,
    route?.properties?.stops,
    route?.stops,
    details,
  ];
  for (const value of candidates) if (Array.isArray(value) && value.length) return value;
  return [];
}

function normalizeStop(stop) {
  let isHalt;
  if (typeof stop?.isHalt === 'boolean') {
    isHalt = stop.isHalt;
  } else if (stop?.isHalt === 'true' || stop?.isHalt === 1) {
    isHalt = true;
  } else if (stop?.isHalt === 'false' || stop?.isHalt === 0) {
    isHalt = false;
  } else {
    isHalt = undefined;
  }

  return {
    ...stop,
    sequence: Number(stop?.sequence ?? 0),
    stationCode: stop?.stationCode ?? stop?.code ?? stop?.station?.code ?? '',
    stationName: stop?.stationName ?? stop?.name ?? stop?.station?.name ?? stop?.code ?? '',
    isHalt,
    platform: stop?.platform ?? null,
    scheduledArrivalTime: stop?.scheduledArrivalTime ?? stop?.scheduledArrival ?? stop?.arrivalTime ?? null,
    scheduledDepartureTime: stop?.scheduledDepartureTime ?? stop?.scheduledDeparture ?? stop?.departureTime ?? null,
    actualArrivalTime: stop?.actualArrivalTime ?? stop?.actualArrival ?? null,
    actualDepartureTime: stop?.actualDepartureTime ?? stop?.actualDeparture ?? null,
    actualArrival: stop?.actualArrival ?? stop?.actualArrivalTime ?? null,
    actualDeparture: stop?.actualDeparture ?? stop?.actualDepartureTime ?? null,
    delayArrival: stop?.delayArrival != null ? Number(stop.delayArrival) : null,
    delayDeparture: stop?.delayDeparture != null ? Number(stop.delayDeparture) : null,
    status: stop?.status ?? stop?.locationStatus ?? null,
    latitude: stop?.latitude ?? stop?.lat ?? stop?.station?.lat ?? null,
    longitude: stop?.longitude ?? stop?.lng ?? stop?.station?.lng ?? null,
    distanceKm: stop?.distanceKm ?? stop?.distance ?? null,
    speedToNextStationKmph: stop?.speedToNextStationKmph ?? null,
  };
}

export function getMergedRouteStops(train) {
  const liveRoute = Array.isArray(train?.live?.route) ? train.live.route : Array.isArray(train?.route?.route) ? train.route.route : [];
  const details = Array.isArray(train?.details?.routeStops) ? train.details.routeStops : [];
  const routeStations = Array.isArray(train?.route?.routeStations) ? train.route.routeStations : Array.isArray(train?.route?.properties?.routeStations) ? train.route.properties.routeStations : [];
  const routeStops = Array.isArray(train?.route?.stops) ? train.route.stops : Array.isArray(train?.route?.properties?.stops) ? train.route.properties.stops : [];
  const rawStops = Array.isArray(train?.stops) ? train.stops : [];
  const rawStations = Array.isArray(train?.stations) ? train.stations : [];
  const rawIntermediates = Array.isArray(train?.intermediateStations)
    ? train.intermediateStations
    : Array.isArray(train?.details?.intermediateStations)
    ? train.details.intermediateStations
    : Array.isArray(train?.details?.intermediateStops)
    ? train.details.intermediateStops
    : [];

  const allSources = [liveRoute, routeStops, details, routeStations, rawStops, rawStations, rawIntermediates];
  const merged = new Map();

  for (const source of allSources) {
    for (const raw of source) {
      const stop = normalizeStop(raw);
      if (!stop.stationCode && !stop.sequence) continue;
      const key = stop.stationCode ? String(stop.stationCode).toUpperCase() : `seq-${stop.sequence}`;
      const prev = merged.get(key);
      if (!prev) {
        merged.set(key, stop);
      } else {
        merged.set(key, {
          ...prev,
          ...stop,
          sequence: prev.sequence && stop.sequence ? Math.min(prev.sequence, stop.sequence) : (prev.sequence || stop.sequence),
          stationName: (stop.stationName && stop.stationName !== stop.stationCode) ? stop.stationName : prev.stationName,
          scheduledArrivalTime: stop.scheduledArrivalTime || prev.scheduledArrivalTime,
          scheduledDepartureTime: stop.scheduledDepartureTime || prev.scheduledDepartureTime,
          actualArrivalTime: stop.actualArrivalTime || prev.actualArrivalTime || null,
          actualDepartureTime: stop.actualDepartureTime || prev.actualDepartureTime || null,
          actualArrival: stop.actualArrival || prev.actualArrival || null,
          actualDeparture: stop.actualDeparture || prev.actualDeparture || null,
          delayArrival: stop.delayArrival != null ? stop.delayArrival : prev.delayArrival,
          delayDeparture: stop.delayDeparture != null ? stop.delayDeparture : prev.delayDeparture,
          status: stop.status || prev.status,
          platform: (stop.platform != null && stop.platform !== '' && stop.platform !== '-' && stop.platform !== 'null') ? stop.platform : prev.platform,
          latitude: stop.latitude ?? prev.latitude,
          longitude: stop.longitude ?? prev.longitude,
          isHalt: stop.isHalt === false || prev.isHalt === false
            ? false
            : typeof stop.isHalt === 'boolean'
            ? stop.isHalt
            : prev.isHalt,
        });
      }
    }
  }

  // Include current live station if not already present in stops
  const live = normalizeLive(train?.live || {});
  const currentCode = String(live.currentStationCode || '').toUpperCase();
  if (currentCode && !merged.has(currentCode) && live.currentSequence) {
    merged.set(currentCode, {
      sequence: Number(live.currentSequence),
      stationCode: currentCode,
      stationName: live.currentStationName || currentCode,
      isHalt: false,
      platform: null,
      scheduledArrivalTime: null,
      scheduledDepartureTime: null,
      distanceKm: null,
      latitude: live.latitude || null,
      longitude: live.longitude || null,
    });
  }

  return [...merged.values()].sort((a, b) => {
    if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    if (a.distanceKm != null && b.distanceKm != null) return Number(a.distanceKm) - Number(b.distanceKm);
    return 0;
  });
}

export function stationCode(stop) { return stop?.stationCode || stop?.code || ''; }
export function stationName(stop) { return stop?.stationName || stop?.name || stationCode(stop) || 'Station'; }

export function isMainHalt(stop, index, allStops) {
  if (!stop) return false;
  if (!allStops || allStops.length <= 2) return true;
  if (index === 0) return true; // Origin is always main
  if (index === allStops.length - 1) return true; // Destination is always main

  // 1. Explicit non-halt: RailRadar's stop.isHalt === false is authoritative
  if (stop.isHalt === false) return false;

  // 2. Technical 0-minute pass-through stops (scheduled arrival === scheduled departure)
  // Platform presence must NOT override the fact that this is a 0-minute pass-through
  const arr = stop.scheduledArrivalTime || stop.scheduledArrival;
  const dep = stop.scheduledDepartureTime || stop.scheduledDeparture;
  if (arr && dep) {
    if (arr === dep) return false;
    const tArr = formatTimeOnly(arr);
    const tDep = formatTimeOnly(dep);
    if (tArr !== '—' && tDep !== '—' && tArr === tDep) return false;
  }

  // 3. When the route contains explicit non-halts / pass-throughs (e.g. RailRadar live route):
  // An intermediate station is MAIN if and only if it is an explicit commercial halt
  const hasDistinctPassThroughs = allStops.some((s) => s.isHalt === false);
  if (hasDistinctPassThroughs) {
    return stop.isHalt === true;
  }

  // 4. For timetable datasets where isHalt is omitted across all stops:
  return true;
}

export function getMainStops(stops) {
  if (!stops || !stops.length) return [];
  return stops.filter((s, i) => isMainHalt(s, i, stops));
}

const CORRIDOR_INTERMEDIATES = {
  'NDLS-CNB': [
    { code: 'GZB', name: 'Ghaziabad Jn', ratio: 0.06 },
    { code: 'ALJN', name: 'Aligarh Jn', ratio: 0.30 },
    { code: 'TDL', name: 'Tundla Jn', ratio: 0.48 },
    { code: 'ETW', name: 'Etawah Jn', ratio: 0.69 },
    { code: 'RURA', name: 'Rura', ratio: 0.90 },
  ],
  'CNB-NDLS': [
    { code: 'RURA', name: 'Rura', ratio: 0.10 },
    { code: 'ETW', name: 'Etawah Jn', ratio: 0.31 },
    { code: 'TDL', name: 'Tundla Jn', ratio: 0.52 },
    { code: 'ALJN', name: 'Aligarh Jn', ratio: 0.70 },
    { code: 'GZB', name: 'Ghaziabad Jn', ratio: 0.94 },
  ],
  'CNB-PRYJ': [
    { code: 'BKO', name: 'Bindki Road', ratio: 0.24 },
    { code: 'FTP', name: 'Fatehpur', ratio: 0.40 },
    { code: 'SRO', name: 'Sirathu', ratio: 0.70 },
    { code: 'BRE', name: 'Bharwari', ratio: 0.80 },
  ],
  'PRYJ-CNB': [
    { code: 'BRE', name: 'Bharwari', ratio: 0.20 },
    { code: 'SRO', name: 'Sirathu', ratio: 0.30 },
    { code: 'FTP', name: 'Fatehpur', ratio: 0.60 },
    { code: 'BKO', name: 'Bindki Road', ratio: 0.76 },
  ],
  'PRYJ-BSB': [
    { code: 'JNH', name: 'Janghai Jn', ratio: 0.43 },
    { code: 'BOY', name: 'Bhadohi', ratio: 0.67 },
  ],
  'BSB-PRYJ': [
    { code: 'BOY', name: 'Bhadohi', ratio: 0.33 },
    { code: 'JNH', name: 'Janghai Jn', ratio: 0.57 },
  ],
  'HWH-ASN': [
    { code: 'BDC', name: 'Bandel Jn', ratio: 0.19 },
    { code: 'BWN', name: 'Barddhaman Jn', ratio: 0.45 },
    { code: 'DGR', name: 'Durgapur', ratio: 0.79 },
  ],
  'ASN-HWH': [
    { code: 'DGR', name: 'Durgapur', ratio: 0.21 },
    { code: 'BWN', name: 'Barddhaman Jn', ratio: 0.55 },
    { code: 'BDC', name: 'Bandel Jn', ratio: 0.81 },
  ],
  'ASN-DHN': [
    { code: 'KMME', name: 'Kumardubi', ratio: 0.35 },
    { code: 'BRR', name: 'Barakar', ratio: 0.55 },
  ],
  'DHN-ASN': [
    { code: 'BRR', name: 'Barakar', ratio: 0.45 },
    { code: 'KMME', name: 'Kumardubi', ratio: 0.65 },
  ],
  'DHN-GAYA': [
    { code: 'GMO', name: 'NSC Bose J Gomoh', ratio: 0.15 },
    { code: 'PNME', name: 'Parasnath', ratio: 0.25 },
    { code: 'HZD', name: 'Hazaribagh Road', ratio: 0.39 },
    { code: 'KQR', name: 'Koderma Jn', ratio: 0.61 },
  ],
  'GAYA-DHN': [
    { code: 'KQR', name: 'Koderma Jn', ratio: 0.39 },
    { code: 'HZD', name: 'Hazaribagh Road', ratio: 0.61 },
    { code: 'PNME', name: 'Parasnath', ratio: 0.75 },
    { code: 'GMO', name: 'NSC Bose J Gomoh', ratio: 0.85 },
  ],
  'INDB-UJN': [
    { code: 'LMNR', name: 'Laxmibai Nagar', ratio: 0.10 },
    { code: 'DWX', name: 'Dewas Jn', ratio: 0.50 },
  ],
  'UJN-INDB': [
    { code: 'DWX', name: 'Dewas Jn', ratio: 0.50 },
    { code: 'LMNR', name: 'Laxmibai Nagar', ratio: 0.90 },
  ],
};

function interpolateIntermediatePassingStops(startStop, endStop) {
  if (!startStop || !endStop) return [];
  const startCode = String(stationCode(startStop)).toUpperCase();
  const endCode = String(stationCode(endStop)).toUpperCase();
  const key = `${startCode}-${endCode}`;

  const startDist = Number(startStop.distanceKm ?? 0);
  const endDist = Number(endStop.distanceKm ?? (startDist + 100));
  const distDiff = Math.max(10, endDist - startDist);

  const startSeq = Number(startStop.sequence ?? 1);
  const endSeq = Number(endStop.sequence ?? (startSeq + 5));

  const startDepMin = extractClockMinutes(startStop.scheduledDepartureTime || startStop.scheduledArrivalTime);
  const endArrMin = extractClockMinutes(endStop.scheduledArrivalTime || endStop.scheduledDepartureTime);
  let totalTransitMin = 60;
  if (startDepMin != null && endArrMin != null) {
    totalTransitMin = ((endArrMin - startDepMin) % 1440 + 1440) % 1440;
    if (totalTransitMin === 0) totalTransitMin = Math.round((distDiff / 75) * 60) || 60;
  }

  const corridorEntries = CORRIDOR_INTERMEDIATES[key];
  if (corridorEntries && corridorEntries.length > 0) {
    return corridorEntries.map((item, idx) => {
      const d = Math.round(startDist + distDiff * item.ratio);
      const seq = startSeq < endSeq
        ? Math.round(startSeq + (endSeq - startSeq) * item.ratio)
        : startSeq + idx + 1;

      let passTime = null;
      if (startDepMin != null) {
        const passMin = (startDepMin + Math.round(totalTransitMin * item.ratio)) % 1440;
        const h = Math.floor(passMin / 60);
        const m = passMin % 60;
        passTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      return {
        sequence: seq,
        stationCode: item.code,
        stationName: item.name,
        isHalt: false,
        platform: null,
        distanceKm: d,
        scheduledArrivalTime: passTime,
        scheduledDepartureTime: passTime,
        latitude: null,
        longitude: null,
        isPassingOnly: true,
      };
    });
  }

  // General intermediate interpolation if distance is substantial (>= 30 km) or sequence has gap
  if (distDiff >= 30 || Math.abs(endSeq - startSeq) >= 4) {
    const steps = distDiff > 120 ? 3 : 2;
    const items = [];
    for (let i = 1; i <= steps; i++) {
      const ratio = i / (steps + 1);
      const d = Math.round(startDist + distDiff * ratio);
      const seq = startSeq < endSeq ? Math.round(startSeq + (endSeq - startSeq) * ratio) : startSeq + i;

      let passTime = null;
      if (startDepMin != null) {
        const passMin = (startDepMin + Math.round(totalTransitMin * ratio)) % 1440;
        const h = Math.floor(passMin / 60);
        const m = passMin % 60;
        passTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }

      items.push({
        sequence: seq,
        stationCode: `${startCode}P${i}`,
        stationName: `${stationName(startStop)} Cabin ${i}`,
        isHalt: false,
        platform: null,
        distanceKm: d,
        scheduledArrivalTime: passTime,
        scheduledDepartureTime: passTime,
        latitude: null,
        longitude: null,
        isPassingOnly: true,
      });
    }
    return items;
  }

  return [];
}

export function getMainSections(stops) {
  if (!stops || !stops.length) return [];
  if (stops.length <= 2) {
    return stops.map((stop, i) => {
      const next = stops[i + 1] || null;
      const intermediate = next ? interpolateIntermediatePassingStops(stop, next) : [];
      return {
        main: stop,
        index: i,
        next,
        intermediate,
      };
    });
  }

  // Authoritative main classification: strictly use isMainHalt without artificial gap promotion
  const mains = stops
    .map((stop, index) => ({ stop, index }))
    .filter((item) => isMainHalt(item.stop, item.index, stops));

  return mains.map((item, i) => {
    const nextStop = mains[i + 1]?.stop || null;
    let intermediate = stops.slice(item.index + 1, mains[i + 1]?.index ?? stops.length);

    // If no intermediate stations from raw timetable, interpolate passing stations so clicking always opens
    if ((!intermediate || intermediate.length === 0) && nextStop) {
      intermediate = interpolateIntermediatePassingStops(item.stop, nextStop);
    }

    return {
      main: item.stop,
      index: item.index,
      next: nextStop,
      intermediate: intermediate || [],
    };
  });
}


export function getTotalDistance(train) {
  if (!train) return null;
  const details = train?.details || train;
  const stops = getMergedRouteStops(train);
  const total = Number(details?.distanceKm ?? stops.at(-1)?.distanceKm ?? 0);
  return total > 0 ? total : null;
}

export function getDistanceCovered(train) {
  if (!train) return null;
  const live = normalizeLive(train.live || {});
  const location = normalizeLive(train.location || {});
  const details = train.details || train;
  const stops = getMergedRouteStops(train);
  const total = Number(details.distanceKm ?? stops.at(-1)?.distanceKm ?? 0);

  const status = String(live.status || '').toUpperCase();
  if (/COMPLET|TERMINAT/.test(status) && total > 0) return total;
  if (/NOT[_ -]?START|SCHEDULED|UPCOMING|YET/.test(status)) return 0;

  // Layer 1: Direct backend distance properties
  const direct =
    live.distanceFromOriginKm ??
    live.distanceCoveredKm ??
    live.distanceCovered ??
    live.distanceTravelledKm ??
    live.distanceTravelled ??
    live.totalDistanceCovered ??
    live.totalDistanceTravelled ??
    location.distanceFromOriginKm ??
    location.distanceCoveredKm ??
    location.distanceTravelledKm;
  if (direct != null && Number.isFinite(Number(direct))) {
    return Math.min(total || Infinity, Math.max(0, Number(direct)));
  }

  // Layer 2: Previous halt code & Next halt code from backend telemetry
  const prevCode = String(live.previousHaltCode || location.previousHaltCode || '').toUpperCase();
  const nextCode = String(live.nextHaltCode || location.nextHaltCode || '').toUpperCase();
  const prevStopByCode = prevCode ? stops.find((s) => stationCode(s).toUpperCase() === prevCode) : null;
  const nextStopByCode = nextCode ? stops.find((s) => stationCode(s).toUpperCase() === nextCode) : null;
  const segProgress = Math.max(0, Math.min(1, Number(live.segmentProgress ?? location.segmentProgress ?? 0)));

  if (prevStopByCode && prevStopByCode.distanceKm != null) {
    const pDist = Number(prevStopByCode.distanceKm);
    if (nextStopByCode && nextStopByCode.distanceKm != null) {
      const nDist = Number(nextStopByCode.distanceKm);
      const computed = pDist + (nDist - pDist) * (segProgress || 0.5);
      return total > 0 ? Math.min(total, Math.max(0, computed)) : computed;
    }
    return total > 0 ? Math.min(total, pDist) : pDist;
  }

  // Layer 3: Sequence interpolation
  const seq = getLiveSequence(train) || Number(live.currentSequence ?? location.currentSequence ?? 0);
  if (seq > 0 && stops.length > 0) {
    const exact = stops.find((s) => Number(s.sequence) === seq);
    if (exact && exact.distanceKm != null) {
      const curDist = Number(exact.distanceKm);
      const next = stops.find((s) => Number(s.sequence) > seq && s.distanceKm != null);
      if (next && next.distanceKm != null && segProgress > 0) {
        const computed = curDist + (Number(next.distanceKm) - curDist) * segProgress;
        return total > 0 ? Math.min(total, Math.max(0, computed)) : computed;
      }
      return total > 0 ? Math.min(total, curDist) : curDist;
    }

    const passedStops = stops.filter((s) => Number(s.sequence) <= seq && s.distanceKm != null);
    const futureStops = stops.filter((s) => Number(s.sequence) > seq && s.distanceKm != null);
    const lastPassed = passedStops.at(-1);
    const firstFuture = futureStops[0];

    if (lastPassed && firstFuture) {
      const pSeq = Number(lastPassed.sequence);
      const fSeq = Number(firstFuture.sequence);
      const seqRatio = fSeq > pSeq ? (seq - pSeq) / (fSeq - pSeq) : 0;
      const progress = segProgress > 0 ? segProgress : seqRatio;
      const pDist = Number(lastPassed.distanceKm);
      const fDist = Number(firstFuture.distanceKm);
      const computed = pDist + (fDist - pDist) * progress;
      return total > 0 ? Math.min(total, Math.max(0, computed)) : computed;
    }

    if (lastPassed) {
      return total > 0 ? Math.min(total, Number(lastPassed.distanceKm)) : Number(lastPassed.distanceKm);
    }
  }

  // Layer 4: Station code match
  const code = String(live.currentStationCode || location.currentStationCode || '').toUpperCase();
  if (code) {
    const byCode = stops.find((s) => stationCode(s).toUpperCase() === code);
    if (byCode && byCode.distanceKm != null) {
      return total > 0 ? Math.min(total, Number(byCode.distanceKm)) : Number(byCode.distanceKm);
    }
  }

  // Layer 5: Fallback when train is active running
  const isRunning = /RUN|DELAY|LATE|EARLY|ACTIVE|EN[_ -]?ROUTE|ON[_ -]?TIME/.test(status);
  if (isRunning && total > 0) {
    if (segProgress > 0) return Math.round(total * segProgress);
    return Math.round(total * 0.4);
  }

  return null;
}

export function getLiveSpeed(train) {
  if (!train) return null;
  const live = normalizeLive(train.live || {});
  const location = normalizeLive(train.location || {});
  const status = String(live.status || '').toUpperCase();

  if (/NOT[_ -]?START|SCHEDULED|UPCOMING|YET|COMPLET|TERMINAT|CANCEL/.test(status)) {
    return 0;
  }

  if (live.speedKmh != null && Number.isFinite(Number(live.speedKmh))) {
    return Number(live.speedKmh);
  }
  if (location.speedKmh != null && Number.isFinite(Number(location.speedKmh))) {
    return Number(location.speedKmh);
  }

  const stops = getMergedRouteStops(train);
  const sequence = getLiveSequence(train);
  const currentStop = stops.find((s) => Number(s.sequence) === sequence);
  if (currentStop?.speedToNextStationKmph != null && Number.isFinite(Number(currentStop.speedToNextStationKmph))) {
    return Number(currentStop.speedToNextStationKmph);
  }

  const isRunning = /RUN|DELAY|LATE|EARLY|ACTIVE|EN[_ -]?ROUTE|ON[_ -]?TIME/.test(status);
  const progress = Number(live.segmentProgress ?? location.segmentProgress ?? 0);
  if (isRunning) {
    if (progress > 0 && progress < 1) {
      return 65;
    }
    return 0;
  }

  return null;
}

export function isTrainRunning(train) {
  const live = normalizeLive(train?.live || {});
  const status = String(live.status || '').trim().toUpperCase();
  return status === 'RUNNING';
}

export function getTrainDelayInfo(train) {
  if (!train) return { minutes: null, label: '—', tone: 'unknown', isLate: false, isEarly: false, isOnTime: false };
  const live = normalizeLive(train.live || {});
  const status = String(live.status || '').trim().toUpperCase();
  const isRunning = status === 'RUNNING';
  const isCompleted = /COMPLET|TERMINAT/.test(status);

  // If train is not running and not completed (e.g. not started, cancelled, etc.)
  if (!isRunning && !isCompleted) {
    return { minutes: null, label: '...', tone: 'unknown', isLate: false, isEarly: false, isOnTime: false };
  }

  const mlEta = train.mlEta || {};
  const rawMinutes =
    live.delayMinutes ??
    mlEta.current_live_delay_minutes ??
    mlEta.predicted_final_delay_minutes;

  if (rawMinutes == null || !Number.isFinite(Number(rawMinutes))) {
    return { minutes: null, label: '—', tone: 'unknown', isLate: false, isEarly: false, isOnTime: false };
  }

  const minutes = Math.round(Number(rawMinutes));
  if (minutes === 0) {
    return { minutes: 0, label: 'On time', tone: 'on-time', isLate: false, isEarly: false, isOnTime: true };
  }
  if (minutes < 0) {
    const abs = Math.abs(minutes);
    return { minutes, label: `${abs} min early`, tone: 'early', isLate: false, isEarly: true, isOnTime: false };
  }

  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  const label = hrs > 0 ? (rem > 0 ? `+${hrs} hr ${rem} min late` : `+${hrs} hr late`) : `+${minutes} min late`;
  return { minutes, label, tone: 'late', isLate: true, isEarly: false, isOnTime: false };
}

/**
 * Distance-Based Future Station Predictions Resolver
 *
 * Implements Prompt Sections 4-11 & 14:
 * - Train MUST be running (status === 'running')
 * - Destination anchor: ML predicted_destination_eta
 * - Distance formula: fraction = (stopDist - currDist) / (destDist - currDist)
 *   delay = currDelay + fraction * (destDelay - currDelay)
 * - Departure: if late -> predictedArrival + haltDuration; else -> scheduledDeparture
 * - Past stations: use actual RailRadar station-level data
 * - Main stations only: intermediate pass-through stations get no predictions
 */
export function calculateFutureStationPredictions(train, mlPrediction) {
  if (!train) return {};
  const live = normalizeLive(train.live || {});
  const status = String(live.status || '').trim().toUpperCase();

  // Rule 4: If not running, DO NOT perform future station ETA distribution
  if (status !== 'RUNNING') {
    return {};
  }

  const allStops = getMergedRouteStops(train);
  if (!allStops || allStops.length === 0) return {};

  const currentDelayMinutes = typeof live.delayMinutes === 'number' ? live.delayMinutes : Number(live.delayMinutes || 0);
  const predictedFinalDelay = Number(
    mlPrediction?.predicted_final_delay_minutes ??
    mlPrediction?.predictedFinalDelayMinutes ??
    currentDelayMinutes
  );
  const destEta = mlPrediction?.predicted_destination_eta || mlPrediction?.predictedDestinationEta || null;

  // Current train distance and sequence along route
  const currentCoveredDist = getDistanceCovered(train) ?? Number(live.distanceFromOriginKm ?? 0);
  const currentSeq = getLiveSequence(train) || Number(live.currentSequence ?? 0);

  // Helper to convert stop times to absolute scheduled minutes for time-based fraction calculation
  function getStopScheduledEpochMinutes(s, prevEpoch = 0) {
    const time = s.scheduledArrivalTime || s.scheduledArrival || s.scheduledDepartureTime || s.scheduledDeparture;
    if (!time) return null;
    if (isDateTime(time)) {
      const ms = new Date(time).getTime();
      if (!Number.isNaN(ms)) return ms / 60000;
    }
    const clock = extractClockMinutes(time);
    if (clock == null) return null;
    if (prevEpoch > 0) {
      let candidate = Math.floor(prevEpoch / 1440) * 1440 + clock;
      while (candidate < prevEpoch - 120) candidate += 1440;
      return candidate;
    }
    return clock;
  }

  let runningEpoch = 0;
  const stopsWithEpoch = allStops.map((s) => {
    const epoch = getStopScheduledEpochMinutes(s, runningEpoch);
    if (epoch != null) runningEpoch = epoch;
    return {
      ...s,
      scheduledEpochMinutes: epoch,
    };
  });

  // Identify active segment where the train is currently running
  let prevStopIdx = stopsWithEpoch.findIndex((s) => s.sequence === currentSeq);
  if (prevStopIdx < 0 && currentCoveredDist > 0) {
    prevStopIdx = stopsWithEpoch.findIndex((s) => Number(s.distanceKm || 0) >= currentCoveredDist) - 1;
  }
  if (prevStopIdx < 0) prevStopIdx = 0;
  const nextStopIdx = Math.min(stopsWithEpoch.length - 1, prevStopIdx + 1);

  const prevStop = stopsWithEpoch[prevStopIdx];
  const nextStop = stopsWithEpoch[nextStopIdx];

  // Destination stop
  const destStop = [...stopsWithEpoch].reverse().find((s) => s.isHalt !== false) || stopsWithEpoch.at(-1);
  const totalRouteDist = Number(destStop?.distanceKm ?? stopsWithEpoch.at(-1)?.distanceKm ?? 0);
  const remTotalDist = Math.max(1, totalRouteDist - currentCoveredDist);

  // Section 8: Current segment handling using segmentProgress
  let segProg = live.segmentProgress != null ? Number(live.segmentProgress) : null;
  if (segProg == null || Number.isNaN(segProg) || segProg < 0) {
    const prevDist = Number(prevStop.distanceKm || 0);
    const nextDist = Number(nextStop.distanceKm || 0);
    if (nextDist > prevDist && currentCoveredDist >= prevDist) {
      segProg = (currentCoveredDist - prevDist) / (nextDist - prevDist);
    } else {
      segProg = 0;
    }
  }
  segProg = Math.max(0, Math.min(1, segProg));

  const prevDepEpoch = prevStop.scheduledEpochMinutes;
  const nextArrEpoch = nextStop.scheduledEpochMinutes;
  const segScheduledDuration = Math.max(1, (nextArrEpoch != null && prevDepEpoch != null) ? Math.max(0, nextArrEpoch - prevDepEpoch) : 2);
  const remCurrentSegmentTime = segScheduledDuration * (1 - segProg);

  // Section 7: Scheduled remaining travel duration from CURRENT TRAIN POSITION to any target stop
  function getRemainingScheduledTime(targetStop) {
    if (!targetStop) return 0;
    if (targetStop.sequence <= prevStop.sequence) return 0;
    if (targetStop.sequence === nextStop.sequence) {
      return remCurrentSegmentTime;
    }
    const additionalScheduled = Math.max(0, (targetStop.scheduledEpochMinutes || 0) - (nextStop.scheduledEpochMinutes || 0));
    return remCurrentSegmentTime + additionalScheduled;
  }

  const remTimeToDest = Math.max(1, getRemainingScheduledTime(destStop));

  const predictionsMap = {};

  allStops.forEach((stop, idx) => {
    const code = stationCode(stop).toUpperCase();
    if (!code) return;

    const isMain = isMainHalt(stop, idx, allStops);
    const stopSeq = Number(stop.sequence || (idx + 1));
    const stopDist = Number(stop.distanceKm ?? 0);

    // Is this station already passed?
    const isPassed = (currentSeq > 0 && stopSeq < currentSeq) ||
      (currentCoveredDist > 0 && stopDist > 0 && stopDist < currentCoveredDist - 0.5) ||
      stop.locationStatus === 'departed' ||
      stop.status === 'departed' ||
      stop.hasDeparted === true ||
      Boolean(stop.actualDeparture || stop.actualDepartureTime);

    // Is this the current station?
    const isCurrent = !isPassed && ((currentSeq > 0 && stopSeq === currentSeq) ||
      (String(live.currentStationCode || '').toUpperCase() === code));

    if (isPassed) {
      // Past station (Section 15): use actual RailRadar station-level data
      const actArr = stop.actualArrival || stop.actualArrivalTime || null;
      const actDep = stop.actualDeparture || stop.actualDepartureTime || null;
      const delArr = stop.delayArrival != null ? Number(stop.delayArrival) : null;
      const delDep = stop.delayDeparture != null ? Number(stop.delayDeparture) : null;
      const stationDelay = delDep != null ? delDep : (delArr != null ? delArr : 0);

      predictionsMap[code] = {
        stationCode: code,
        stationName: stationName(stop),
        isMain,
        isPast: true,
        actualArrival: actArr,
        actualDeparture: actDep,
        predictedArrival: actArr || stop.scheduledArrivalTime,
        predictedDeparture: actDep || stop.scheduledDepartureTime,
        delayArrival: delArr,
        delayDeparture: delDep,
        predictedDelayMinutes: stationDelay,
        predictionSource: 'ACTUAL_HISTORY',
      };
      return;
    }

    if (isCurrent) {
      // Current station: current delay from data.delayMinutes
      const schedArr = stop.scheduledArrivalTime;
      const schedDep = stop.scheduledDepartureTime;
      const haltMinutes = (schedArr && schedDep) ? Math.max(0, getDelayMinutes(schedArr, schedDep) || 0) : 0;
      const predictedArrival = schedArr ? addMinutesToTime(schedArr, currentDelayMinutes) : null;
      let predictedDeparture = schedDep ? addMinutesToTime(schedDep, currentDelayMinutes) : null;
      if (predictedArrival && schedArr && haltMinutes > 0) {
        const fromHalt = addMinutesToTime(predictedArrival, haltMinutes);
        if (schedDep && isTimeAfter(fromHalt, schedDep)) {
          predictedDeparture = fromHalt;
        } else if (schedDep) {
          predictedDeparture = schedDep;
        }
      }

      predictionsMap[code] = {
        stationCode: code,
        stationName: stationName(stop),
        isMain,
        isCurrent: true,
        predictedArrival,
        predictedDeparture,
        predictedDelayMinutes: currentDelayMinutes,
        predictionSource: 'CURRENT_LIVE',
      };
      return;
    }

    // Section 8: Only genuine MAIN stations receive future ML ETA predictions
    if (!isMain) {
      predictionsMap[code] = {
        stationCode: code,
        stationName: stationName(stop),
        isMain: false,
        isFuture: true,
        predictedArrival: null,
        predictedDeparture: null,
        predictedDelayMinutes: null,
        predictionSource: 'INTERMEDIATE_PASS_THROUGH',
      };
      return;
    }

    // Future station: Scheduled Travel-Time-based calculation (Section 4, 7, 8, 9, 10, 11)
    const isDestination = (idx === allStops.length - 1) || (code === stationCode(destStop).toUpperCase());
    let predictedArrival = null;
    let predictedDelayMinutes;

    if (isDestination && destEta) {
      // Section 11: Destination anchor
      predictedArrival = destEta;
      predictedDelayMinutes = predictedFinalDelay;
    } else {
      const remTimeToStation = getRemainingScheduledTime(stopsWithEpoch[idx]);
      const distFromCurr = Math.max(0, stopDist - currentCoveredDist);
      const fallbackDistFraction = remTotalDist > 0 ? Math.max(0, Math.min(1, distFromCurr / remTotalDist)) : 1;
      const fraction = remTimeToDest > 1 ? Math.max(0, Math.min(1, remTimeToStation / remTimeToDest)) : fallbackDistFraction;
      const calcDelay = currentDelayMinutes + fraction * (predictedFinalDelay - currentDelayMinutes);

      // Section 10: Keep as decimal internally
      predictedDelayMinutes = calcDelay;

      if (stop.scheduledArrivalTime) {
        predictedArrival = addMinutesToTime(stop.scheduledArrivalTime, calcDelay);
      }
    }

    // Departure calculation (Section 8)
    let predictedDeparture = null;
    const schedArr = stop.scheduledArrivalTime;
    const schedDep = stop.scheduledDepartureTime;

    if (schedDep) {
      const haltMinutes = (schedArr && schedDep) ? Math.max(0, getDelayMinutes(schedArr, schedDep) || 0) : 0;
      const isLate = (predictedArrival && schedArr) ? (getDelayMinutes(schedArr, predictedArrival) > 0) : false;
      if (predictedArrival && isLate) {
        predictedDeparture = addMinutesToTime(predictedArrival, haltMinutes);
      } else {
        predictedDeparture = schedDep;
      }
      if (schedDep && isTimeAfter(schedDep, predictedDeparture)) {
        predictedDeparture = schedDep;
      }
    }

    predictionsMap[code] = {
      stationCode: code,
      stationName: stationName(stop),
      isMain,
      isFuture: true,
      predictedArrival,
      predictedDeparture,
      predictedDelayMinutes,
      predictionSource: isDestination ? 'ML_DESTINATION_ANCHOR' : 'DISTANCE_RATIO_PREDICTION',
    };
  });

  return predictionsMap;
}

export function getStationEtaPredictions(train, stop) {
  if (!stop) {
    return {
      arrivalEta: null,
      departureEta: null,
      delayMinutes: null,
      arrivalTone: 'unknown',
      departureTone: 'unknown',
      generalTone: 'unknown',
      delayLabel: '...',
      arrivalDelayLabel: '...',
      departureDelayLabel: '...',
    };
  }

  const live = normalizeLive(train?.live || {});
  const status = String(live.status || '').trim().toUpperCase();
  const isRunning = status === 'RUNNING';
  const isCompleted = /COMPLET|TERMINAT/.test(status);
  const code = stationCode(stop).toUpperCase();
  const isPastStop = stop.status === 'departed' || stop.locationStatus === 'departed' || Boolean(stop.actualArrival || stop.actualDeparture);

  // Section 18: If train is NOT running (and not completed):
  // Past actual information may continue to display normally.
  // Future MAIN arrival/departure = "..."
  if (!isRunning && !isCompleted && !isPastStop) {
    return {
      arrivalEta: null,
      departureEta: null,
      delayMinutes: null,
      arrivalTone: 'unknown',
      departureTone: 'unknown',
      generalTone: 'unknown',
      delayLabel: '...',
      arrivalDelayLabel: '...',
      departureDelayLabel: '...',
    };
  }

  // Look for precalculated prediction in train.stationEtas or train.eta
  const explicit = findStationEta(train?.eta, code) || findStationEtaFromMap(train?.stationEtas, code);

  if (explicit) {
    const schedArr = stop.scheduledArrivalTime;
    const schedDep = stop.scheduledDepartureTime;

    if (explicit.isPast) {
      // Section 9, 10: Passed stations - preserve RailRadar actual observed data
      const arrEta = explicit.actualArrival || stop.actualArrival || explicit.predictedArrival || stop.scheduledArrivalTime;
      const depEta = explicit.actualDeparture || stop.actualDeparture || explicit.predictedDeparture || stop.scheduledDepartureTime;

      const arrDelay = explicit.delayArrival != null
        ? Number(explicit.delayArrival)
        : (stop.delayArrival != null
          ? Number(stop.delayArrival)
          : (schedArr && arrEta ? getDelayMinutes(schedArr, arrEta) : 0));

      const depDelay = explicit.delayDeparture != null
        ? Number(explicit.delayDeparture)
        : (stop.delayDeparture != null
          ? Number(stop.delayDeparture)
          : (schedDep && depEta ? getDelayMinutes(schedDep, depEta) : 0));

      const generalDelay = depDelay != null ? depDelay : arrDelay;

      const arrivalTone = arrDelay > 0 ? 'late' : arrDelay < 0 ? 'early' : 'on-time';
      const departureTone = depDelay > 0 ? 'late' : depDelay < 0 ? 'early' : 'on-time';

      const formattedGeneral = formatDelay(generalDelay);
      const formattedArr = formatDelay(arrDelay);
      const formattedDep = formatDelay(depDelay);

      return {
        arrivalEta: arrEta,
        departureEta: depEta,
        delayMinutes: generalDelay,
        arrivalTone,
        departureTone,
        generalTone: formattedGeneral.tone,
        delayLabel: formattedGeneral.label,
        arrivalDelayLabel: formattedArr.label,
        departureDelayLabel: formattedDep.label,
      };
    }

    // Future or Current Station (Section 7, 8):
    if (explicit.isFuture && !explicit.isMain) {
      return {
        arrivalEta: null,
        departureEta: null,
        delayMinutes: null,
        arrivalTone: 'unknown',
        departureTone: 'unknown',
        generalTone: 'unknown',
        delayLabel: '...',
        arrivalDelayLabel: '...',
        departureDelayLabel: '...',
      };
    }

    // Do NOT trust RailRadar placeholder delayArrival: 0.
    // The delay badge MUST be derived directly from predicted vs scheduled timestamps.
    const arrEta = explicit.predictedArrival || null;
    const depEta = explicit.predictedDeparture || null;

    let arrDelay = null;
    if (schedArr && arrEta) {
      arrDelay = getDelayMinutes(schedArr, arrEta);
    } else if (explicit.predictedDelayMinutes != null) {
      arrDelay = Number(explicit.predictedDelayMinutes);
    }

    let depDelay = null;
    if (schedDep && depEta) {
      depDelay = getDelayMinutes(schedDep, depEta);
    } else if (explicit.predictedDelayMinutes != null) {
      depDelay = Number(explicit.predictedDelayMinutes);
    }

    const generalDelay = explicit.predictedDelayMinutes != null
      ? Number(explicit.predictedDelayMinutes)
      : (arrDelay != null ? arrDelay : (depDelay != null ? depDelay : 0));

    const arrivalTone = arrDelay != null
      ? (arrDelay > 0 ? 'late' : arrDelay < 0 ? 'early' : 'on-time')
      : 'unknown';

    const departureTone = depDelay != null
      ? (depDelay > 0 ? 'late' : depDelay < 0 ? 'early' : 'on-time')
      : 'unknown';

    const formattedGeneral = generalDelay != null ? formatDelay(generalDelay) : { label: '...', tone: 'unknown' };
    const formattedArr = arrDelay != null ? formatDelay(arrDelay) : { label: '...', tone: 'unknown' };
    const formattedDep = depDelay != null ? formatDelay(depDelay) : { label: '...', tone: 'unknown' };

    return {
      arrivalEta: arrEta,
      departureEta: depEta,
      delayMinutes: generalDelay,
      arrivalTone,
      departureTone,
      generalTone: formattedGeneral.tone,
      delayLabel: formattedGeneral.label,
      arrivalDelayLabel: formattedArr.label,
      departureDelayLabel: formattedDep.label,
    };
  }

  // Fallback if no explicit entry exists:
  // For passed stations, preserve actual observed timing and delays
  if (isPastStop) {
    const arrEta = stop.actualArrival || stop.actualArrivalTime || stop.scheduledArrivalTime;
    const depEta = stop.actualDeparture || stop.actualDepartureTime || stop.scheduledDepartureTime;
    const arrDelay = stop.delayArrival != null
      ? Number(stop.delayArrival)
      : (stop.scheduledArrivalTime && arrEta ? getDelayMinutes(stop.scheduledArrivalTime, arrEta) : 0);
    const depDelay = stop.delayDeparture != null
      ? Number(stop.delayDeparture)
      : (stop.scheduledDepartureTime && depEta ? getDelayMinutes(stop.scheduledDepartureTime, depEta) : 0);
    const generalDelay = depDelay != null ? depDelay : arrDelay;

    const arrivalTone = arrDelay > 0 ? 'late' : arrDelay < 0 ? 'early' : 'on-time';
    const departureTone = depDelay > 0 ? 'late' : depDelay < 0 ? 'early' : 'on-time';
    const formattedGeneral = formatDelay(generalDelay);
    const formattedArr = formatDelay(arrDelay);
    const formattedDep = formatDelay(depDelay);

    return {
      arrivalEta: arrEta,
      departureEta: depEta,
      delayMinutes: generalDelay,
      arrivalTone,
      departureTone,
      generalTone: formattedGeneral.tone,
      delayLabel: formattedGeneral.label,
      arrivalDelayLabel: formattedArr.label,
      departureDelayLabel: formattedDep.label,
    };
  }

  return {
    arrivalEta: null,
    departureEta: null,
    delayMinutes: null,
    arrivalTone: 'unknown',
    departureTone: 'unknown',
    generalTone: 'unknown',
    delayLabel: '...',
    arrivalDelayLabel: '...',
    departureDelayLabel: '...',
  };
}

export function getNextStation(train) {
  if (!train) return null;
  const stops = getMergedRouteStops(train);
  if (!stops.length) return null;

  const live = normalizeLive(train.live || {});
  const status = String(live.status || '').toUpperCase();
  const notStarted = /NOT[_ -]?START|SCHEDULED|UPCOMING|YET/.test(status);
  const completed = /COMPLET|TERMINAT/.test(status);

  if (completed) {
    return stops.at(-1);
  }
  if (notStarted) {
    return stops[1] || stops[0];
  }

  // 1. By sequence
  const sequence = getLiveSequence(train) || Number(live.currentSequence || 0);
  if (sequence > 0) {
    const nextBySeq = stops.find((s) => Number(s.sequence) > sequence);
    if (nextBySeq) return nextBySeq;
  }

  // 2. By distance covered
  const covered = getDistanceCovered(train) ?? Number(live.distanceFromOriginKm ?? 0);
  if (covered != null && covered > 0) {
    const nextByDist = stops.find((s) => s.distanceKm != null && Number(s.distanceKm) > covered);
    if (nextByDist) return nextByDist;
  }

  // 3. By nextHaltCode
  const nextCode = String(live.nextHaltCode || '').toUpperCase();
  if (nextCode) {
    const nextByCode = stops.find((s) => stationCode(s).toUpperCase() === nextCode);
    if (nextByCode) return nextByCode;
  }

  return stops[1] || stops.at(-1);
}


export function getNextMainStation(train) {
  if (!train) return null;
  const stops = getMergedRouteStops(train);
  if (!stops.length) return null;
  const sections = getMainSections(stops);
  if (!sections.length) return stops[0];

  const live = normalizeLive(train.live || {});
  const status = String(live.status || '').toUpperCase();
  const notStarted = /NOT[_ -]?START|SCHEDULED|UPCOMING|YET/.test(status);
  const completed = /COMPLET|TERMINAT/.test(status);

  if (completed) {
    return sections.at(-1)?.main || stops.at(-1);
  }
  if (notStarted) {
    return sections[1]?.main || sections[0]?.main || stops[0];
  }

  // 1. By sequence (strictly next main station ahead of current sequence)
  const sequence = getLiveSequence(train) || Number(live.currentSequence || 0);
  if (sequence > 0) {
    const nextMainBySeq = sections.find((s) => Number(s.main.sequence) > sequence);
    if (nextMainBySeq) return nextMainBySeq.main;
  }

  // 2. By distance covered (strictly next main station ahead of current distance)
  const covered = getDistanceCovered(train) ?? Number(live.distanceFromOriginKm ?? 0);
  if (covered != null && covered > 0) {
    const nextMainByDist = sections.find((s) => s.main.distanceKm != null && Number(s.main.distanceKm) > covered + 0.1);
    if (nextMainByDist) return nextMainByDist.main;
  }

  // 3. If nextHaltCode matches a station
  const nextCode = String(live.nextHaltCode || '').toUpperCase();
  if (nextCode) {
    const directMain = sections.find((s) => stationCode(s.main).toUpperCase() === nextCode);
    if (directMain) return directMain.main;

    const sectionWithInter = sections.find((s) => s.intermediate.some((m) => stationCode(m).toUpperCase() === nextCode));
    if (sectionWithInter && sectionWithInter.next) return sectionWithInter.next;
  }

  // Fallback to next section
  return sections[1]?.main || sections.at(-1)?.main || stops.at(-1);
}

export function getNextMainStationDelay(train) {
  if (!train) return { minutes: null, label: '...', tone: 'unknown', isLate: false, isEarly: false, isOnTime: false, station: null, stationName: '' };
  const nextStation = getNextMainStation(train);
  const running = isTrainRunning(train);

  if (!running) {
    return {
      minutes: null,
      label: '...',
      tone: 'unknown',
      isLate: false,
      isEarly: false,
      isOnTime: false,
      station: nextStation,
      stationName: nextStation ? stationName(nextStation) : '',
      stationCode: nextStation ? stationCode(nextStation) : '',
    };
  }

  const trainDelay = getTrainDelayInfo(train);
  if (!nextStation) return { ...trainDelay, station: null, stationName: '' };

  const etaPred = getStationEtaPredictions(train, nextStation);
  const rawMinutes = (etaPred && etaPred.delayMinutes != null && Number.isFinite(Number(etaPred.delayMinutes)))
    ? etaPred.delayMinutes
    : trainDelay.minutes;

  if (rawMinutes == null || !Number.isFinite(Number(rawMinutes))) {
    return {
      minutes: null,
      label: '...',
      tone: 'unknown',
      isLate: false,
      isEarly: false,
      isOnTime: false,
      station: nextStation,
      stationName: stationName(nextStation),
      stationCode: stationCode(nextStation),
    };
  }

  const minutes = Math.round(Number(rawMinutes));
  const formatted = formatDelay(minutes);
  return {
    station: nextStation,
    stationName: stationName(nextStation),
    stationCode: stationCode(nextStation),
    minutes,
    label: formatted.label,
    tone: formatted.tone,
    isLate: minutes > 0,
    isEarly: minutes < 0,
    isOnTime: minutes === 0,
  };
}

export function getLiveSequence(train) {
  const live = normalizeLive(train?.live || {});
  const location = normalizeLive(train?.location || {});
  const explicit = Number(live.currentSequence ?? location.currentSequence);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const code = live.currentStationCode || location.currentStationCode;
  if (code) {
    const found = getMergedRouteStops(train).find((stop) => stationCode(stop).toUpperCase() === String(code).toUpperCase());
    if (found) return Number(found.sequence) || 0;
  }
  return 0;
}

export function getCurrentPositionTarget(train) {
  const live = normalizeLive(train?.live || {});
  const location = normalizeLive(train?.location || {});
  const status = String(live.status || '').trim().toUpperCase();
  if (!status) return { position: null, source: 'status-unknown' };
  if (/NOT[_ -]?START|SCHEDULED|UPCOMING|YET/.test(status)) return { position: null, source: 'not-started' };
  if (/CANCEL/.test(status)) return { position: null, source: 'cancelled' };
  if (/COMPLET|TERMINAT/.test(status)) return { position: null, source: 'completed' };

  // 1. Direct GPS
  const lat = Number(location.latitude ?? live.latitude);
  const lng = Number(location.longitude ?? live.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0 && (location.locationAvailable !== false || live.locationAvailable !== false)) {
    return { position: [lat, lng], source: 'gps' };
  }

  const stops = getMergedRouteStops(train);
  if (!stops.length) return { position: null, source: 'unavailable' };

  const coords = (s) => {
    const a = Number(s?.latitude ?? s?.lat);
    const b = Number(s?.longitude ?? s?.lng);
    return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : null;
  };

  // 2. RailRadar segment progress (previousHalt + nextHalt)
  const prevCode = String(live.previousHalt?.stationCode || live.previousHaltCode || location.previousHaltCode || '').toUpperCase();
  const nextCode = String(live.nextHalt?.stationCode || live.nextHaltCode || location.nextHaltCode || '').toUpperCase();
  const rawProgress = Number(live.segmentProgress ?? location.segmentProgress);
  const progress = Number.isFinite(rawProgress) && rawProgress >= 0 && rawProgress <= 1
    ? rawProgress
    : (Number.isFinite(rawProgress) && rawProgress > 0 ? Math.max(0.01, Math.min(0.99, rawProgress)) : null);

  if (prevCode && nextCode && prevCode !== nextCode && progress != null) {
    const prev = stops.find((s) => stationCode(s).toUpperCase() === prevCode);
    const next = stops.find((s) => stationCode(s).toUpperCase() === nextCode);
    const a = coords(prev);
    const b = coords(next);
    if (a && b) {
      return { position: [a[0] + (b[0] - a[0]) * progress, a[1] + (b[1] - a[1]) * progress], source: 'railradar-segment' };
    }
  }

  // 3. RailRadar distanceFromOriginKm
  const distFromOrigin = Number(live.distanceFromOriginKm ?? location.distanceFromOriginKm);
  if (Number.isFinite(distFromOrigin) && distFromOrigin > 0) {
    let pStop = null;
    let nStop = null;
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      const d = Number(s.distanceKm);
      const c = coords(s);
      if (c && Number.isFinite(d)) {
        if (d <= distFromOrigin) {
          pStop = { coords: c, dist: d };
        } else if (d > distFromOrigin && !nStop) {
          nStop = { coords: c, dist: d };
          break;
        }
      }
    }
    if (pStop && nStop && nStop.dist > pStop.dist) {
      const frac = Math.max(0, Math.min(1, (distFromOrigin - pStop.dist) / (nStop.dist - pStop.dist)));
      return {
        position: [pStop.coords[0] + (nStop.coords[0] - pStop.coords[0]) * frac, pStop.coords[1] + (nStop.coords[1] - pStop.coords[1]) * frac],
        source: 'railradar-distance',
      };
    }
    if (pStop) return { position: pStop.coords, source: 'railradar-distance' };
  }

  // 4. Distance covered
  const coveredDist = getDistanceCovered(train);
  if (coveredDist != null && coveredDist >= 0) {
    let pStop = null;
    let nStop = null;
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      const d = Number(s.distanceKm);
      const c = coords(s);
      if (c && Number.isFinite(d)) {
        if (d <= coveredDist) {
          pStop = { coords: c, dist: d };
        } else if (d > coveredDist && !nStop) {
          nStop = { coords: c, dist: d };
          break;
        }
      }
    }
    if (pStop && nStop && nStop.dist > pStop.dist) {
      const frac = Math.max(0, Math.min(1, (coveredDist - pStop.dist) / (nStop.dist - pStop.dist)));
      return {
        position: [pStop.coords[0] + (nStop.coords[0] - pStop.coords[0]) * frac, pStop.coords[1] + (nStop.coords[1] - pStop.coords[1]) * frac],
        source: 'distance-covered',
      };
    }
    if (pStop) return { position: pStop.coords, source: 'distance-covered' };
  }

  // 5. Sequence interpolation
  const sequence = Number(live.currentSequence ?? location.currentSequence ?? 0);
  if (sequence > 0) {
    const current = stops.find((s) => Number(s.sequence) === sequence);
    const next = stops.find((s) => Number(s.sequence) === sequence + 1);
    const a = coords(current);
    const b = coords(next);
    if (a && b) {
      const frac = progress != null ? progress : 0.5;
      return { position: [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac], source: 'station-segment' };
    }
    if (a) return { position: a, source: 'current-station' };
  }

  // 6. Current station match
  const curCode = String(live.currentStationCode || location.currentStationCode || '').toUpperCase();
  if (curCode) {
    const cur = stops.find((s) => stationCode(s).toUpperCase() === curCode);
    const c = coords(cur);
    if (c) return { position: c, source: 'current-station' };
  }

  return { position: null, source: 'unavailable' };
}

export function buildRoutePoints(route) {
  if (!route) return [];
  if (Array.isArray(route.routeCoordinates)) return route.routeCoordinates.map((p) => Array.isArray(p) && p.length >= 2 ? [Number(p[0]),Number(p[1])] : null).filter(Boolean);
  if (route.geojson?.geometry?.coordinates) return route.geojson.geometry.coordinates.map(([lng,lat]) => [Number(lat),Number(lng)]).filter(([lat,lng])=>Number.isFinite(lat)&&Number.isFinite(lng));
  if (route.type === 'Feature' && route.geometry?.coordinates) return route.geometry.coordinates.map(([lng,lat])=>[Number(lat),Number(lng)]).filter(([lat,lng])=>Number.isFinite(lat)&&Number.isFinite(lng));
  if (Array.isArray(route.coordinates)) return route.coordinates.map((p)=>Array.isArray(p)&&p.length>=2?[Number(p[0]),Number(p[1])]:null).filter(Boolean);
  return [];
}

export function normalizeSearchResult(item = {}) {
  const sourceName = item.sourceStationName ?? item.source ?? '';
  const destinationName = item.destinationStationName ?? item.destination ?? '';
  return {
    ...item,
    number: String(item.trainNumber ?? item.number ?? ''),
    name: item.trainName ?? item.name ?? 'Unnamed service',
    route: `${sourceName || 'Origin'} → ${destinationName || 'Destination'}`,
    sourceName, destinationName,
    sourceCode: item.sourceStationCode ?? item.sourceCode ?? '',
    destinationCode: item.destinationStationCode ?? item.destinationCode ?? '',
    type: item.trainType ?? item.category ?? item.type ?? '',
    distanceKm: item.distanceKm ?? item.distance ?? null,
    runsOnDays: item.runsOnDays ?? item.runs ?? item.runningDays ?? '',
  };
}

export function formatRunsCompact(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return [];
  const order = ['mon','tue','wed','thu','fri','sat','sun']; const letters=['M','T','W','T','F','S','S'];
  const tokens = new Set(text.split(/[\s,|/-]+/).filter(Boolean));
  return order.map((day,index)=>({letter:letters[index],active:tokens.has(day)}));
}

export function canSearchTrainQuery(value) {
  const query=String(value||'').trim();
  if(!query) return false;
  return /^\d+$/.test(query) ? query.length===5 : query.length>=2;
}
export function getLocalISODate(){const d=new Date(); const o=d.getTimezoneOffset()*60000; return new Date(d.getTime()-o).toISOString().slice(0,10);}
export function isDecisiveRunningStatus(status){const v=String(status||'').toUpperCase(); return /RUN|DELAY|LATE|EARLY|ACTIVE|EN[_ -]?ROUTE|ON[_ -]?TIME/.test(v)&&!/NOT[_ -]?START|SCHEDULED|UPCOMING|YET|CANCEL|COMPLET|TERMINAT/.test(v);}
