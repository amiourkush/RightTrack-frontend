const axios = require('axios');

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

// Convert a scheduled time to total cumulative minutes from journey start
function getStopScheduledEpochMinutes(stop, prevEpochMinutes = 0) {
  const time = stop.scheduledArrivalTime || stop.scheduledArrival || stop.scheduledDepartureTime || stop.scheduledDeparture;
  if (!time) return null;
  if (isDateTime(time)) {
    const ms = new Date(time).getTime();
    if (!Number.isNaN(ms)) return ms / 60000;
  }
  const clock = extractClockMinutes(time);
  if (clock == null) return null;
  // If clock wraps past midnight relative to prevEpochMinutes
  if (prevEpochMinutes > 0) {
    let candidate = Math.floor(prevEpochMinutes / 1440) * 1440 + clock;
    while (candidate < prevEpochMinutes - 120) candidate += 1440;
    return candidate;
  }
  return clock;
}

async function testTimeFormula() {
  const res = await axios.get('https://railradar.in/app/v1/trains/12951/live?geometry=false&includeCoordinates=false');
  const live = res.data.data;
  const route = live.route;

  console.log(`Train ${live.trainNumber}: ${live.trainName}`);
  console.log(`Current delay: ${live.delayMinutes} min`);
  console.log(`Current location: Seq ${live.currentLocation?.sequence} (${live.currentLocation?.stationCode}, ${live.currentLocation?.status})`);
  console.log(`Distance covered: ${live.currentLocation?.distanceFromOriginKm} km`);
  console.log(`Segment progress: ${live.segmentProgress || live.currentLocation?.segmentProgress}`);

  // Fetch ML
  const destRaw = route.at(-1);
  const mlPayload = {
    train_number: '12951',
    train_name: live.trainName,
    journey_date: (live.startDate || '').substring(0, 10) || new Date().toISOString().substring(0, 10),
    status: live.status,
    current_delay_minutes: Number(live.delayMinutes || 0),
    distance_km: Number(destRaw.distance || 1384),
    destination: {
      station_code: destRaw.stationCode,
      scheduled_arrival: destRaw.scheduledArrival || '',
    },
    current_location: {
      station_code: live.currentLocation?.stationCode || '',
      sequence: Number(live.currentLocation?.sequence || 0),
    },
  };

  const mlRes = await axios.post('https://final-live-eta-api.onrender.com/predict', mlPayload);
  const mlEta = mlRes?.data?.data || mlRes?.data;
  const predictedFinalDelay = Number(mlEta.predicted_final_delay_minutes || 6.4);
  const currentDelay = Number(live.delayMinutes || 3);

  // Normalize stops with cumulative epoch minutes
  let lastEpoch = 0;
  const stops = route.map((s, idx) => {
    const epoch = getStopScheduledEpochMinutes(s, lastEpoch);
    if (epoch != null) lastEpoch = epoch;
    return {
      sequence: Number(s.sequence || idx + 1),
      stationCode: s.stationCode,
      stationName: s.stationName,
      distanceKm: Number(s.distance || 0),
      isHalt: s.isHalt,
      scheduledArrivalTime: s.scheduledArrival,
      scheduledDepartureTime: s.scheduledDeparture,
      scheduledEpochMinutes: epoch,
    };
  });

  const currSeq = Number(live.currentLocation?.sequence || 0);
  const currDist = Number(live.currentLocation?.distanceFromOriginKm || 0);

  // Find active segment: previous stop and next stop
  let prevStopIdx = stops.findIndex((s) => s.sequence === currSeq);
  if (prevStopIdx < 0) {
    prevStopIdx = stops.findIndex((s) => s.distanceKm >= currDist) - 1;
  }
  if (prevStopIdx < 0) prevStopIdx = 0;
  const nextStopIdx = Math.min(stops.length - 1, prevStopIdx + 1);

  const prevStop = stops[prevStopIdx];
  const nextStop = stops[nextStopIdx];
  const destStop = stops.at(-1);

  // Determine segment progress
  let segProg = live.segmentProgress != null ? Number(live.segmentProgress) : null;
  if (segProg == null || segProg <= 0) {
    if (nextStop.distanceKm > prevStop.distanceKm && currDist >= prevStop.distanceKm) {
      segProg = (currDist - prevStop.distanceKm) / (nextStop.distanceKm - prevStop.distanceKm);
    } else {
      segProg = 0.5;
    }
  }
  segProg = Math.max(0, Math.min(1, segProg));

  console.log(`Active segment: [${prevStop.sequence}] ${prevStop.stationCode} -> [${nextStop.sequence}] ${nextStop.stationCode}`);
  console.log(`Computed segProgress: ${segProg.toFixed(3)}`);

  // Current segment scheduled duration (in minutes)
  const prevDepEpoch = prevStop.scheduledEpochMinutes;
  const nextArrEpoch = nextStop.scheduledEpochMinutes;
  const segScheduledDuration = Math.max(1, (nextArrEpoch != null && prevDepEpoch != null) ? (nextArrEpoch - prevDepEpoch) : 2);
  const remCurrentSegmentTime = segScheduledDuration * (1 - segProg);

  console.log(`Current segment scheduled duration: ${segScheduledDuration} min, Remaining: ${remCurrentSegmentTime.toFixed(2)} min`);

  // Calculate remaining scheduled time from train's current position to any stop S
  function getRemainingScheduledTimeToStop(targetStop) {
    if (targetStop.sequence <= prevStop.sequence) return 0;
    if (targetStop.sequence === nextStop.sequence) {
      return remCurrentSegmentTime;
    }
    const additionalTime = Math.max(0, (targetStop.scheduledEpochMinutes || 0) - (nextStop.scheduledEpochMinutes || 0));
    return remCurrentSegmentTime + additionalTime;
  }

  const remTimeToDest = Math.max(1, getRemainingScheduledTimeToStop(destStop));
  const remDistToDest = Math.max(1, destStop.distanceKm - currDist);

  console.log(`remTimeToDest: ${remTimeToDest.toFixed(2)} min (${(remTimeToDest/60).toFixed(2)} hours)`);
  console.log(`remDistToDest: ${remDistToDest.toFixed(2)} km`);

  // Select 5+ MAIN stations ahead:
  const targetMainCodes = ['KOTA', 'SWM', 'GGC', 'BTE', 'MTJ', 'NZM', 'NDLS'];

  console.log(`\n========================================================================================================================`);
  console.log(`STATION | SCHED ARR | DIST (km) | REM TIME (min) | TIME FRAC | DIST FRAC | RAW (TIME) | ROUNDED | PRED ARR | PRED DEP`);
  console.log(`========================================================================================================================`);

  targetMainCodes.forEach((code) => {
    const st = stops.find((s) => s.stationCode === code);
    if (!st) return;

    const remTime = getRemainingScheduledTimeToStop(st);
    const timeFraction = Math.max(0, Math.min(1, remTime / remTimeToDest));

    const distFromCurr = Math.max(0, st.distanceKm - currDist);
    const distFraction = Math.max(0, Math.min(1, distFromCurr / remDistToDest));

    // Time-based predicted delay
    const isDest = code === destStop.stationCode;
    const rawDelay = isDest ? predictedFinalDelay : (currentDelay + timeFraction * (predictedFinalDelay - currentDelay));
    const roundedDelay = Math.round(rawDelay);

    // Pred Arrival
    let predArr = null;
    if (isDest) {
      predArr = mlEta.predicted_destination_eta;
    } else if (st.scheduledArrivalTime) {
      const baseMin = extractClockMinutes(st.scheduledArrivalTime);
      const nextMin = ((baseMin + roundedDelay) % 1440 + 1440) % 1440;
      predArr = `${String(Math.floor(nextMin/60)).padStart(2,'0')}:${String(nextMin%60).padStart(2,'0')}`;
    }

    // Pred Departure
    const schedArrMin = extractClockMinutes(st.scheduledArrivalTime);
    const schedDepMin = extractClockMinutes(st.scheduledDepartureTime);
    const haltMin = (schedArrMin != null && schedDepMin != null) ? Math.max(0, ((schedDepMin - schedArrMin)%1440+1440)%1440) : 0;
    let predDep = null;
    if (!isDest && schedDepMin != null) {
      if (roundedDelay > 0) {
        const nextMin = ((schedArrMin + roundedDelay + haltMin) % 1440 + 1440) % 1440;
        predDep = `${String(Math.floor(nextMin/60)).padStart(2,'0')}:${String(nextMin%60).padStart(2,'0')}`;
      } else {
        predDep = `${String(Math.floor(schedDepMin/60)).padStart(2,'0')}:${String(schedDepMin%60).padStart(2,'0')}`;
      }
    }

    console.log(
      `${code.padEnd(7)} | ` +
      `${String(st.scheduledArrivalTime?.substring(11, 16) || '—').padStart(9)} | ` +
      `${String(st.distanceKm.toFixed(1)).padStart(9)} | ` +
      `${String(remTime.toFixed(1)).padStart(14)} | ` +
      `${timeFraction.toFixed(4).padStart(9)} | ` +
      `${distFraction.toFixed(4).padStart(9)} | ` +
      `${rawDelay.toFixed(4).padStart(10)} | ` +
      `${String(roundedDelay).padStart(7)} | ` +
      `${String(predArr?.substring(11, 16) || predArr || '—').padStart(8)} | ` +
      `${String(predDep || '—').padStart(8)}`
    );
  });
}

testTimeFormula().catch(console.error);
