# RailAI Live ETA API — Frontend Integration Guide

**Base URL:** `https://final-live-eta-api.onrender.com`

---

## How It Works

Your app does **two things**:

1. **Fetches train data from RailRadar** — directly from the user's device (phone/browser). This works because RailRadar allows requests from real device IPs.
2. **POSTs the extracted data to our Render backend** — which runs the LightGBM ML model and returns the predicted ETA.

> The backend **never calls RailRadar directly** (Render's server IPs are blocked by RailRadar). Your app is the data bridge.

```
Your App
  │
  ├─── GET railradar.in/app/v1/trains/{number}/live          (current run)
  ├─── GET railradar.in/app/v1/trains/{number}/live?date=... (×4, historical)
  │
  └─── POST https://final-live-eta-api.onrender.com/predict  ──► ML ETA response
```

---

## Step-by-Step Integration

### Step 1 — Fetch the current live run

```
GET https://railradar.in/app/v1/trains/{TRAIN_NUMBER}/live?geometry=false&includeCoordinates=false
```

**Example:**
```
GET https://railradar.in/app/v1/trains/12716/live?geometry=false&includeCoordinates=false
```

No auth headers needed. Extract these fields from `response.data`:

| Field to extract | Where in RailRadar response | Notes |
|---|---|---|
| `status` | `data.status` | Must be `"running"` — abort if not |
| `delayMinutes` | `data.delayMinutes` | Current delay in minutes |
| `startDate` | `data.startDate` | Journey date e.g. `"2026-09-07"` |
| `trainName` | `data.trainName` | Train display name |
| `lastUpdatedAt` | `data.lastUpdatedAt` | Last GPS update timestamp |
| `distance_km` | `data.train.distance` | Route distance in km |
| `currentLocation` | `data.currentLocation` | Object with `stationCode`, `stationName`, `sequence`, `status` |
| `nextHalt` | `data.nextHalt` | Object with `stationCode`, `stationName`, `scheduledArrival`, `estimatedArrival` |
| `route` | `data.route` | Array of all stops — used to find destination + current stop schedule |

**From `route`, find:**
- **Destination** = last stop in the array where `isHalt == true`
  - Extract `stationCode`, `stationName`, `scheduledArrival`
- **Current stop scheduled time** = find the stop matching `currentLocation.sequence` or `currentLocation.stationCode`
  - Extract `scheduledDeparture` (or `scheduledArrival` as fallback)

---

### Step 2 — Fetch 4 historical days (in parallel)

For each of the **4 calendar days before** `startDate`, call:

```
GET https://railradar.in/app/v1/trains/{TRAIN_NUMBER}/live?date=YYYY-MM-DD&geometry=false&includeCoordinates=false
```

**Include a run only if:**
- `data.status == "completed"` AND
- `data.delayMinutes` is a number

Build a list like:
```json
[
  { "date": "2026-09-06", "final_delay_minutes": 62 },
  { "date": "2026-09-05", "final_delay_minutes": 58 }
]
```

Skip any date that returns an error, non-completed status, or missing delay — just don't add it to the list.

---

### Step 3 — POST to `/predict`

```
POST https://final-live-eta-api.onrender.com/predict
Content-Type: application/json
```

**Request body:**

```json
{
  "train_number": "12716",
  "train_name": "Sachkhand Express",
  "journey_date": "2026-09-07",
  "status": "running",
  "current_delay_minutes": 34,
  "distance_km": 2080.8,
  "last_updated_at": "2026-09-07T19:45:00+05:30",
  "destination": {
    "station_code": "NED",
    "station_name": "Nanded",
    "scheduled_arrival": "2026-09-08T14:35:00+05:30"
  },
  "current_location": {
    "station_code": "DWA",
    "station_name": "Dailwara",
    "sequence": 137,
    "location_status": "departed",
    "scheduled_departure": "2026-09-07T19:48:00+05:30",
    "scheduled_arrival": "2026-09-07T19:48:00+05:30"
  },
  "next_halt": {
    "station_code": "LAR",
    "station_name": "Lalitpur",
    "scheduled_arrival": null,
    "estimated_arrival": null
  },
  "historical_runs": [
    { "date": "2026-09-06", "final_delay_minutes": 62 },
    { "date": "2026-09-05", "final_delay_minutes": 58 },
    { "date": "2026-09-04", "final_delay_minutes": 45 },
    { "date": "2026-09-03", "final_delay_minutes": -16 }
  ]
}
```

**Required fields:**

| Field | Type | Required | Description |
|---|---|:---:|---|
| `train_number` | string | ✅ | Train number |
| `journey_date` | string | ✅ | `"YYYY-MM-DD"` |
| `status` | string | ✅ | Must be `"running"` |
| `distance_km` | number | ✅ | From `data.train.distance` |
| `destination.scheduled_arrival` | string | ✅ | ISO datetime from last halt stop |
| `current_delay_minutes` | number | — | Defaults to `0` if omitted |
| `current_location` | object | — | Improves remaining-time calc |
| `historical_runs` | array | — | Empty array `[]` if none found |

---

### Step 4 — Read the response

**Successful response (`HTTP 200`):**

```json
{
  "success": true,
  "train_number": "12716",
  "train_name": "Sachkhand Express",
  "journey_date": "2026-09-07",
  "status": "running",
  "current_live_delay_minutes": 34.0,
  "ml_baseline_delay_minutes": 32.3,
  "historical_estimate_minutes": 37.4,
  "predicted_final_delay_minutes": 34.1,
  "predicted_destination_eta": "2026-09-08T15:09:04+05:30",
  "remaining_scheduled_minutes": 1127.0,
  "weights": {
    "current_live_delay": 0.45,
    "ml_baseline": 0.35,
    "fresh_history": 0.20
  },
  "destination": {
    "station_code": "NED",
    "station_name": "Nanded",
    "scheduled_arrival": "2026-09-08T14:35:00+05:30"
  },
  "current_location": { ... },
  "next_halt": { ... },
  "message": "Train 12716 is predicted to arrive at Nanded at 08 Sep 2026, 03:09 PM UTC+05:30.",
  "fresh_history": { ... },
  "ml_model": { ... }
}
```

**Key fields to display in UI:**

| Response field | What to show |
|---|---|
| `predicted_destination_eta` | Predicted arrival time (ISO — format for display) |
| `predicted_final_delay_minutes` | Predicted delay in minutes |
| `current_live_delay_minutes` | Current observed delay |
| `message` | Ready-to-display human sentence |
| `remaining_scheduled_minutes` | Time left on schedule (minutes) |
| `weights` | Transparency: how prediction was blended |

---

## Error Responses

| HTTP | Meaning | Fix |
|---|---|---|
| `409` | Train not running | Check `status` before calling — only call if `"running"` |
| `422` | Bad payload | Check `destination.scheduled_arrival` is a valid ISO datetime |
| `503` | ML model not loaded | Render startup issue — check `/health` |
| `500` | ML inference error | Contact backend team |

---

## Quick Health Check

```
GET https://final-live-eta-api.onrender.com/health
```

Expected:
```json
{
  "status": "healthy",
  "ml_model_loaded": true,
  "model_feature_count": 7
}
```

If `ml_model_loaded` is `false`, the `.pkl` files are missing from the Render deployment.

---

## Flutter Quick Start

Add to `pubspec.yaml`:
```yaml
dependencies:
  http: ^1.2.0
```

Use the provided `railradar_service.dart`:
```dart
final service = RailRadarService(
  backendBaseUrl: 'https://final-live-eta-api.onrender.com',
);

try {
  final result = await service.getLiveETA('12716');
  print(result.message);
  print('ETA: ${result.predictedDestinationEta}');
  print('Delay: ${result.predictedFinalDelayMinutes} min');
} catch (e) {
  print('Error: $e');
}
```

The service handles all 5 RailRadar calls, field extraction, and the backend POST automatically.

---

## JavaScript / Web Quick Start

> ⚠️ RailRadar does not send CORS headers, so `fetch()` from a web browser will be blocked.
> Use this approach **only from React Native, Node.js, or a native mobile WebView** — not from a browser page directly.

```javascript
const RAILRADAR = 'https://railradar.in/app/v1/trains';
const BACKEND   = 'https://final-live-eta-api.onrender.com';

async function getETA(trainNumber) {
  // 1. Fetch current run
  const liveRes  = await fetch(`${RAILRADAR}/${trainNumber}/live?geometry=false&includeCoordinates=false`);
  const liveJson = await liveRes.json();
  const data     = liveJson.data;

  if (data.status !== 'running') throw new Error(`Train not running: ${data.status}`);

  const train = data.train || {};
  const route = data.route || [];
  const cl    = data.currentLocation || {};
  const nh    = data.nextHalt || {};

  // Find destination (last stop with isHalt = true)
  const dest = [...route].reverse().find(s => s.isHalt);

  // Find current stop's scheduled time
  const curStop = route.find(s => s.sequence === cl.sequence || s.stationCode === cl.stationCode) || {};

  const journeyDate = (data.startDate || '').substring(0, 10);
  const anchor      = new Date(journeyDate);

  // 2. Fetch 4 historical days in parallel
  const histFetches = [1, 2, 3, 4].map(async (daysBack) => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - daysBack);
    const dateStr = d.toISOString().substring(0, 10);
    try {
      const r    = await fetch(`${RAILRADAR}/${trainNumber}/live?date=${dateStr}&geometry=false&includeCoordinates=false`);
      const json = await r.json();
      const hd   = json.data || {};
      if (hd.status === 'completed' && typeof hd.delayMinutes === 'number') {
        return { date: dateStr, final_delay_minutes: hd.delayMinutes };
      }
    } catch (_) {}
    return null;
  });
  const historicalRuns = (await Promise.all(histFetches)).filter(Boolean);

  // 3. POST /predict
  const payload = {
    train_number:          trainNumber,
    train_name:            data.trainName,
    journey_date:          journeyDate,
    status:                data.status,
    current_delay_minutes: data.delayMinutes || 0,
    distance_km:           train.distance || 0,
    last_updated_at:       data.lastUpdatedAt,
    destination: {
      station_code:      dest?.stationCode,
      station_name:      dest?.stationName,
      scheduled_arrival: dest?.scheduledArrival,
    },
    current_location: {
      station_code:        cl.stationCode,
      station_name:        cl.stationName,
      sequence:            cl.sequence,
      location_status:     cl.status,
      scheduled_departure: curStop.scheduledDeparture,
      scheduled_arrival:   curStop.scheduledArrival,
    },
    next_halt: {
      station_code:      nh.stationCode,
      station_name:      nh.stationName,
      scheduled_arrival: nh.scheduledArrival,
      estimated_arrival: nh.estimatedArrival,
    },
    historical_runs: historicalRuns,
  };

  const res    = await fetch(`${BACKEND}/predict`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  return res.json();
}

// Usage
getETA('12716').then(r => {
  console.log(r.message);
  console.log('ETA:', r.predicted_destination_eta);
  console.log('Delay:', r.predicted_final_delay_minutes, 'min');
});
```

---

## Notes for the Presentation

- The ML model uses **7 features** derived entirely from the RailRadar response (no manual inputs)
- The prediction blends **3 signals**: current live delay, ML baseline, and 4-day history
- Weights shift dynamically based on how far the train is from its destination
- The predicted delay is **always ≥ current observed delay** (trains don't recover delay)
- Model MAE on test data: **±26.6 minutes** (prototype trained on 93 records)
