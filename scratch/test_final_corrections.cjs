const axios = require('axios');

function extractClockMinutes(value) {
  if (!value) return null;
  const text = String(value).trim();
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

function getDelayMinutes(scheduled, estimated) {
  if (!scheduled || !estimated) return null;
  const a = extractClockMinutes(scheduled);
  const b = extractClockMinutes(estimated);
  if (a == null || b == null) return null;
  const candidates = [b - a, b + 1440 - a, b - 1440 - a];
  return candidates.reduce((best, current) => Math.abs(current) < Math.abs(best) ? current : best);
}

function formatDelay(delayMinutes) {
  if (delayMinutes == null || !Number.isFinite(Number(delayMinutes))) return { label: '—', tone: 'unknown' };
  const value = Math.round(Number(delayMinutes));
  if (value === 0) return { label: 'On time', tone: 'on-time' };
  if (value < 0) return { label: `${Math.abs(value)} min early`, tone: 'early' };
  return { label: `+${value} min late`, tone: 'late' };
}

function addMinutesToTime(value, minutes) {
  if (!value || !Number.isFinite(Number(minutes))) return null;
  const base = extractClockMinutes(value);
  if (base == null) return null;
  const next = ((base + Number(minutes)) % 1440 + 1440) % 1440;
  return `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`;
}

async function run() {
  console.log('=== VERIFYING FINAL ETA CORRECTIONS END-TO-END ===');

  // Fetch live RailRadar data for train 12951
  const res = await axios.get('https://railradar.in/app/v1/trains/12951/live?geometry=false&includeCoordinates=false');
  const live = res.data.data;
  console.log(`Train: ${live.trainNumber} - ${live.trainName}`);
  console.log(`Status: ${live.status}, Current Delay: ${live.delayMinutes} min`);
  console.log(`Current Location: Seq ${live.currentLocation?.sequence} (${live.currentLocation?.stationCode}), Distance: ${live.currentLocation?.distanceFromOriginKm} km`);

  // Historical runs
  const d1 = new Date(); d1.setDate(d1.getDate() - 1);
  const d2 = new Date(); d2.setDate(d2.getDate() - 2);
  const d3 = new Date(); d3.setDate(d3.getDate() - 3);
  const d4 = new Date(); d4.setDate(d4.getDate() - 4);

  const histPayload = [
    { date: d1.toISOString().substring(0, 10), final_delay_minutes: 5 },
    { date: d2.toISOString().substring(0, 10), final_delay_minutes: 12 },
    { date: d3.toISOString().substring(0, 10), final_delay_minutes: 0 },
    { date: d4.toISOString().substring(0, 10), final_delay_minutes: 8 },
  ];

  const destStop = live.route.find((s) => s.stationCode === 'NDLS') || live.route.at(-1);

  const mlPayload = {
    train_number: '12951',
    train_name: live.trainName,
    journey_date: (live.startDate || '').substring(0, 10) || new Date().toISOString().substring(0, 10),
    status: live.status,
    current_delay_minutes: live.delayMinutes,
    distance_km: Number(destStop.distanceKm || 1384),
    last_updated_at: live.lastUpdatedAt || new Date().toISOString(),
    destination: {
      station_code: destStop.stationCode,
      station_name: destStop.stationName,
      scheduled_arrival: destStop.scheduledArrivalTime || destStop.scheduledArrival || '',
    },
    current_location: {
      station_code: live.currentLocation?.stationCode || '',
      station_name: live.currentLocation?.stationName || '',
      sequence: Number(live.currentLocation?.sequence || 0),
      location_status: live.currentLocation?.status || '',
      scheduled_departure: null,
      scheduled_arrival: null,
    },
    next_halt: {
      station_code: live.nextHalt?.stationCode || '',
      station_name: live.nextHalt?.stationName || '',
      scheduled_arrival: live.nextHalt?.scheduledArrival || null,
      estimated_arrival: live.nextHalt?.estimatedArrival || null,
    },
    historical_runs: histPayload,
  };

  const mlRes = await axios.post('https://final-live-eta-api.onrender.com/predict', mlPayload);
  const mlEta = mlRes?.data?.data || mlRes?.data;
  console.log('\nML Response:');
  console.log(`- predicted_final_delay_minutes: ${mlEta.predicted_final_delay_minutes}`);
  console.log(`- predicted_destination_eta: ${mlEta.predicted_destination_eta}`);

  // Test distance formula on route stops
  const currentCoveredDist = Number(live.currentLocation?.distanceFromOriginKm || 868);
  const currentDelayMinutes = Number(live.delayMinutes || 1);
  const totalRouteDist = Number(destStop.distanceKm || 1384.4);
  const remTotalDist = Math.max(1, totalRouteDist - currentCoveredDist);
  const predictedFinalDelay = Number(mlEta.predicted_final_delay_minutes);

  console.log(`\nDistance Formula Parameters:`);
  console.log(`currentCoveredDist = ${currentCoveredDist}, totalRouteDist = ${totalRouteDist}, remTotalDist = ${remTotalDist.toFixed(1)}`);
  console.log(`currentDelayMinutes = ${currentDelayMinutes}, predictedFinalDelay = ${predictedFinalDelay}`);

  function normalizeStop(stop) {
    return {
      ...stop,
      sequence: Number(stop?.sequence ?? 0),
      stationCode: stop?.stationCode ?? stop?.code ?? '',
      stationName: stop?.stationName ?? stop?.name ?? stop?.code ?? '',
      isHalt: stop?.isHalt !== false,
      platform: stop?.platform ?? null,
      scheduledArrivalTime: stop?.scheduledArrivalTime ?? stop?.scheduledArrival ?? stop?.arrivalTime ?? null,
      scheduledDepartureTime: stop?.scheduledDepartureTime ?? stop?.scheduledDeparture ?? stop?.departureTime ?? null,
      actualArrivalTime: stop?.actualArrivalTime ?? stop?.actualArrival ?? null,
      actualDepartureTime: stop?.actualDepartureTime ?? stop?.actualDeparture ?? null,
      actualArrival: stop?.actualArrival ?? stop?.actualArrivalTime ?? null,
      actualDeparture: stop?.actualDeparture ?? stop?.actualDepartureTime ?? null,
      delayArrival: stop?.delayArrival != null ? Number(stop.delayArrival) : null,
      delayDeparture: stop?.delayDeparture != null ? Number(stop.delayDeparture) : null,
      distanceKm: stop?.distanceKm ?? stop?.distance ?? null,
    };
  }

  const normalizedRoute = live.route.map(normalizeStop);

  // Passed Station: Nagda (NAD)
  const nad = normalizedRoute.find((s) => s.stationCode === 'NAD');
  console.log('\n--- PASSED STATION (NAD - Nagda Jn) ---');
  console.log(`Scheduled Arr: ${nad.scheduledArrivalTime}, Actual Arr: ${nad.actualArrival}, Delay Arr: ${nad.delayArrival}m`);
  console.log(`Scheduled Dep: ${nad.scheduledDepartureTime}, Actual Dep: ${nad.actualDeparture}, Delay Dep: ${nad.delayDeparture}m`);
  const nadArrBadge = formatDelay(nad.delayArrival);
  const nadDepBadge = formatDelay(nad.delayDeparture);
  console.log(`Arrival Display: ${nad.actualArrival} (${nadArrBadge.label})`);
  console.log(`Departure Display: ${nad.actualDeparture} (${nadDepBadge.label})`);

  // Future MAIN Stations: KOTA, SWM, MTJ, NDLS
  const futureMainCodes = ['KOTA', 'SWM', 'MTJ', 'NDLS'];
  console.log('\n--- FUTURE MAIN STATIONS ---');
  futureMainCodes.forEach((code) => {
    const stop = normalizedRoute.find((s) => s.stationCode === code);
    const stopDist = Number(stop.distanceKm);
    const isDest = code === 'NDLS';

    let predDelay;
    let predArr;
    let fraction;
    if (isDest) {
      fraction = 1.0;
      predDelay = Math.round(predictedFinalDelay);
      predArr = mlEta.predicted_destination_eta;
    } else {
      const distFromCurr = Math.max(0, stopDist - currentCoveredDist);
      fraction = Math.max(0, Math.min(1, distFromCurr / remTotalDist));
      predDelay = Math.round(currentDelayMinutes + fraction * (predictedFinalDelay - currentDelayMinutes));
      predArr = addMinutesToTime(stop.scheduledArrivalTime, predDelay);
    }

    // Badge calculation
    const arrDelay = getDelayMinutes(stop.scheduledArrivalTime, predArr);
    const badge = formatDelay(arrDelay);

    // Departure calculation
    const haltMinutes = Math.max(0, getDelayMinutes(stop.scheduledArrivalTime, stop.scheduledDepartureTime) || 0);
    const isLate = getDelayMinutes(stop.scheduledArrivalTime, predArr) > 0;
    const predDep = isLate ? addMinutesToTime(predArr, haltMinutes) : stop.scheduledDepartureTime;
    const depDelay = getDelayMinutes(stop.scheduledDepartureTime, predDep);
    const depBadge = formatDelay(depDelay);

    console.log(`Station: ${code} (${stop.stationName}) | Dist: ${stopDist}km | Frac: ${fraction.toFixed(3)}`);
    console.log(`  Predicted Delay: +${predDelay}m`);
    console.log(`  Sched Arr: ${stop.scheduledArrivalTime} -> Pred Arr: ${predArr} | Arrival Badge: "${badge.label}"`);
    if (!isDest) {
      console.log(`  Sched Dep: ${stop.scheduledDepartureTime} -> Pred Dep: ${predDep} | Departure Badge: "${depBadge.label}"`);
    }
  });

  // Next Main Station: KOTA
  const nextMain = normalizedRoute.find((s) => s.stationCode === 'KOTA');
  const nextMainDistFromCurr = Math.max(0, Number(nextMain.distanceKm) - currentCoveredDist);
  const nextMainFraction = Math.max(0, Math.min(1, nextMainDistFromCurr / remTotalDist));
  const nextMainDelay = Math.round(currentDelayMinutes + nextMainFraction * (predictedFinalDelay - currentDelayMinutes));
  const nextMainPredArr = addMinutesToTime(nextMain.scheduledArrivalTime, nextMainDelay);
  const nextMainArrBadge = formatDelay(getDelayMinutes(nextMain.scheduledArrivalTime, nextMainPredArr));

  console.log('\n--- TOP ETA & FIND TRAIN ALIGNMENT ---');
  console.log(`NEXT MAIN STATION: ${nextMain.stationName} (${nextMain.stationCode})`);
  console.log(`TOP ETA (predictedArrival of Next Main): ${nextMainPredArr}`);
  console.log(`FIND TRAIN DELAY (predictedDelay of Next Main): ${nextMainArrBadge.label} (+${nextMainDelay}m)`);
  console.log(`Are they referring to the SAME next main station? YES (${nextMain.stationCode})`);
}

run().catch(console.error);
