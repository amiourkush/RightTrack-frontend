const axios = require('axios');

async function testMainSections() {
  const res = await axios.get('https://railradar.in/app/v1/trains/12951/live?geometry=false&includeCoordinates=false');
  const live = res.data.data;

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

  const destRaw = live.route.at(-1);
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
    historical_runs: histPayload,
  };

  const mlRes = await axios.post('https://final-live-eta-api.onrender.com/predict', mlPayload);
  const mlEta = mlRes?.data?.data || mlRes?.data;

  const currentCoveredDistance = Number(live.currentLocation?.distanceFromOriginKm || 907.75);
  const destinationDistance = Number(destRaw.distance || 1384.4);
  const currentDelayMinutes = Number(live.delayMinutes || 3);
  const predictedFinalDelay = Number(mlEta.predicted_final_delay_minutes || 7.8);
  const remTotalDist = Math.max(1, destinationDistance - currentCoveredDistance);
  const deltaDelay = predictedFinalDelay - currentDelayMinutes;

  // Replicate getMainSections from train.js
  const stops = live.route.map((s, idx) => ({
    sequence: Number(s.sequence || idx + 1),
    stationCode: s.stationCode,
    stationName: s.stationName,
    distanceKm: Number(s.distance || 0),
    isHalt: s.isHalt,
    scheduledArrivalTime: s.scheduledArrival,
    scheduledDepartureTime: s.scheduledDeparture,
  }));

  // isMainHalt logic from train.js
  function isMainHalt(stop, index, allStops) {
    if (!stop) return false;
    if (index === 0 || index === allStops.length - 1) return true;
    if (stop.isHalt === false) return false;
    if (allStops.length > 12) {
      const isMajorJunction = /(\bJN\b|\bJUNCTION\b|\bCANTT\b|\bCENTRAL\b|\bTERMINUS\b|\bTERMINAL\b)/i.test(stop.stationName || '');
      return isMajorJunction || stop.isHalt === true;
    }
    return true;
  }

  const isMain = stops.map((s, i) => isMainHalt(s, i, stops));

  // Safeguard: ensure stretches don't exceed 8 intermediate stations without a main station
  let lastMainIdx = 0;
  for (let i = 1; i < stops.length; i++) {
    if (isMain[i]) {
      if (i - lastMainIdx > 8) {
        let bestIdx = Math.floor((lastMainIdx + i) / 2);
        isMain[bestIdx] = true;
      }
      lastMainIdx = i;
    }
  }

  const futureMains = stops
    .filter((s, idx) => isMain[idx] && Number(s.distanceKm) > currentCoveredDistance);

  console.log(`CURRENT TRAIN METRICS:`);
  console.log(`- Train Number: ${live.trainNumber}`);
  console.log(`- Current Location: Seq ${live.currentLocation?.sequence} (${live.currentLocation?.stationCode})`);
  console.log(`- Current Covered Distance: ${currentCoveredDistance} km`);
  console.log(`- Destination Distance: ${destinationDistance} km`);
  console.log(`- Current Delay: ${currentDelayMinutes} min`);
  console.log(`- ML Predicted Final Delay: ${predictedFinalDelay} min`);
  console.log(`- predictedFinalDelay - currentDelay: ${deltaDelay.toFixed(3)} min`);
  console.log(`- Remaining Route Distance (remTotalDist): ${remTotalDist.toFixed(2)} km`);

  console.log(`\n========================================================================================================================`);
  console.log(`STATION | STATION DIST | CURR DIST | DEST DIST | DIST FROM CURR | FRACTION | CURR DELAY | ML FINAL | RAW PREDICTED | ROUNDED`);
  console.log(`========================================================================================================================`);

  futureMains.forEach((st) => {
    const stationDistance = Number(st.distanceKm);
    const distFromCurrent = Math.max(0, stationDistance - currentCoveredDistance);
    const fraction = Math.max(0, Math.min(1, distFromCurrent / remTotalDist));
    const rawPredictedDelay = currentDelayMinutes + fraction * (predictedFinalDelay - currentDelayMinutes);
    const roundedPredictedDelay = Math.round(rawPredictedDelay);

    console.log(
      `${st.stationCode.padEnd(7)} | ` +
      `${String(stationDistance.toFixed(1)).padStart(12)} | ` +
      `${String(currentCoveredDistance.toFixed(1)).padStart(9)} | ` +
      `${String(destinationDistance.toFixed(1)).padStart(9)} | ` +
      `${String(distFromCurrent.toFixed(1)).padStart(14)} | ` +
      `${fraction.toFixed(4).padStart(8)} | ` +
      `${String(currentDelayMinutes).padStart(10)} | ` +
      `${String(predictedFinalDelay.toFixed(1)).padStart(8)} | ` +
      `${rawPredictedDelay.toFixed(4).padStart(13)} | ` +
      `${String(roundedPredictedDelay).padStart(7)}`
    );
  });

  console.log(`\n=== RESULTING SEQUENCE ===`);
  futureMains.forEach((st) => {
    const stationDistance = Number(st.distanceKm);
    const distFromCurrent = Math.max(0, stationDistance - currentCoveredDistance);
    const fraction = Math.max(0, Math.min(1, distFromCurrent / remTotalDist));
    const rawPredictedDelay = currentDelayMinutes + fraction * (predictedFinalDelay - currentDelayMinutes);
    const roundedPredictedDelay = Math.round(rawPredictedDelay);
    console.log(`${st.stationCode.padEnd(6)} fraction=${fraction.toFixed(4)}  raw=${rawPredictedDelay.toFixed(4)}  rounded=${roundedPredictedDelay}`);
  });
}

testMainSections().catch(console.error);
