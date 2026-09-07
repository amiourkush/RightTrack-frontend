# RailAI API Documentation
**Base URL:** `https://railai-yqqj.onrender.com`
**Format:** All requests/responses use `Content-Type: application/json` unless noted.
**Auth scheme:** `Authorization: Bearer <accessToken>` (obtained from Login / Google / Refresh)

This collection is organized into 4 folders, matching the subsystems:

| Folder | Base Path | Auth Needed? |
|---|---|---|
| 🔐 Auth & Security | `/api/v1/auth` | Mixed (see table) |
| 👤 User Profile & Settings | `/api/v1/users` | Yes (all endpoints) |
| 🚉 Station & Weather | `/api/v1/stations` | No |
| 🚆 Train & Live Telemetry | `/api/v1/trains` | No |

**Legend for tables below:**
🔓 = No auth required 🔒 = Requires `Authorization: Bearer <accessToken>` 👮 = Requires specific role

---

## 📁 Folder 1: Auth & Security (`/api/v1/auth`)

### Flow summary
- **Email/Password:** Register → Verify OTP → Login → use Access Token → Refresh when expired → Logout
- **Google OAuth:** Client gets Google `idToken` → POST to `/auth/google` → tokens returned immediately (new users auto-verified)

### Endpoint Index

| # | Method | Endpoint | Auth |
|---|---|---|---|
| 1.1 | `POST` | `/api/v1/auth/register` | 🔓 |
| 1.2 | `POST` | `/api/v1/auth/verify-email-otp` | 🔓 |
| 1.3 | `POST` | `/api/v1/auth/resend-otp` | 🔓 |
| 1.4 | `POST` | `/api/v1/auth/login` | 🔓 |
| 1.5 | `POST` | `/api/v1/auth/google` | 🔓 |
| 1.6 | `POST` | `/api/v1/auth/refresh` | 🔓 |
| 1.7 | `POST` | `/api/v1/auth/logout` | 🔓 |
| 1.8 | `GET` | `/api/v1/auth/me` | 🔒 |
| 1.9 | `GET` | `/api/v1/auth/admin` | 👮 `ADMIN` |
| 1.10 | `GET` | `/api/v1/auth/control-room` | 👮 `CONTROL_ROOM`, `ADMIN` |

---

### 1.1 Register User
`POST /api/v1/auth/register` 🔓

**Headers**
```
Content-Type: application/json
```

**Body (required)**
```json
{
  "email": "passenger@railai.com",
  "password": "Password@123",
  "fullName": "Rahul Sharma"
}
```
| Field | Type | Required | Notes |
|---|---|---|---|
| email | string | ✅ | Must be unique |
| password | string | ✅ | Plain text over TLS; hashed server-side |
| fullName | string | ✅ | |

**Response `200 OK`**
```json
{ "message": "Registration successful. Verify the OTP sent to your email." }
```

---

### 1.2 Verify Email OTP
`POST /api/v1/auth/verify-email-otp` 🔓

**Body (required)**
```json
{
  "email": "passenger@railai.com",
  "otp": "123456"
}
```
| Field | Type | Required |
|---|---|---|
| email | string | ✅ |
| otp | string (6 digits) | ✅ |

**Response `200 OK`**
```json
{ "message": "Email verified successfully." }
```
> Effect: sets `emailVerified = true` on the account.

---

### 1.3 Resend Verification OTP
`POST /api/v1/auth/resend-otp` 🔓

**Body (required)**
```json
{ "email": "passenger@railai.com" }
```

**Response `200 OK`**
```json
{ "message": "If the account exists, a new OTP has been sent." }
```
> Note: response is intentionally identical whether or not the account exists (prevents email enumeration).

---

### 1.4 Login
`POST /api/v1/auth/login` 🔓

**Body (required)**
```json
{
  "email": "passenger@railai.com",
  "password": "Password@123"
}
```

**Response `200 OK`**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
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
> `accessTokenExpiresIn` / `refreshTokenExpiresIn` are in **seconds** (900s = 15 min, 604800s = 7 days).
> Save `accessToken` as a Postman collection variable, e.g. `{{accessToken}}`, and use it in the `Authorization` header of all 🔒 requests.

---

### 1.5 Continue with Google
`POST /api/v1/auth/google` 🔓

**Body (required)**
```json
{ "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..." }
```
| Field | Type | Required | Notes |
|---|---|---|---|
| idToken | string | ✅ | Google Sign-In ID token from client-side Google auth |

**Response `200 OK`**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "accessTokenExpiresIn": 900,
  "refreshTokenExpiresIn": 604800,
  "user": {
    "id": 100,
    "email": "rahul.sharma@gmail.com",
    "fullName": "Rahul Sharma",
    "role": "PASSENGER"
  }
}
```
> New users are auto-provisioned with `emailVerified = true`, `authProvider = GOOGLE`, and a synced Google profile picture. Existing users are linked to the Google provider.

---

### 1.6 Refresh Access Token
`POST /api/v1/auth/refresh` 🔓

**Body (required)**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiJ9..." }
```

**Response `200 OK`**
```json
{
  "accessToken": "new_access_token_here",
  "refreshToken": "new_refresh_token_here",
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

### 1.7 Logout
`POST /api/v1/auth/logout` 🔓

**Body (required)**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiJ9..." }
```

**Response `200 OK`**
```json
{ "message": "Logged out successfully" }
```
> Revokes the given refresh token so it can no longer be exchanged.

---

### 1.8 Fetch Authenticated User Summary
`GET /api/v1/auth/me` 🔒

**Headers (required)**
```
Authorization: Bearer <accessToken>
```
**Body:** none

**Response `200 OK`**
```json
{
  "id": 100,
  "email": "passenger@railai.com",
  "fullName": "Rahul Sharma",
  "role": "PASSENGER"
}
```

---

### 1.9 Admin Resource Check
`GET /api/v1/auth/admin` 👮 Role: `ADMIN`

**Headers (required)**
```
Authorization: Bearer <admin_accessToken>
```
**Body:** none

**Response `200 OK`** (plain text)
```
Admin access granted
```

---

### 1.10 Control Room Resource Check
`GET /api/v1/auth/control-room` 👮 Roles: `CONTROL_ROOM`, `ADMIN`

**Headers (required)**
```
Authorization: Bearer <control_room_accessToken>
```
**Body:** none

**Response `200 OK`** (plain text)
```
Control room access granted
```

---

## 📁 Folder 2: User Profile & Settings (`/api/v1/users`)

> ⚠️ **Every endpoint in this folder requires** `Authorization: Bearer <accessToken>`.

### Endpoint Index

| # | Method | Endpoint | Description |
|---|---|---|---|
| 2.1 | `GET` | `/api/v1/users/me` | Full account overview (user + profile + settings) |
| 2.2 | `GET` | `/api/v1/users/profile` | Fetch profile only |
| 2.3 | `PUT` | `/api/v1/users/profile` | Update profile (full replace of profile fields) |
| 2.4 | `POST` | `/api/v1/users/profile/avatar` | Update avatar URL |
| 2.5 | `PUT` | `/api/v1/users/change-password` | Change password |
| 2.6 | `GET` | `/api/v1/users/settings` | Fetch all settings |
| 2.7 | `PUT` | `/api/v1/users/settings` | Replace all settings |
| 2.8 | `PATCH` | `/api/v1/users/settings/notifications` | Partial update — notification prefs only |
| 2.9 | `PATCH` | `/api/v1/users/settings/display` | Partial update — display/UI prefs only |

**Reference — allowed enum values:**
| Field | Allowed values |
|---|---|
| `theme` | `LIGHT`, `DARK`, `SYSTEM` |
| `distanceUnit` | `KM`, `MILES` |
| `timeFormat` | `H12`, `H24` |
| `preferredTravelClass` | `SL`, `3A`, `2A`, `1A`, `CC`, `2S` |
| `preferredBerthChoice` | `LOWER`, `MIDDLE`, `UPPER`, `SIDE_LOWER`, `SIDE_UPPER`, `NO_PREFERENCE` |

---

### 2.1 Get Full Account Overview
`GET /api/v1/users/me` 🔒
**Body:** none

**Response `200 OK`**
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

### 2.2 Fetch Profile
`GET /api/v1/users/profile` 🔒
**Body:** none

**Response `200 OK`**
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

### 2.3 Update Profile
`PUT /api/v1/users/profile` 🔒

**Body (required)**
```json
{
  "fullName": "Rahul Sharma",
  "phoneNumber": "+919876543210",
  "preferredLanguage": "en",
  "startStationCode": "INDB",
  "destinationStationCode": "BPL",
  "bio": "Updated Bio: Travel enthusiast"
}
```
| Field | Type | Notes |
|---|---|---|
| fullName | string | |
| phoneNumber | string | E.164-style, e.g. `+91XXXXXXXXXX` |
| preferredLanguage | string | ISO language code, e.g. `en` |
| startStationCode | string | Station code, e.g. `INDB` |
| destinationStationCode | string | Station code, e.g. `BPL` |
| bio | string | |

**Response `200 OK`**
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
  "bio": "Updated Bio: Travel enthusiast"
}
```

---

### 2.4 Update Profile Avatar
`POST /api/v1/users/profile/avatar` 🔒

**Body (required)**
```json
{ "avatarUrl": "https://cdn.railai.com/avatars/user100.png" }
```

**Response `200 OK`**
```json
{
  "userId": 100,
  "fullName": "Rahul Sharma",
  "email": "passenger@railai.com",
  "phoneNumber": "+919876543210",
  "avatarUrl": "https://cdn.railai.com/avatars/user100.png",
  "preferredLanguage": "en",
  "startStationCode": "INDB",
  "destinationStationCode": "BPL",
  "bio": "Updated Bio: Travel enthusiast"
}
```

---

### 2.5 Change Password
`PUT /api/v1/users/change-password` 🔒

**Body (required)**
```json
{
  "currentPassword": "OldPassword@123",
  "newPassword": "NewSecurePassword@456"
}
```
| Field | Type | Required |
|---|---|---|
| currentPassword | string | ✅ — verified before change |
| newPassword | string | ✅ |

**Response `200 OK`**
```json
{ "message": "Password updated successfully" }
```

---

### 2.6 Fetch User Settings
`GET /api/v1/users/settings` 🔒
**Body:** none

**Response `200 OK`**
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

### 2.7 Replace All Settings
`PUT /api/v1/users/settings` 🔒

**Body (required — full replace, send all fields)**
```json
{
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
**Response `200 OK`**: same shape as [2.6](#26-fetch-user-settings), reflecting the new values.

---

### 2.8 Update Notification Preferences (partial)
`PATCH /api/v1/users/settings/notifications` 🔒

**Body (send only the fields you want to change)**
```json
{
  "emailNotifications": true,
  "pushNotifications": true,
  "smsNotifications": true,
  "delayAlertThresholdMinutes": 10,
  "etaChangeAlerts": true
}
```
| Field | Type |
|---|---|
| emailNotifications | boolean |
| smsNotifications | boolean |
| pushNotifications | boolean |
| delayAlertThresholdMinutes | integer (minutes) |
| etaChangeAlerts | boolean |

**Response `200 OK`**
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
  "timeFormat": "H24",
  "autoRefreshIntervalSeconds": 30,
  "preferredTravelClass": "3A",
  "preferredBerthChoice": "SIDE_LOWER"
}
```

---

### 2.9 Update Display Preferences (partial)
`PATCH /api/v1/users/settings/display` 🔒

**Body (send only the fields you want to change)**
```json
{
  "theme": "SYSTEM",
  "distanceUnit": "KM",
  "timeFormat": "H12",
  "autoRefreshIntervalSeconds": 15
}
```
| Field | Type | Allowed values |
|---|---|---|
| theme | string | `LIGHT`, `DARK`, `SYSTEM` |
| distanceUnit | string | `KM`, `MILES` |
| timeFormat | string | `H12`, `H24` |
| autoRefreshIntervalSeconds | integer | seconds between live-status auto-refresh |

**Response `200 OK`**
```json
{
  "userId": 100,
  "emailNotifications": true,
  "smsNotifications": true,
  "pushNotifications": true,
  "delayAlertThresholdMinutes": 10,
  "etaChangeAlerts": true,
  "theme": "SYSTEM",
  "distanceUnit": "KM",
  "timeFormat": "H12",
  "autoRefreshIntervalSeconds": 15,
  "preferredTravelClass": "3A",
  "preferredBerthChoice": "SIDE_LOWER"
}
```

---

## 📁 Folder 3: Station & Weather (`/api/v1/stations`)

> Integrates with external **RailRadar API** (`GET /v1/stations/{code}` and `/weather`) via server-side `Authorization: Bearer <API_KEY>` forwarding — client callers do **not** need to supply this key.

### Endpoint Index

| # | Method | Endpoint | Auth |
|---|---|---|---|
| 3.1 | `GET` | `/api/v1/stations/{stationCode}` | 🔓 |
| 3.2 | `GET` | `/api/v1/stations/{stationCode}/weather` | 🔓 |

---

### 3.1 Fetch Station Master Details
`GET /api/v1/stations/{stationCode}` 🔓

**Path Params**
| Param | Example | Notes |
|---|---|---|
| stationCode | `UJN` | Official station code |

**Example**
```
GET /api/v1/stations/UJN
Accept: application/json
```
**Body:** none

**Response `200 OK`**
```json
{
  "success": true,
  "station": {
    "code": "UJN",
    "name": "Ujjain Junction",
    "zone": "WR",
    "division": "RTM",
    "latitude": 23.17,
    "longitude": 75.78,
    "totalPlatforms": 8
  }
}
```

---

### 3.2 Fetch Station Weather Metrics
`GET /api/v1/stations/{stationCode}/weather` 🔓

**Path Params**
| Param | Example |
|---|---|
| stationCode | `UJN` |

**Example**
```
GET /api/v1/stations/UJN/weather
Accept: application/json
```
**Body:** none

**Response `200 OK`**
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

## 📁 Folder 4: Train & Live Telemetry (`/api/v1/trains`)

### How ingestion works (context for testers)
- Searching for a train (4.1 / 4.2) triggers **search-driven ingestion**: the train number is logged, and a background job starts polling RailRadar.
- Reads (live status, location, ETA, etc.) are served instantly (~5–10ms) from the local database — they never wait on the external API.
- Background polling for a given train **auto-stops after 30 minutes** with no new searches for it. Use 4.12 (`/refresh`) to force an out-of-band update.

### Endpoint Index

| # | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| 4.1 | `POST` | `/api/v1/trains/search` | 🔓 | Search by JSON body |
| 4.2 | `GET` | `/api/v1/trains/search?q={query}` | 🔓 | Search by query string |
| 4.3 | `GET` | `/api/v1/trains/{trainNumber}` | 🔓 | Master details + timetable |
| 4.4 | `GET` | `/api/v1/trains/{trainNumber}/route` | 🔓 | Route stops or GIS geometry |
| 4.5 | `GET` | `/api/v1/trains/{trainNumber}/live` | 🔓 | Live status (short) |
| 4.6 | `GET` | `/api/v1/trains/{trainNumber}/live-status` | 🔓 | Live status (detailed) |
| 4.7 | `GET` | `/api/v1/trains/{trainNumber}/location` | 🔓 | GPS telemetry |
| 4.8 | `GET` | `/api/v1/trains/{trainNumber}/runs/{journeyDate}` | 🔓 | Specific run instance |
| 4.9 | `GET` | `/api/v1/trains/{trainNumber}/eta` | 🔓 | Full-route ETA forecast |
| 4.10 | `GET` | `/api/v1/trains/{trainNumber}/eta/{stationCode}` | 🔓 | Single-station ETA |
| 4.11 | `GET` | `/api/v1/trains/between` | 🔓 | Trains between two stations |
| 4.12 | `POST` | `/api/v1/trains/{trainNumber}/refresh` | 🔓 | Force async refresh |

---

### 4.1 Search Trains (POST)
`POST /api/v1/trains/search` 🔓

**Body (required)**
```json
{ "query": "12919" }
```
> `query` can be a train number or (partial) train name.

**Response `200 OK`**
```json
{
  "query": "12919",
  "totalResults": 1,
  "results": [
    {
      "trainNumber": "12919",
      "trainName": "Malwa SF Express",
      "trainType": "Superfast Express",
      "category": "Superfast",
      "sourceStationCode": "INDB",
      "sourceStationName": "Indore Junction",
      "destinationStationCode": "SVDK",
      "destinationStationName": "Shri Mata Vaishno Devi Katra"
    }
  ]
}
```

---

### 4.2 Search Trains (GET query string)
`GET /api/v1/trains/search?q={query}` 🔓

**Query Params**
| Param | Example | Required |
|---|---|---|
| q | `Malwa` | ✅ |

**Example**
```
GET /api/v1/trains/search?q=Malwa
```
**Body:** none
**Response:** same shape as 4.1.

---

### 4.3 Master Train Details
`GET /api/v1/trains/{trainNumber}` 🔓

**Path Params**
| Param | Example |
|---|---|
| trainNumber | `12919` |

**Body:** none

**Response `200 OK`**
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
      "dayNumber": 2,
      "distanceKm": 55,
      "platform": "1",
      "latitude": 23.17,
      "longitude": 75.78
    }
  ]
}
```

---

### 4.4 Route Schedule & GIS Track Geometry
`GET /api/v1/trains/{trainNumber}/route` 🔓

**Path Params**
| Param | Example |
|---|---|
| trainNumber | `12919` |

**Query Params (all optional)**
| Param | Values | Default | Notes |
|---|---|---|---|
| format | `geojson`, `polyline`, `coordinates` | *(omit for timetable stops)* | Selects response shape |
| stops | `true`, `false` | `false` | Only relevant with `format=geojson` |

**4.4a — Default: Timetable stops**
```
GET /api/v1/trains/12919/route
```

**4.4b — GeoJSON**
```
GET /api/v1/trains/12919/route?format=geojson&stops=true
```
```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [[75.86, 22.72], [75.78, 23.17]]
  },
  "properties": {
    "trainNumber": "12919",
    "stopsIncluded": true,
    "stops": [
      { "code": "INDB", "name": "Indore Junction", "sequence": 1, "lat": 22.72, "lng": 75.86 },
      { "code": "UJN", "name": "Ujjain Junction", "sequence": 2, "lat": 23.17, "lng": 75.78 }
    ]
  }
}
```

**4.4c — Encoded polyline**
```
GET /api/v1/trains/12919/route?format=polyline
```
```json
{
  "success": true,
  "trainNumber": "12919",
  "format": "polyline",
  "polyline": "m|bbC_ov{M_s@~vA",
  "stops": false
}
```

**4.4d — Raw coordinates**
```
GET /api/v1/trains/12919/route?format=coordinates
```
```json
{
  "success": true,
  "trainNumber": "12919",
  "format": "coordinates",
  "coordinates": [[22.72, 75.86], [23.17, 75.78]],
  "stops": false
}
```

---

### 4.5 Live Train Status (short)
`GET /api/v1/trains/{trainNumber}/live` 🔓

**Path Params:** `trainNumber` (e.g. `12919`)
**Body:** none
> Short-form summary variant — see 4.6 for the detailed version with the full field set below.

---

### 4.6 Detailed Live Running Status
`GET /api/v1/trains/{trainNumber}/live-status` 🔓

**Path Params:** `trainNumber` (e.g. `12919`)

**Query Params**
| Param | Example | Required |
|---|---|---|
| journeyDate | `2026-06-22` | Recommended (defaults may vary by server config) |

**Example**
```
GET /api/v1/trains/12919/live-status?journeyDate=2026-06-22
```
**Body:** none

**Response `200 OK`**
```json
{
  "trainNumber": "12919",
  "trainName": "Malwa SF Express",
  "journeyDate": "2026-06-22",
  "status": "RUNNING",
  "delayMinutes": 12,
  "currentStationCode": "UJN",
  "currentSequence": 2,
  "previousHaltCode": "INDB",
  "nextHaltCode": "MKSM",
  "speedKmh": 65.5,
  "bearingDegrees": 180.0,
  "segmentProgress": 0.45,
  "locationAvailable": false,
  "latitude": null,
  "longitude": null,
  "dataFreshnessSeconds": 45,
  "confidenceLevel": "HIGH",
  "lastUpdatedAt": "2026-06-22T07:14:00Z"
}
```

---

### 4.7 Live GPS Telemetry
`GET /api/v1/trains/{trainNumber}/location` 🔓

**Path Params:** `trainNumber` (e.g. `12919`)
**Body:** none
> Returns current GPS position and speed telemetry for the train (see `latitude`/`longitude`/`speedKmh`-style fields as in 4.6, when `locationAvailable` is `true`).

---

### 4.8 Specific Train Run Instance
`GET /api/v1/trains/{trainNumber}/runs/{journeyDate}` 🔓

**Path Params**
| Param | Example | Notes |
|---|---|---|
| trainNumber | `12919` | |
| journeyDate | `2026-06-22` | Format `YYYY-MM-DD` |

**Example**
```
GET /api/v1/trains/12919/runs/2026-06-22
```
**Body:** none

---

### 4.9 Full Route ETA Forecast
`GET /api/v1/trains/{trainNumber}/eta` 🔓

**Path Params:** `trainNumber` (e.g. `12919`)

**Query Params**
| Param | Example | Required |
|---|---|---|
| journeyDate | `2026-06-22` | Recommended |

**Example**
```
GET /api/v1/trains/12919/eta?journeyDate=2026-06-22
```
**Body:** none

**Response `200 OK`**
```json
{
  "trainNumber": "12919",
  "trainName": "Malwa SF Express",
  "journeyDate": "2026-06-22",
  "currentStationCode": "UJN",
  "currentDelayMinutes": 12,
  "dataFreshnessSeconds": 45,
  "overallConfidenceLevel": "HIGH",
  "predictedAt": "2026-06-22T07:14:00Z",
  "stationEtas": [
    {
      "trainNumber": "12919",
      "journeyDate": "2026-06-22",
      "stationCode": "UJN",
      "stationName": "Ujjain Junction",
      "scheduledArrivalTime": "00:55",
      "scheduledDepartureTime": "01:00",
      "predictedArrival": "2026-06-23T01:07:00Z",
      "predictedDeparture": "2026-06-23T01:12:00Z",
      "predictedDelayMinutes": 12,
      "confidenceScore": 0.92,
      "confidenceLevel": "HIGH",
      "predictionSource": "HEURISTIC_TELEMETRY_ENGINE",
      "predictedAt": "2026-06-22T07:14:00Z"
    }
  ]
}
```

---

### 4.10 Single Station ETA Prediction
`GET /api/v1/trains/{trainNumber}/eta/{stationCode}` 🔓

**Path Params**
| Param | Example |
|---|---|
| trainNumber | `12919` |
| stationCode | `UJN` |

**Example**
```
GET /api/v1/trains/12919/eta/UJN
```
**Body:** none
> Returns a single object matching one entry of the `stationEtas` array shown in 4.9.

---

### 4.11 Trains Between Stations
`GET /api/v1/trains/between` 🔓

Supports **two calling styles** — query params or path variables:

**Style A — Query params**
```
GET /api/v1/trains/between?from=INDB&to=UJN&journeyDate=2026-06-22
```
| Param | Example | Required |
|---|---|---|
| from | `INDB` | ✅ |
| to | `UJN` | ✅ |
| journeyDate | `2026-06-22` | Optional |

**Style B — Path variables**
```
GET /api/v1/trains/between/INDB/UJN?journeyDate=2026-06-22
```

**Body:** none

**Response `200 OK`**
```json
[
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
    "durationMinutes": 1720
  }
]
```

---

### 4.12 Async Refresh Trigger
`POST /api/v1/trains/{trainNumber}/refresh` 🔓

**Path Params:** `trainNumber` (e.g. `12919`)

**Query Params**
| Param | Example | Required |
|---|---|---|
| journeyDate | `2026-06-22` | Optional |

**Example**
```
POST /api/v1/trains/12919/refresh?journeyDate=2026-06-22
```
**Body:** none

**Response `202 Accepted`**
```json
{
  "status": "ACCEPTED",
  "message": "Asynchronous refresh triggered for train 12919",
  "trainNumber": "12919",
  "journeyDate": "2026-06-22",
  "timestamp": "2026-06-22T12:30:00.123456Z"
}
```
> Fire-and-forget: forces an out-of-band ingestion cycle instead of waiting for the next scheduled poll.

---

## Quick Setup Guide for Postman

1. **Create a Postman Environment** with variables:
   - `baseUrl` = `https://railai-yqqj.onrender.com`
   - `accessToken` = *(set after login)*
   - `refreshToken` = *(set after login)*
2. **Run 1.1 → 1.2 → 1.4** (Register → Verify OTP → Login) to obtain tokens.
3. In Postman's **Tests** tab on the Login/Refresh requests, add a script to auto-save tokens:
   ```javascript
   const data = pm.response.json();
   pm.environment.set("accessToken", data.accessToken);
   pm.environment.set("refreshToken", data.refreshToken);
   ```
4. On every 🔒 request, set header `Authorization: Bearer {{accessToken}}`.
5. Use `{{baseUrl}}` as the prefix for every request URL, e.g. `{{baseUrl}}/api/v1/auth/login`.
