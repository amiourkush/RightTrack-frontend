# RailAI - Intelligent Railway System API Documentation

RailAI is an enterprise Spring Boot backend microservice delivering real-time train tracking, GIS route mapping, station master metadata, dynamic ML-powered ETA predictions, and user profile management.

---

## 🛠️ Technology Stack & Architecture

- **Core Framework**: Java 21, Spring Boot 3.4, Spring Security, Spring Data JPA.
- **Database**: PostgreSQL (Neon Serverless Cloud) with Flyway migrations (`V1` to `V18`).
- **Security & Authentication**: JWT (Access + Refresh tokens), BCrypt password hashing, Google OAuth2 Single Sign-On ("Continue with Google"), Brevo REST API email verification.
- **External Integrations**:
  - **RailRadar API** (`https://api.railradar.in`): Real-time timetable, GIS track geometry, and live status ingestion.
  - **Live ETA ML Service** (`https://railai-live-eta-api.onrender.com`): Live ETA delay predictions.
  - **Open-Meteo API** (`https://api.open-meteo.com`): Real-time station weather metrics.

---

## 📋 Complete API Endpoints Sitemap

| Subsystem | Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | No | Register new user & dispatch verification OTP |
| **Auth** | `POST` | `/api/v1/auth/verify-email-otp` | No | Verify 6-digit email OTP |
| **Auth** | `POST` | `/api/v1/auth/resend-otp` | No | Resend email verification OTP |
| **Auth** | `POST` | `/api/v1/auth/login` | No | Authenticate with email/password for JWT tokens |
| **Auth** | `POST` | `/api/v1/auth/google` | No | Single Sign-On ("Continue with Google") |
| **Auth** | `POST` | `/api/v1/auth/refresh` | No | Exchange refresh token for new JWT pair |
| **Auth** | `POST` | `/api/v1/auth/logout` | No | Revoke active refresh token |
| **Auth** | `GET` | `/api/v1/auth/me` | Yes | Get authenticated user summary |
| **Profile** | `GET` | `/api/v1/users/me` | Yes | Get full account overview (User + Profile + Settings) |
| **Profile** | `GET` | `/api/v1/users/profile` | Yes | Fetch user profile details |
| **Profile** | `PUT` | `/api/v1/users/profile` | Yes | Update profile fields (phone, language, start/destination stations) |
| **Profile** | `POST` | `/api/v1/users/profile/avatar` | Yes | Update user avatar URL |
| **Profile** | `PUT` | `/api/v1/users/change-password` | Yes | Change account password |
| **Profile** | `GET` | `/api/v1/users/settings` | Yes | Fetch user settings & preferences |
| **Profile** | `PUT` | `/api/v1/users/settings` | Yes | Replace all user settings & preferences |
| **Profile** | `PATCH` | `/api/v1/users/settings/notifications` | Yes | Update notification preferences |
| **Profile** | `PATCH` | `/api/v1/users/settings/display` | Yes | Update display & UI preferences |
| **Train** | `GET` | `/api/v1/trains/search` | No | Search trains by number or name |
| **Train** | `POST` | `/api/v1/trains/search` | No | Search trains via POST body |
| **Train** | `GET` | `/api/v1/trains/{trainNumber}` | No | Fetch train details and scheduled route stops |
| **Train** | `GET` | `/api/v1/trains/{trainNumber}/live` | No | Fetch live running status & telemetry location |
| **Train** | `GET` | `/api/v1/trains/{trainNumber}/route` | No | Fetch track geometry (lat/lngs) & mapped station locations |
| **Train** | `GET` | `/api/v1/trains/between` | No | Search trains running between two stations |
| **Station** | `GET` | `/api/v1/stations/{stationCode}` | No | Fetch station master metadata & platforms |
| **Station** | `GET` | `/api/v1/stations/{stationCode}/weather` | No | Fetch real-time weather metrics for station |
| **Station** | `POST` | `/api/v1/stations/import` | No | Bulk import Indian Railway station JSON data |
| **ML ETA** | `GET` | `/live-eta/{train_number}` | No | Direct Live ETA ML prediction (Path param) |
| **ML ETA** | `GET` | `/live-eta` | No | Direct Live ETA ML prediction (Query param `train_number`) |
| **ML ETA** | `GET` | `/api/v1/trains/live-eta/{trainNumber}` | No | Live ETA ML prediction via Trains API |
| **ML ETA** | `POST` | `/api/v1/trains/eta/predict` | No | Predict dynamic ML ETA |

---

## 🔐 1. Authentication & Security API (`/api/v1/auth`)

### 1.1 Register User (`POST /api/v1/auth/register`)

**cURL:**
```bash
curl -X POST "http://localhost:8080/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "passenger@railai.com",
    "password": "Password@123",
    "fullName": "Rahul Sharma"
  }'
```

**Response (200 OK):**
```json
{
  "message": "Registration successful. Verify the OTP sent to your email."
}
```

---

### 1.2 Verify Email OTP (`POST /api/v1/auth/verify-email-otp`)

**cURL:**
```bash
curl -X POST "http://localhost:8080/api/v1/auth/verify-email-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "passenger@railai.com",
    "otp": "123456"
  }'
```

**Response (200 OK):**
```json
{
  "message": "Email verified successfully."
}
```

---

### 1.3 Resend Verification OTP (`POST /api/v1/auth/resend-otp`)

**cURL:**
```bash
curl -X POST "http://localhost:8080/api/v1/auth/resend-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "passenger@railai.com"
  }'
```

**Response (200 OK):**
```json
{
  "message": "If the account exists, a new OTP has been sent."
}
```

---

### 1.4 Login Email/Password (`POST /api/v1/auth/login`)

**cURL:**
```bash
curl -X POST "http://localhost:8080/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "passenger@railai.com",
    "password": "Password@123"
  }'
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwYXNzZW5nZXJAcmFpbGFpLmNvbSIsImlhdCI6MTYyMjAwMDAwMCwiZXhwIjoxNjIyMDAwOTAwfQ...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwYXNzZW5nZXJAcmFpbGFpLmNvbSIsImlhdCI6MTYyMjAwMDAwMCwiZXhwIjoxNjIyNjA0ODAwfQ...",
  "tokenType": "Bearer",
  "accessTokenExpiresIn": 900,
  "refreshTokenExpiresIn": 604800,
  "user": {
    "id": 100,
    "email": "passenger@railai.com",
    "fullName": "Rahul Sharma",
    "role": "PASSENGER"
  }
}
```

---

### 1.5 Continue with Google (`POST /api/v1/auth/google`)

**cURL:**
```bash
curl -X POST "http://localhost:8080/api/v1/auth/google" \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
  }'
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "accessTokenExpiresIn": 900,
  "refreshTokenExpiresIn": 604800,
  "user": {
    "id": 101,
    "email": "rahul.sharma@gmail.com",
    "fullName": "Rahul Sharma",
    "role": "PASSENGER"
  }
}
```

---

### 1.6 Refresh Access Token (`POST /api/v1/auth/refresh`)

**cURL:**
```bash
curl -X POST "http://localhost:8080/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
  }'
```

**Response (200 OK):**
```json
{
  "accessToken": "new_access_token_string",
  "refreshToken": "new_refresh_token_string",
  "tokenType": "Bearer",
  "accessTokenExpiresIn": 900,
  "refreshTokenExpiresIn": 604800,
  "user": {
    "id": 100,
    "email": "passenger@railai.com",
    "fullName": "Rahul Sharma",
    "role": "PASSENGER"
  }
}
```

---

### 1.7 Logout (`POST /api/v1/auth/logout`)

**cURL:**
```bash
curl -X POST "http://localhost:8080/api/v1/auth/logout" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
  }'
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### 1.8 Fetch Authenticated User Summary (`GET /api/v1/auth/me`)

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/auth/me" \
  -H "Authorization: Bearer <accessToken>"
```

**Response (200 OK):**
```json
{
  "id": 100,
  "email": "passenger@railai.com",
  "fullName": "Rahul Sharma",
  "role": "PASSENGER"
}
```

---

## 👤 2. User Profile & Settings API (`/api/v1/users`)

### 2.1 Get Full Account Overview (`GET /api/v1/users/me`)

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/users/me" \
  -H "Authorization: Bearer <accessToken>"
```

**Response (200 OK):**
```json
{
  "userId": 100,
  "email": "passenger@railai.com",
  "fullName": "Rahul Sharma",
  "role": "PASSENGER",
  "emailVerified": true,
  "profile": {
    "phoneNumber": "+919876543210",
    "avatarUrl": "https://example.com/avatar.jpg",
    "preferredLanguage": "en",
    "startStationCode": "INDB",
    "destinationStationCode": "UJN",
    "bio": "Frequent commuter between Indore and Ujjain"
  },
  "settings": {
    "emailNotifications": true,
    "smsNotifications": false,
    "pushNotifications": true,
    "delayAlertThresholdMinutes": 15,
    "etaChangeAlerts": true,
    "theme": "DARK",
    "distanceUnit": "KM",
    "timeFormat": "H24",
    "autoRefreshIntervalSeconds": 30,
    "preferredTravelClass": "3A",
    "preferredBerthChoice": "SIDE_LOWER"
  }
}
```

---

### 2.2 Fetch User Profile (`GET /api/v1/users/profile`)

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/users/profile" \
  -H "Authorization: Bearer <accessToken>"
```

**Response (200 OK):**
```json
{
  "userId": 100,
  "fullName": "Rahul Sharma",
  "email": "passenger@railai.com",
  "phoneNumber": "+919876543210",
  "avatarUrl": "https://example.com/avatar.jpg",
  "preferredLanguage": "en",
  "startStationCode": "INDB",
  "destinationStationCode": "UJN",
  "bio": "Frequent commuter between Indore and Ujjain"
}
```

---

### 2.3 Update User Profile (`PUT /api/v1/users/profile`)

**cURL:**
```bash
curl -X PUT "http://localhost:8080/api/v1/users/profile" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Rahul Sharma",
    "phoneNumber": "+919876543210",
    "preferredLanguage": "en",
    "startStationCode": "INDB",
    "destinationStationCode": "BPL",
    "bio": "Updated travel profile"
  }'
```

**Response (200 OK):**
```json
{
  "userId": 100,
  "fullName": "Rahul Sharma",
  "email": "passenger@railai.com",
  "phoneNumber": "+919876543210",
  "avatarUrl": "https://example.com/avatar.jpg",
  "preferredLanguage": "en",
  "startStationCode": "INDB",
  "destinationStationCode": "BPL",
  "bio": "Updated travel profile"
}
```

---

### 2.4 Update Profile Avatar (`POST /api/v1/users/profile/avatar`)

**cURL:**
```bash
curl -X POST "http://localhost:8080/api/v1/users/profile/avatar" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "avatarUrl": "https://cdn.railai.com/avatars/user100.png"
  }'
```

**Response (200 OK):**
```json
{
  "userId": 100,
  "fullName": "Rahul Sharma",
  "email": "passenger@railai.com",
  "avatarUrl": "https://cdn.railai.com/avatars/user100.png"
}
```

---

### 2.5 Change Password (`PUT /api/v1/users/change-password`)

**cURL:**
```bash
curl -X PUT "http://localhost:8080/api/v1/users/change-password" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "Password@123",
    "newPassword": "NewSecurePassword@456"
  }'
```

**Response (200 OK):**
```json
{
  "message": "Password updated successfully"
}
```

---

### 2.6 Fetch User Settings (`GET /api/v1/users/settings`)

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/users/settings" \
  -H "Authorization: Bearer <accessToken>"
```

**Response (200 OK):**
```json
{
  "userId": 100,
  "emailNotifications": true,
  "smsNotifications": false,
  "pushNotifications": true,
  "delayAlertThresholdMinutes": 15,
  "etaChangeAlerts": true,
  "theme": "DARK",
  "distanceUnit": "KM",
  "timeFormat": "H24",
  "autoRefreshIntervalSeconds": 30,
  "preferredTravelClass": "3A",
  "preferredBerthChoice": "SIDE_LOWER"
}
```

---

### 2.7 Update Notification Preferences (`PATCH /api/v1/users/settings/notifications`)

**cURL:**
```bash
curl -X PATCH "http://localhost:8080/api/v1/users/settings/notifications" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "emailNotifications": true,
    "pushNotifications": true,
    "smsNotifications": true,
    "delayAlertThresholdMinutes": 10,
    "etaChangeAlerts": true
  }'
```

**Response (200 OK):**
```json
{
  "userId": 100,
  "emailNotifications": true,
  "smsNotifications": true,
  "pushNotifications": true,
  "delayAlertThresholdMinutes": 10,
  "etaChangeAlerts": true,
  "theme": "DARK",
  "distanceUnit": "KM",
  "timeFormat": "H24"
}
```

---

## 🚆 3. Train Query, Route & Station API (`/api/v1/trains` & `/api/v1/stations`)

### 3.1 Search Trains (`GET /api/v1/trains/search`)

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/trains/search?q=Malwa"
```

**Response (200 OK):**
```json
{
  "query": "Malwa",
  "count": 1,
  "trains": [
    {
      "trainNumber": "12919",
      "trainName": "Malwa SF Express",
      "trainType": "Superfast Express",
      "sourceStationCode": "INDB",
      "sourceStationName": "Indore Junction",
      "destinationStationCode": "SVDK",
      "destinationStationName": "Shri Mata Vaishno Devi Katra",
      "runsOnDays": "mon,tue,wed,thu,fri,sat,sun",
      "distanceKm": 1640
    }
  ]
}
```

---

### 3.2 Fetch Train Details (`GET /api/v1/trains/{trainNumber}`)

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/trains/12919"
```

**Response (200 OK):**
```json
{
  "trainNumber": "12919",
  "trainName": "Malwa SF Express",
  "trainType": "Superfast Express",
  "category": "Superfast",
  "sourceStationCode": "INDB",
  "sourceStationName": "Indore Junction",
  "destinationStationCode": "SVDK",
  "destinationStationName": "Shri Mata Vaishno Devi Katra",
  "runsOnDays": "mon,tue,wed,thu,fri,sat,sun",
  "distanceKm": 1640,
  "durationMinutes": 1720,
  "routeStops": [
    {
      "sequence": 1,
      "stationCode": "INDB",
      "stationName": "Indore Junction",
      "isHalt": true,
      "scheduledArrivalTime": null,
      "scheduledDepartureTime": "23:55",
      "dayNumber": 1,
      "distanceKm": 0,
      "platform": "4",
      "latitude": 22.72,
      "longitude": 75.86
    },
    {
      "sequence": 2,
      "stationCode": "UJN",
      "stationName": "Ujjain Junction",
      "isHalt": true,
      "scheduledArrivalTime": "00:55",
      "scheduledDepartureTime": "01:00",
      "dayNumber": 1,
      "distanceKm": 55,
      "platform": "1",
      "latitude": 23.17,
      "longitude": 75.78
    }
  ]
}
```

---

### 3.3 Fetch Live Train Status (`GET /api/v1/trains/{trainNumber}/live`)

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/trains/12919/live?journeyDate=2026-09-06"
```

**Response (200 OK):**
```json
{
  "trainNumber": "12919",
  "trainName": "Malwa SF Express",
  "journeyDate": "2026-09-06",
  "status": "RUNNING",
  "delayMinutes": 12,
  "currentStationCode": "UJN",
  "currentSequence": 2,
  "previousStationCode": "INDB",
  "nextStationCode": "MKSM",
  "speedKmh": 65.5,
  "bearingDegrees": 180.0,
  "segmentProgress": 0.45,
  "isStaleData": false,
  "dataFreshnessSeconds": 45,
  "confidenceLevel": "HIGH",
  "lastUpdatedAt": "2026-09-06T15:16:00Z"
}
```

---

### 3.4 Fetch Train Route GIS Geometry & Station Locations (`GET /api/v1/trains/{trainNumber}/route`)

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/trains/12919/route"
```

**Response (200 OK):**
```json
{
  "trainNumber": "15119",
  "trainName": "Dehradun Janta Express",
  "sourceStationCode": "BNRS",
  "destinationStationCode": "DDN",
  "totalStops": 129,
  "totalDistanceKm": 825,
  "routeStations": [
    {
      "sequence": 1,
      "stationCode": "BNRS",
      "stationName": "Banaras",
      "latitude": 25.29926,
      "longitude": 82.97177,
      "isHalt": true
    },
    {
      "sequence": 2,
      "stationCode": "LOT",
      "stationName": "Lohta",
      "latitude": 25.3152018,
      "longitude": 82.9305862,
      "isHalt": false
    },
    {
      "sequence": 3,
      "stationCode": "BNKT",
      "stationName": "Bankat Halt",
      "latitude": 25.3176,
      "longitude": 82.9739,
      "isHalt": false
    },
    {
      "sequence": 4,
      "stationCode": "SWPR",
      "stationName": "Sewapuri",
      "latitude": 25.3508182,
      "longitude": 82.7692534,
      "isHalt": true
    }
  ],
  "routeCoordinates": [
    [25.29926, 82.97177],
    [25.3152, 82.93058],
    [25.3176, 82.9739],
    [25.35081, 82.76925]
  ],
  "geojson": {
    "type": "Feature",
    "properties": {
      "trainNumber": "15119"
    },
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [82.97177, 25.29926],
        [82.93058, 25.3152],
        [82.9739, 25.3176],
        [82.76925, 25.35081]
      ]
    }
  },
  "stops": [
    {
      "sequence": 1,
      "stationCode": "BNRS",
      "stationName": "Banaras",
      "isHalt": true,
      "scheduledArrivalTime": null,
      "scheduledDepartureTime": "08:20",
      "dayNumber": 1,
      "distanceKm": 0,
      "platform": "5",
      "latitude": 25.29926,
      "longitude": 82.97177
    },
    {
      "sequence": 2,
      "stationCode": "SWPR",
      "stationName": "Sewapuri",
      "isHalt": true,
      "scheduledArrivalTime": "08:48",
      "scheduledDepartureTime": "08:49",
      "dayNumber": 1,
      "distanceKm": 37,
      "platform": "2",
      "latitude": 25.3508182,
      "longitude": 82.7692534
    }
  ]
}
```

---

### 3.5 Find Trains Between Stations (`GET /api/v1/trains/between`)

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/trains/between?from=INDB&to=UJN"
```

**Response (200 OK):**
```json
[
  {
    "trainNumber": "12919",
    "trainName": "Malwa SF Express",
    "trainType": "Superfast Express",
    "sourceStationCode": "INDB",
    "sourceStationName": "Indore Junction",
    "destinationStationCode": "SVDK",
    "destinationStationName": "Shri Mata Vaishno Devi Katra",
    "runsOnDays": "mon,tue,wed,thu,fri,sat,sun",
    "distanceKm": 1640
  }
]
```

---

### 3.6 Fetch Station Master Metadata (`GET /api/v1/stations/{stationCode}`)

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/stations/UJN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "station": {
    "code": "UJN",
    "name": "Ujjain Junction",
    "zone": "WR",
    "division": "RTM",
    "latitude": 23.1765,
    "longitude": 75.7885,
    "totalPlatforms": 8
  }
}
```

---

### 3.7 Fetch Station Weather Metrics (`GET /api/v1/stations/{stationCode}/weather`)

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/stations/UJN/weather"
```

**Response (200 OK):**
```json
{
  "success": true,
  "stationCode": "UJN",
  "weather": {
    "temperatureC": 28.5,
    "humidityPercent": 65,
    "visibilityKm": 10.0,
    "weatherCondition": "CLEAR_SKY",
    "windSpeedKmh": 12.0
  }
}
```

---

### 3.8 Bulk Import Station JSON Data (`POST /api/v1/stations/import`)

**cURL:**
```bash
curl -X POST "http://localhost:8080/api/v1/stations/import" \
  -H "Content-Type: application/json" \
  -d '[
    { "code": "NDLS", "name": "New Delhi", "lat": 28.6424, "lng": 77.2195 },
    { "code": "BPL", "name": "Bhopal", "lat": 23.2599, "lng": 77.4126 }
  ]'
```

**Response (200 OK):**
```json
{
  "message": "Successfully imported 2 stations into the database."
}
```

---

## 🤖 4. Live ML ETA Microservice API (`/live-eta` & `/api/v1/trains/eta`)

### 4.1 Direct Live ETA by Train Number (`GET /live-eta/{train_number}`)

**cURL:**
```bash
curl -s "http://localhost:8080/live-eta/02570"
```

**Response (200 OK):**
```json
{
  "success": true,
  "method": "live_delay_ml_fresh_history_hybrid",
  "train_number": "02570",
  "train_name": "Darbhanga Special Fare Clone Special",
  "journey_date": "2026-09-06",
  "status": "running",
  "current_live_delay_minutes": 49.0,
  "ml_baseline_delay_minutes": 45.4,
  "historical_estimate_minutes": 0.0,
  "predicted_final_delay_minutes": 49.0,
  "predicted_destination_eta": "2026-09-07T10:49:00+05:30",
  "remaining_scheduled_minutes": 1144.0,
  "weights": {
    "current_live_delay": 0.45,
    "ml_baseline": 0.35,
    "fresh_history": 0.2
  }
}
```

---

### 4.2 Direct Live ETA by Query Parameter (`GET /live-eta?train_number={train_number}`)

**cURL:**
```bash
curl -s "http://localhost:8080/live-eta?train_number=02570"
```

**Response (200 OK):**
```json
{
  "success": true,
  "method": "live_delay_ml_fresh_history_hybrid",
  "train_number": "02570",
  "train_name": "Darbhanga Special Fare Clone Special",
  "journey_date": "2026-09-06",
  "status": "running",
  "current_live_delay_minutes": 49.0,
  "ml_baseline_delay_minutes": 45.4,
  "historical_estimate_minutes": 0.0,
  "predicted_final_delay_minutes": 49.0,
  "predicted_destination_eta": "2026-09-07T10:49:00+05:30",
  "remaining_scheduled_minutes": 1144.0,
  "weights": {
    "current_live_delay": 0.45,
    "ml_baseline": 0.35,
    "fresh_history": 0.2
  }
}
```

---

### 4.3 Live ETA via Trains API (`GET /api/v1/trains/live-eta/{trainNumber}`)

**cURL:**
```bash
curl -X GET "http://localhost:8080/api/v1/trains/live-eta/02570"
```

**Response (200 OK):**
```json
{
  "success": true,
  "method": "live_delay_ml_fresh_history_hybrid",
  "train_number": "02570",
  "train_name": "Darbhanga Special Fare Clone Special",
  "journey_date": "2026-09-06",
  "status": "running",
  "current_live_delay_minutes": 49.0,
  "ml_baseline_delay_minutes": 45.4,
  "historical_estimate_minutes": 0.0,
  "predicted_final_delay_minutes": 49.0,
  "predicted_destination_eta": "2026-09-07T10:49:00+05:30",
  "remaining_scheduled_minutes": 1144.0,
  "weights": {
    "current_live_delay": 0.45,
    "ml_baseline": 0.35,
    "fresh_history": 0.2
  }
}
```

---

### 4.4 Predict Dynamic ML ETA (`POST /api/v1/trains/eta/predict`)

**cURL:**
```bash
curl -X POST "http://localhost:8080/api/v1/trains/eta/predict?trainNumber=02570" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "success": true,
  "method": "live_delay_ml_fresh_history_hybrid",
  "train_number": "02570",
  "train_name": "Darbhanga Special Fare Clone Special",
  "journey_date": "2026-09-06",
  "status": "running",
  "current_live_delay_minutes": 49.0,
  "ml_baseline_delay_minutes": 45.4,
  "historical_estimate_minutes": 0.0,
  "predicted_final_delay_minutes": 49.0,
  "predicted_destination_eta": "2026-09-07T10:49:00+05:30",
  "remaining_scheduled_minutes": 1144.0,
  "weights": {
    "current_live_delay": 0.45,
    "ml_baseline": 0.35,
    "fresh_history": 0.2
  }
}
```
