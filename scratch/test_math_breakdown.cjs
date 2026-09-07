const axios = require('axios');

async function testFormula() {
  // 1. Fetch live RailRadar data for train 12951
  const res = await axios.get('https://railradar.in/app/v1/trains/12951/live?geometry=false&includeCoordinates=false');
  const live = res.data.data;

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

  const destRaw = live.route.find((s) => s.stationCode === 'NDLS') || live.route.at(-1);

  const mlPayload = {
    train_number: '12951',
    train_name: live.trainName,
    journey_date: (live.startDate || '').substring(0, 10) || new Date().toISOString().substring(0, 10),
    status: live.status,
    current_delay_minutes: live.delayMinutes,
    distance_km: Number(destRaw.distance || 1384),
    last_updated_at: live.lastUpdatedAt || new Date().toISOString(),
    destination: {
      station_code: destRaw.stationCode,
      station_name: destRaw.stationName,
      scheduled_arrival: destRaw.scheduledArrival || destRaw.scheduledArrivalTime || '',
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

  const currentCoveredDistance = Number(live.currentLocation?.distanceFromOriginKm || live.distanceCoveredKm || 877.77);
  const destinationDistance = Number(destRaw.distance || 1384.4);
  const currentDelayMinutes = Number(live.delayMinutes || 0);
  const predictedFinalDelay = Number(mlEta.predicted_final_delay_minutes);

  console.log('=== REAL RUNNING TRAIN PARAMETERS ===');
  console.log(`Train: ${live.trainNumber} - ${live.trainName}`);
  console.log(`Status: ${live.status}`);
  console.log(`currentCoveredDistance: ${currentCoveredDistance} km`);
  console.log(`destinationDistance: ${destinationDistance} km`);
  console.log(`currentDelayMinutes: ${currentDelayMinutes} min`);
  console.log(`predictedFinalDelay: ${predictedFinalDelay} min`);
  console.log(`predictedFinalDelay - currentDelayMinutes: ${(predictedFinalDelay - currentDelayMinutes).toFixed(3)} min`);

  const remTotalDist = Math.max(1, destinationDistance - currentCoveredDistance);
  console.log(`remTotalDist: ${remTotalDist.toFixed(2)} km`);

  // Main halts identification
  function isMain(stop, idx, all) {
    if (idx === 0 || idx === all.length - 1) return true;
    if (stop.isHalt === false) return false;
    // Main railway halts for 12951: BVI, ST, BRC, RTM, KOTA, SWM, MTJ, NDLS
    return ['MMCT', 'BVI', 'BL', 'ST', 'BRC', 'RTM', 'NAD', 'KOTA', 'SWM', 'BTE', 'MTJ', 'NZM', 'NDLS'].includes(stop.stationCode);
  }

  const allStops = live.route.map((s, idx) => ({
    sequence: Number(s.sequence || idx + 1),
    stationCode: s.stationCode,
    stationName: s.stationName,
    distanceKm: Number(s.distance || s.distanceKm || 0),
    isHalt: s.isHalt,
    scheduledArrival: s.scheduledArrival,
  }));

  const mainStops = allStops.filter((s, idx) => isMain(s, idx, allStops));
  const futureMainStops = mainStops.filter((s) => s.distanceKm > currentCoveredDistance);

  console.log('\n=== EVERY FUTURE MAIN STATION BREAKDOWN ===');
  futureMainStops.forEach((st) => {
    const stationDistance = st.distanceKm;
    const distFromCurrent = Math.max(0, stationDistance - currentCoveredDistance);
    const fraction = Math.max(0, Math.min(1, distFromCurrent / remTotalDist));
    const rawPredictedDelay = currentDelayMinutes + fraction * (predictedFinalDelay - currentDelayMinutes);
    const roundedPredictedDelay = Math.round(rawPredictedDelay);

    console.log(`\nStation: ${st.stationCode} (${st.stationName})`);
    console.log(`  station distance: ${stationDistance} km`);
    console.log(`  current distance: ${currentCoveredDistance} km`);
    console.log(`  destination distance: ${destinationDistance} km`);
    console.log(`  distFromCurrent: ${distFromCurrent.toFixed(2)} km`);
    console.log(`  fraction: ${fraction.toFixed(4)}`);
    console.log(`  current delay: ${currentDelayMinutes} min`);
    console.log(`  ML predicted final delay: ${predictedFinalDelay} min`);
    console.log(`  raw predicted delay before rounding: ${rawPredictedDelay.toFixed(4)} min`);
    console.log(`  rounded predicted delay: ${roundedPredictedDelay} min`);
  });

  console.log('\n=== RESULTING SEQUENCE ===');
  futureMainStops.forEach((st) => {
    const stationDistance = st.distanceKm;
    const distFromCurrent = Math.max(0, stationDistance - currentCoveredDistance);
    const fraction = Math.max(0, Math.min(1, distFromCurrent / remTotalDist));
    const rawPredictedDelay = currentDelayMinutes + fraction * (predictedFinalDelay - currentDelayMinutes);
    const roundedPredictedDelay = Math.round(rawPredictedDelay);
    console.log(`${st.stationCode.padEnd(6)} fraction=${fraction.toFixed(4)}  raw=${rawPredictedDelay.toFixed(4)}  rounded=${roundedPredictedDelay}`);
  });
}

testFormula().catch(console.error);
