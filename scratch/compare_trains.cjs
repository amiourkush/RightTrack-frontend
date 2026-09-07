const axios = require('axios');

async function testTrains() {
  const trainNumbers = ['12951', '12903', '12919', '12413'];

  for (const tNum of trainNumbers) {
    try {
      const res = await axios.get(`https://railradar.in/app/v1/trains/${tNum}/live?geometry=false&includeCoordinates=false`);
      const live = res.data.data;
      if (live.status !== 'running') continue;

      console.log(`\n======================================================`);
      console.log(`TRAIN ${tNum}: ${live.trainName}`);
      console.log(`Status: ${live.status}, Current Delay: ${live.delayMinutes} min`);
      console.log(`Current Location: Seq ${live.currentLocation?.sequence} (${live.currentLocation?.stationCode}), Covered: ${live.currentLocation?.distanceFromOriginKm} km`);

      // ML prediction call
      const destRaw = live.route.at(-1);
      const mlPayload = {
        train_number: tNum,
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

      const currentCoveredDistance = Number(live.currentLocation?.distanceFromOriginKm || 0);
      const destinationDistance = Number(destRaw.distance || 0);
      const currentDelayMinutes = Number(live.delayMinutes || 0);
      const predictedFinalDelay = Number(mlEta.predicted_final_delay_minutes);
      const remTotalDist = Math.max(1, destinationDistance - currentCoveredDistance);

      const deltaDelay = predictedFinalDelay - currentDelayMinutes;

      console.log(`Destination: ${destRaw.stationCode} at ${destinationDistance} km`);
      console.log(`remTotalDist: ${remTotalDist.toFixed(2)} km`);
      console.log(`currentDelay: ${currentDelayMinutes} min`);
      console.log(`predictedFinalDelay: ${predictedFinalDelay} min`);
      console.log(`predictedFinalDelay - currentDelay: ${deltaDelay.toFixed(3)} min`);

      const futureStops = live.route.filter((s) => Number(s.distance) > currentCoveredDistance && (s.isHalt || Number(s.distance) % 50 === 0));

      console.log(`\nFuture Stops Sample:`);
      futureStops.forEach((st) => {
        const stationDistance = Number(st.distance);
        const distFromCurrent = Math.max(0, stationDistance - currentCoveredDistance);
        const fraction = Math.max(0, Math.min(1, distFromCurrent / remTotalDist));
        const rawPredictedDelay = currentDelayMinutes + fraction * (predictedFinalDelay - currentDelayMinutes);
        const roundedPredictedDelay = Math.round(rawPredictedDelay);
        console.log(`${st.stationCode.padEnd(6)} (dist: ${String(stationDistance).padStart(6)} km) | fraction=${fraction.toFixed(4)} | raw=${rawPredictedDelay.toFixed(4)} min | rounded=${roundedPredictedDelay} min`);
      });
      break;
    } catch (err) {
      // try next
    }
  }
}

testTrains().catch(console.error);
