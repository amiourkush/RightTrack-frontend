# RailAI â€” Frontend API Reference

> **Production Base URL (HTTP/REST):** `https://railai-yqqj.onrender.com`  
> **Production WebSocket URL:** `wss://railai-yqqj.onrender.com`  
> **Local Dev HTTP:** `http://localhost:8080`  
> **Local Dev WebSocket:** `ws://localhost:8080`

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User Profile & Settings](#2-user-profile--settings)
3. [Train Search & Info](#3-train-search--info)
4. [Train Live Status](#4-train-live-status)
5. [ETA / Arrival Predictions](#5-eta--arrival-predictions)
6. [Stations](#6-stations)
7. [WebSocket â€” Real-Time Live Train Tracking](#7-websocket--real-time-live-train-tracking)
8. [Error Responses](#8-error-responses)
9. [Frontend Integration Examples](#9-frontend-integration-examples)

---

## 1. Authentication

All auth endpoints are **public** (no token required unless noted).

Base path: `/api/v1/auth`

---

### 1.1 Register

Creates a new account and sends a 6-digit OTP to the email for verification.

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `https://railai-yqqj.onrender.com/api/v1/auth/register` |
| Auth | None |
| Content-Type | `application/json` |

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "MyPass@123",
  "fullName": "Vivek Yadav"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Must be a valid email |
| `password` | string | Yes | 8â€“72 chars, must contain letters + digits + special chars (`@$!%*?&#^()_+=~-`) |
| `fullName` | string | Yes | Non-blank |

**Response `200 OK`**

```json
{
  "message": "Registration successful. Please verify your email with the OTP sent."
}
```

---

### 1.2 Verify Email OTP

Verifies the 6-digit OTP sent during registration. Account becomes active after this step.

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `https://railai-yqqj.onrender.com/api/v1/auth/verify-email-otp` |
| Auth | None |

**Request Body**

```json
{
  "email": "user@example.com",
  "otp": "482910"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email |
| `otp` | string | Yes | Exactly 6 digits |

**Response `200 OK`**

```json
{
  "message": "Email verified successfully."
}
```

---

### 1.3 Resend OTP

Resends a new OTP to the registered email.

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `https://railai-yqqj.onrender.com/api/v1/auth/resend-otp` |
| Auth | None |

**Request Body**

```json
{
  "email": "user@example.com"
}
```

**Response `200 OK`**

```json
{
  "message": "OTP resent successfully."
}
```

---

### 1.4 Login

Authenticates a verified user. Returns `accessToken` and `refreshToken`.

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `https://railai-yqqj.onrender.com/api/v1/auth/login` |
| Auth | None |

**Request Body**

```json
{
  "email": "user@example.com",
  "password": "MyPass@123"
}
```

**Response `200 OK`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "tokenType": "Bearer",
  "accessTokenExpiresIn": 3600,
  "refreshTokenExpiresIn": 2592000,
  "user": {
    "id": 42,
    "email": "user@example.com",
    "fullName": "Vivek Yadav",
    "role": "USER"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `accessToken` | string | JWT â€” use in `Authorization: Bearer <token>` header |
| `refreshToken` | string | Long-lived token to get new access tokens |
| `tokenType` | string | Always `"Bearer"` |
| `accessTokenExpiresIn` | number | Seconds until access token expires |
| `refreshTokenExpiresIn` | number | Seconds until refresh token expires |
| `user.id` | number | Internal user ID |
| `user.email` | string | Account email |
| `user.fullName` | string | Display name |
| `user.role` | string | `USER`, `ADMIN`, or `CONTROL_ROOM` |

---

### 1.5 Google Login

Signs in or registers a user via Google OAuth. Pass the Firebase / Google `idToken`.

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `https://railai-yqqj.onrender.com/api/v1/auth/google` |
| Auth | None |

**Request Body**

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `idToken` | string | Yes | Google / Firebase ID token |

**Response `200 OK`** â€” Same as [Login response](#14-login).

---

### 1.6 Refresh Token

Gets a new `accessToken` using a valid `refreshToken`.

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `https://railai-yqqj.onrender.com/api/v1/auth/refresh` |
| Auth | None |

**Request Body**

```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response `200 OK`** â€” Same as [Login response](#14-login).

---

### 1.7 Logout

Invalidates the refresh token server-side.

| Field | Value |
|-------|-------|
| Method | `POST` |
| URL | `https://railai-yqqj.onrender.com/api/v1/auth/logout` |
| Auth | None (but pass the refresh token) |

**Request Body**

```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g..."
}
```

**Response `200 OK`**

```json
{
  "message": "Logged out successfully."
}
```

---

### 1.8 Get Current User (Protected)

Returns the basic identity of the authenticated user.

| Field | Value |
|-------|-------|
| Method | `GET` |
| URL | `https://railai-yqqj.onrender.com/api/v1/auth/me` |
| Auth | `Authorization: Bearer <accessToken>` |

**Response `200 OK`**

```json
{
  "id": 42,
  "email": "user@example.com",
  "fullName": "Vivek Yadav",
  "role": "USER"
}
```

---

## 2. User Profile & Settings

All endpoints in this section **require** `Authorization: Bearer <accessToken>`.

Base path: `/api/v1/users`

---

### 2.1 Get Full Account (Protected)

Returns the complete account: identity + profile + settings in one call.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/users/me` |

**Response `200 OK`**

```json
{
  "userId": 42,
  "email": "user@example.com",
  "fullName": "Vivek Yadav",
  "role": "USER",
  "emailVerified": true,
  "profile": {
    "id": 1,
    "userId": 42,
    "email": "user@example.com",
    "fullName": "Vivek Yadav",
    "phoneNumber": "+919876543210",
    "avatarUrl": "https://cdn.example.com/avatars/vivek.png",
    "preferredLanguage": "en",
    "startStationCode": "NDLS",
    "destinationStationCode": "BSB",
    "bio": "Rail enthusiast",
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-09-06T14:00:00Z"
  },
  "settings": {
    "id": 1,
    "userId": 42,
    "emailNotifications": true,
    "smsNotifications": false,
    "pushNotifications": true,
    "delayAlertThresholdMinutes": 15,
    "etaChangeAlerts": true,
    "theme": "dark",
    "distanceUnit": "km",
    "timeFormat": "24h",
    "autoRefreshLiveStatus": true,
    "autoRefreshIntervalSeconds": 60,
    "defaultTravelClass": "SL",
    "berthPreference": "LOWER",
    "updatedAt": "2026-09-06T14:00:00Z"
  }
}
```

---

### 2.2 Get Profile (Protected)

Returns only the user's profile details.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/users/profile` |

**Response `200 OK`**

```json
{
  "id": 1,
  "userId": 42,
  "email": "user@example.com",
  "fullName": "Vivek Yadav",
  "phoneNumber": "+919876543210",
  "avatarUrl": "https://cdn.example.com/avatars/vivek.png",
  "preferredLanguage": "en",
  "startStationCode": "NDLS",
  "destinationStationCode": "BSB",
  "bio": "Rail enthusiast",
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-09-06T14:00:00Z"
}
```

---

### 2.3 Update Profile (Protected)

Updates profile fields. All fields are optional â€” only provided fields are updated.

| Method | `PUT` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/users/profile` |

**Request Body**

```json
{
  "fullName": "Vivek Kumar Yadav",
  "phoneNumber": "+919876543210",
  "avatarUrl": "https://cdn.example.com/avatars/vivek.png",
  "preferredLanguage": "hi",
  "startStationCode": "NDLS",
  "destinationStationCode": "CNB",
  "bio": "Frequent traveller on Rajdhani Express"
}
```

| Field | Type | Max Length | Description |
|-------|------|-----------|-------------|
| `fullName` | string | 150 | Display name |
| `phoneNumber` | string | 30 | Phone with country code |
| `avatarUrl` | string | 512 | URL to avatar image |
| `preferredLanguage` | string | 10 | Language code e.g. `en`, `hi` |
| `startStationCode` | string | 10 | Default origin station code |
| `destinationStationCode` | string | 10 | Default destination station code |
| `bio` | string | 500 | User bio |

**Response `200 OK`** â€” Returns updated profile object (same as 2.2).

---

### 2.4 Update Avatar (Protected)

Shortcut to update only the avatar URL.

| Method | `POST` |
|--------|--------|
| URL | `https://railai-yqqj.onrender.com/api/v1/users/profile/avatar` |

**Request Body**

```json
{
  "avatarUrl": "https://cdn.example.com/avatars/vivek_new.png"
}
```

| Field | Type | Required | Max Length |
|-------|------|----------|-----------|
| `avatarUrl` | string | Yes | 512 |

**Response `200 OK`** â€” Returns updated profile object.

---

### 2.5 Change Password (Protected)

| Method | `PUT` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/users/change-password` |

**Request Body**

```json
{
  "oldPassword": "MyOldPass@123",
  "newPassword": "MyNewPass@456"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `oldPassword` | string | Yes | Current password |
| `newPassword` | string | Yes | Min 8 characters |

**Response `200 OK`**

```json
{
  "message": "Password updated successfully"
}
```

---

### 2.6 Get Settings (Protected)

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/users/settings` |

**Response `200 OK`**

```json
{
  "id": 1,
  "userId": 42,
  "emailNotifications": true,
  "smsNotifications": false,
  "pushNotifications": true,
  "delayAlertThresholdMinutes": 15,
  "etaChangeAlerts": true,
  "theme": "dark",
  "distanceUnit": "km",
  "timeFormat": "24h",
  "autoRefreshLiveStatus": true,
  "autoRefreshIntervalSeconds": 60,
  "defaultTravelClass": "SL",
  "berthPreference": "LOWER",
  "updatedAt": "2026-09-06T14:00:00Z"
}
```

---

### 2.7 Update Settings (Protected)

Updates all or some settings. All fields are optional.

| Method | `PUT` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/users/settings` |

**Request Body**

```json
{
  "emailNotifications": true,
  "smsNotifications": false,
  "pushNotifications": true,
  "delayAlertThresholdMinutes": 20,
  "etaChangeAlerts": true,
  "theme": "dark",
  "distanceUnit": "km",
  "timeFormat": "24h",
  "autoRefreshLiveStatus": true,
  "autoRefreshIntervalSeconds": 60,
  "defaultTravelClass": "3A",
  "berthPreference": "LOWER"
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `emailNotifications` | boolean | â€” |
| `smsNotifications` | boolean | â€” |
| `pushNotifications` | boolean | â€” |
| `delayAlertThresholdMinutes` | integer | 1â€“120 |
| `etaChangeAlerts` | boolean | â€” |
| `theme` | string | Max 20 chars (`dark`, `light`) |
| `distanceUnit` | string | Max 10 chars (`km`, `miles`) |
| `timeFormat` | string | Max 10 chars (`24h`, `12h`) |
| `autoRefreshLiveStatus` | boolean | â€” |
| `autoRefreshIntervalSeconds` | integer | 5â€“600 |
| `defaultTravelClass` | string | Max 10 chars (`SL`, `3A`, `2A`, `1A`) |
| `berthPreference` | string | Max 20 chars (`LOWER`, `UPPER`, `SIDE_LOWER`) |

**Response `200 OK`** â€” Returns full settings object (same as 2.6).

---

### 2.8 Update Notification Settings (Protected)

Partial update â€” only notification-related settings.

| Method | `PATCH` |
|--------|---------|
| URL | `https://railai-yqqj.onrender.com/api/v1/users/settings/notifications` |

**Request Body**

```json
{
  "emailNotifications": false,
  "smsNotifications": true,
  "pushNotifications": true,
  "delayAlertThresholdMinutes": 10,
  "etaChangeAlerts": false
}
```

**Response `200 OK`** â€” Returns full settings object.

---

### 2.9 Update Display Settings (Protected)

Partial update â€” only display/refresh-related settings.

| Method | `PATCH` |
|--------|---------|
| URL | `https://railai-yqqj.onrender.com/api/v1/users/settings/display` |

**Request Body**

```json
{
  "theme": "light",
  "distanceUnit": "km",
  "timeFormat": "12h",
  "autoRefreshLiveStatus": true,
  "autoRefreshIntervalSeconds": 30
}
```

**Response `200 OK`** â€” Returns full settings object.

---

### 2.10 Delete Account (Protected)

Permanently deletes the authenticated user's account.

| Method | `DELETE` |
|--------|---------|
| URL | `https://railai-yqqj.onrender.com/api/v1/users/account` |
| Alt URL | `https://railai-yqqj.onrender.com/api/v1/users/me` |

**Response `200 OK`**

```json
{
  "message": "Account deleted successfully."
}
```

---

## 3. Train Search & Info

All endpoints in this section are **public** (no auth required).

Base path: `/api/v1/trains`

---

### 3.1 Search Trains (GET)

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/search` |

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Train number, name, or station code |

**Example**

```
GET https://railai-yqqj.onrender.com/api/v1/trains/search?q=Rajdhani
```

**Response `200 OK`**

```json
{
  "query": "Rajdhani",
  "count": 2,
  "trains": [
    {
      "trainNumber": "12301",
      "trainName": "Howrah Rajdhani Express",
      "trainType": "RAJDHANI",
      "sourceStationCode": "HWH",
      "sourceStationName": "Howrah Junction",
      "destinationStationCode": "NDLS",
      "destinationStationName": "New Delhi",
      "runsOnDays": "Mon,Wed,Thu,Fri,Sat,Sun",
      "distanceKm": 1451
    }
  ]
}
```

---

### 3.2 Search Trains (POST)

Same result as GET search, but accepts a JSON body.

| Method | `POST` |
|--------|--------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/search` |

**Request Body** (or use `?q=` query param â€” both work)

```json
{
  "query": "12301"
}
```

**Response** â€” Same as [3.1](#31-search-trains-get).

---

### 3.3 Get Train Details

Returns full train information including complete stop list.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/{trainNumber}` |

**Path Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `trainNumber` | string | e.g. `12301` |

**Example**

```
GET https://railai-yqqj.onrender.com/api/v1/trains/12301
```

**Response `200 OK`**

```json
{
  "trainNumber": "12301",
  "trainName": "Howrah Rajdhani Express",
  "trainType": "RAJDHANI",
  "category": "MAIL_EXPRESS",
  "sourceStationCode": "HWH",
  "sourceStationName": "Howrah Junction",
  "destinationStationCode": "NDLS",
  "destinationStationName": "New Delhi",
  "runsOnDays": "Mon,Wed,Thu,Fri,Sat,Sun",
  "distanceKm": 1451,
  "durationMinutes": 1020,
  "routeStops": [
    {
      "sequence": 1,
      "stationCode": "HWH",
      "stationName": "Howrah Junction",
      "isHalt": true,
      "scheduledArrivalTime": null,
      "scheduledDepartureTime": "16:55",
      "dayNumber": 1,
      "distanceKm": 0,
      "platform": "9",
      "latitude": 22.5839,
      "longitude": 88.3424
    },
    {
      "sequence": 2,
      "stationCode": "DKAE",
      "stationName": "Dankuni",
      "isHalt": false,
      "scheduledArrivalTime": "17:13",
      "scheduledDepartureTime": "17:14",
      "dayNumber": 1,
      "distanceKm": 17,
      "platform": null,
      "latitude": 22.6095,
      "longitude": 88.2739
    }
  ]
}
```

---

### 3.4 Get Train Route

Returns route geometry and stop list. Supports GeoJSON format for mapping.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/{trainNumber}/route` |

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | string | No | Pass `geojson` to get raw GeoJSON output |
| `stops` | boolean | No | `true` to include halt-only stops in GeoJSON |

**Example â€” Plain route:**

```
GET https://railai-yqqj.onrender.com/api/v1/trains/12301/route
```

**Response `200 OK`** (plain)

```json
{
  "trainNumber": "12301",
  "trainName": "Howrah Rajdhani Express",
  "sourceStationCode": "HWH",
  "destinationStationCode": "NDLS",
  "totalStops": 6,
  "totalDistanceKm": 1451,
  "routeStations": [
    {
      "sequence": 1,
      "stationCode": "HWH",
      "stationName": "Howrah Junction",
      "latitude": 22.5839,
      "longitude": 88.3424,
      "isHalt": true
    }
  ],
  "routeCoordinates": [[88.3424, 22.5839], [88.4000, 22.9000]],
  "geojson": null,
  "stops": []
}
```

**Example â€” GeoJSON format:**

```
GET https://railai-yqqj.onrender.com/api/v1/trains/12301/route?format=geojson&stops=true
```

Response body: raw GeoJSON string (`Content-Type: application/json`).

---

### 3.5 Get Train Run Details

Returns the real-time run record for a specific train on a specific date.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/{trainNumber}/runs/{journeyDate}` |

**Path Parameters**

| Param | Type | Format | Description |
|-------|------|--------|-------------|
| `trainNumber` | string | â€” | e.g. `22436` |
| `journeyDate` | string | `YYYY-MM-DD` | e.g. `2026-09-06` |

**Example**

```
GET https://railai-yqqj.onrender.com/api/v1/trains/22436/runs/2026-09-06
```

**Response `200 OK`**

```json
{
  "trainNumber": "22436",
  "journeyDate": "2026-09-06",
  "status": "completed",
  "currentStationCode": "BSB",
  "currentSequence": 117,
  "delayMinutes": -6,
  "lastUpdatedAt": "2026-09-06T18:45:00Z"
}
```

---

### 3.6 Search Trains Between Stations (Query Params)

Finds trains running between two stations on a given date.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/between` |

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | Yes | Origin station code e.g. `NDLS` |
| `to` | string | Yes | Destination station code e.g. `BSB` |
| `journeyDate` | string | No | `YYYY-MM-DD` (defaults to today) |

**Example**

```
GET https://railai-yqqj.onrender.com/api/v1/trains/between?from=NDLS&to=BSB&journeyDate=2026-09-10
```

**Response `200 OK`** â€” Array of train summaries

```json
[
  {
    "trainNumber": "22436",
    "trainName": "New Delhi - Varanasi Vande Bharat Express",
    "trainType": "VANDE_BHARAT",
    "sourceStationCode": "NDLS",
    "sourceStationName": "New Delhi",
    "destinationStationCode": "BSB",
    "destinationStationName": "Varanasi Junction",
    "runsOnDays": "Mon,Tue,Wed,Thu,Fri,Sat",
    "distanceKm": 784
  }
]
```

---

### 3.7 Search Trains Between Stations (Path Params)

Alternate URL with station codes in path (same result as 3.6).

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/between/{from}/{to}` |

**Path Parameters** â€” `from` and `to` station codes.

**Query Parameters**

| Param | Type | Required |
|-------|------|----------|
| `journeyDate` | string | No (`YYYY-MM-DD`) |

**Example**

```
GET https://railai-yqqj.onrender.com/api/v1/trains/between/NDLS/BSB?journeyDate=2026-09-10
```

---

## 4. Train Live Status

All endpoints are **public** (no auth required).

Base path: `/api/v1/trains`

---

### 4.1 Get Live Status (short path)

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/{trainNumber}/live` |

**Query Parameters**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `journeyDate` | string | No | `YYYY-MM-DD` (defaults to today) |

**Example**

```
GET https://railai-yqqj.onrender.com/api/v1/trains/22436/live?journeyDate=2026-09-06
```

**Response `200 OK`**

```json
{
  "trainNumber": "22436",
  "trainName": "New Delhi - Varanasi Vande Bharat Express",
  "journeyDate": "2026-09-06",
  "status": "completed",
  "delayMinutes": -6,
  "currentStationCode": "BSB",
  "currentSequence": 117,
  "previousHaltCode": "PRYJ",
  "nextHaltCode": null,
  "speedKmh": null,
  "bearingDegrees": null,
  "segmentProgress": null,
  "locationAvailable": false,
  "latitude": null,
  "longitude": null,
  "dataFreshnessSeconds": 18543,
  "confidenceLevel": "LOW",
  "lastUpdatedAt": "2026-09-06T13:45:00Z"
}
```

**Response Field Reference**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `running`, `completed`, `delayed`, `UNKNOWN` |
| `delayMinutes` | integer | Negative = early, positive = late |
| `currentStationCode` | string or null | Current/last known station |
| `currentSequence` | integer or null | Stop number in the route |
| `previousHaltCode` | string or null | Previous halt station |
| `nextHaltCode` | string or null | Next scheduled halt station |
| `speedKmh` | number or null | Current speed (if GPS available) |
| `bearingDegrees` | number or null | Direction 0â€“360 degrees |
| `segmentProgress` | number or null | 0.0â€“1.0 progress between stations |
| `locationAvailable` | boolean | Whether GPS coordinates are available |
| `latitude` | number or null | Latitude (if locationAvailable is true) |
| `longitude` | number or null | Longitude (if locationAvailable is true) |
| `dataFreshnessSeconds` | integer | Age of data in seconds |
| `confidenceLevel` | string | `HIGH`, `MEDIUM`, `LOW` |
| `lastUpdatedAt` | string or null | ISO-8601 timestamp of last update |

---

### 4.2 Get Live Status (dedicated path)

Identical response to 4.1, served at a dedicated URL.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/{trainNumber}/live-status` |

**Query Parameters** â€” same as 4.1 (`journeyDate`).

---

### 4.3 Get Train Location

Returns only location/GPS telemetry for a train.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/{trainNumber}/location` |

**Query Parameters**

| Param | Type | Required |
|-------|------|----------|
| `journeyDate` | string | No (`YYYY-MM-DD`) |

**Response `200 OK`**

```json
{
  "trainNumber": "22436",
  "journeyDate": "2026-09-06",
  "locationAvailable": true,
  "latitude": 25.3176,
  "longitude": 82.9739,
  "speedKmh": 108.5,
  "bearingDegrees": 125.0,
  "segmentProgress": 0.73,
  "currentStationCode": "MGS",
  "lastUpdatedAt": "2026-09-06T10:15:00Z",
  "dataFreshnessSeconds": 90,
  "confidenceLevel": "HIGH"
}
```

---

### 4.4 Trigger Async Refresh

Triggers a background re-fetch of live data from the upstream provider. Non-blocking â€” returns immediately.

| Method | `POST` |
|--------|--------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/{trainNumber}/refresh` |

**Query Parameters**

| Param | Type | Required |
|-------|------|----------|
| `journeyDate` | string | No (`YYYY-MM-DD`) |

**Response `202 Accepted`**

```json
{
  "status": "ACCEPTED",
  "message": "Asynchronous refresh triggered for train 22436",
  "trainNumber": "22436",
  "journeyDate": "2026-09-06",
  "timestamp": "2026-09-06T15:30:00Z"
}
```

> Use this if you want to force-refresh stale data. The actual updated status will appear in the next live status poll or WebSocket push.

---

## 5. ETA / Arrival Predictions

All endpoints are **public** (no auth required).

---

### 5.1 Get Live ML ETA (path variable)

Fetches ML-predicted ETA from the live ETA microservice. **Primary recommended endpoint.**

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/live-eta/{trainNumber}` |
| Alt URL | `https://railai-yqqj.onrender.com/api/v1/trains/{trainNumber}/live-eta` |

**Example**

```
GET https://railai-yqqj.onrender.com/api/v1/trains/live-eta/22436
```

**Response `200 OK`**

```json
{
  "success": true,
  "method": "hybrid_weighted",
  "train_number": "22436",
  "train_name": "New Delhi - Varanasi Vande Bharat Express",
  "journey_date": "2026-09-06",
  "status": "running",
  "current_live_delay_minutes": 12.0,
  "ml_baseline_delay_minutes": 10.5,
  "historical_estimate_minutes": 8.0,
  "predicted_final_delay_minutes": 11.2,
  "predicted_destination_eta": "2026-09-06T18:35:00+05:30",
  "remaining_scheduled_minutes": 62.0,
  "weights": {
    "live": 0.6,
    "ml": 0.25,
    "historical": 0.15
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether prediction succeeded |
| `method` | string | Prediction method used |
| `train_number` | string | Train number |
| `train_name` | string | Train name |
| `journey_date` | string | Date of journey |
| `status` | string | Train status |
| `current_live_delay_minutes` | number | Current delay from live tracking |
| `ml_baseline_delay_minutes` | number | ML model's baseline estimate |
| `historical_estimate_minutes` | number | Historical average delay |
| `predicted_final_delay_minutes` | number | Final blended delay prediction |
| `predicted_destination_eta` | string | ETA at destination (ISO-8601) |
| `remaining_scheduled_minutes` | number | Remaining scheduled travel time |
| `weights` | object | Blend weights (`live`, `ml`, `historical`) |

---

### 5.2 Get Live ML ETA (query param)

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/live-eta` |

**Query Parameters** (one required)

| Param | Type | Description |
|-------|------|-------------|
| `train_number` | string | Train number (snake_case) |
| `trainNumber` | string | Train number (camelCase) |
| `q` | string | Train number (generic) |

**Example**

```
GET https://railai-yqqj.onrender.com/api/v1/trains/live-eta?train_number=22436
```

**Response** â€” Same as [5.1](#51-get-live-ml-eta-path-variable).

---

### 5.3 Get Train ETA with Per-Station Breakdown

Returns ML ETA if available, otherwise falls back to per-station predictions.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/{trainNumber}/eta` |

**Query Parameters**

| Param | Type | Required |
|-------|------|----------|
| `journeyDate` | string | No (`YYYY-MM-DD`) |

**Example**

```
GET https://railai-yqqj.onrender.com/api/v1/trains/22436/eta?journeyDate=2026-09-06
```

**Response `200 OK`** â€” If ML succeeds, returns the `LiveEtaMlResponse` (see 5.1). Otherwise returns:

```json
{
  "trainNumber": "22436",
  "trainName": "New Delhi - Varanasi Vande Bharat Express",
  "journeyDate": "2026-09-06",
  "currentStationCode": "MGS",
  "currentDelayMinutes": 12,
  "dataFreshnessSeconds": 90,
  "overallConfidenceLevel": "HIGH",
  "predictedAt": "2026-09-06T10:20:00Z",
  "stationEtas": [
    {
      "trainNumber": "22436",
      "journeyDate": "2026-09-06",
      "stationCode": "CNB",
      "stationName": "Kanpur Central",
      "scheduledArrivalTime": "09:45",
      "scheduledDepartureTime": "09:50",
      "predictedArrival": "2026-09-06T04:17:00Z",
      "predictedDeparture": "2026-09-06T04:22:00Z",
      "predictedDelayMinutes": 12,
      "confidenceScore": 0.87,
      "confidenceLevel": "HIGH",
      "predictionSource": "ML_MODEL",
      "predictedAt": "2026-09-06T10:20:00Z"
    }
  ]
}
```

---

### 5.4 Get Station ETA

ETA prediction for one specific station on a train's route.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/{trainNumber}/eta/{stationCode}` |

**Path Parameters**

| Param | Description |
|-------|-------------|
| `trainNumber` | e.g. `22436` |
| `stationCode` | e.g. `CNB` |

**Query Parameters**

| Param | Type | Required |
|-------|------|----------|
| `journeyDate` | string | No (`YYYY-MM-DD`) |

**Example**

```
GET https://railai-yqqj.onrender.com/api/v1/trains/22436/eta/CNB?journeyDate=2026-09-06
```

**Response `200 OK`** â€” Single station ETA object (same fields as items in `stationEtas` from 5.3).

---

### 5.5 Predict ETA (POST)

Sends train number and optional location to the ML ETA model.

| Method | `POST` |
|--------|--------|
| URL | `https://railai-yqqj.onrender.com/api/v1/trains/eta/predict` |

**Request Body** (or use query params `trainNumber` / `train_number`)

```json
{
  "trainNumber": 22436,
  "latitude": 25.3176,
  "longitude": 82.9739,
  "destinationStation": "BSB"
}
```

| Field | Type | Required |
|-------|------|----------|
| `trainNumber` | integer | Yes |
| `latitude` | number | No |
| `longitude` | number | No |
| `destinationStation` | string | No |

**Response `200 OK`** â€” Returns `LiveEtaMlResponse` (see 5.1) if ML succeeds. Otherwise returns:

```json
{
  "trainNumber": 22436,
  "destinationStation": "BSB",
  "status": "RUNNING",
  "primaryDelayFactor": "TRAFFIC_CONGESTION",
  "liveSpeedKmh": 108.5,
  "currentDelayMinutes": 12.0,
  "trainsAhead": 1,
  "unscheduledStopCount": 0,
  "scheduledArrival": "2026-09-06T18:25:00+05:30",
  "predictedDelayMinutes": 11.2,
  "dynamicEta": "2026-09-06T18:36:00+05:30",
  "weatherSummary": {
    "isMonsoonSeason": 1,
    "isFogRisk": 0,
    "fogRiskScore": 0.1,
    "seasonSeverityScore": 0.65,
    "temperatureC": 32.5,
    "precipitationMm": 4.2,
    "visibilityMeters": 8000.0,
    "windSpeedKmh": 18.0
  },
  "confidenceLevel": "HIGH",
  "predictionSource": "ML_HYBRID"
}
```

---

### 5.6 Root Live ETA (path variable)

Convenience alias â€” no `/api/v1/trains` prefix needed.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/live-eta/{trainNumber}` |

**Response** â€” Same as [5.1](#51-get-live-ml-eta-path-variable).

---

### 5.7 Root Live ETA (query param)

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/live-eta` |

**Query Parameters** â€” `train_number`, `trainNumber`, or `q`.

**Response** â€” Same as [5.1](#51-get-live-ml-eta-path-variable).

---

## 6. Stations

All endpoints are **public** (no auth required).

Base path: `/api/v1/stations`

---

### 6.1 Get Station Details

Returns station metadata including coordinates, zone, facilities.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/stations/{stationCode}` |

**Path Parameters**

| Param | Description |
|-------|-------------|
| `stationCode` | Station code e.g. `NDLS`, `BSB`, `CNB` |

**Example**

```
GET https://railai-yqqj.onrender.com/api/v1/stations/NDLS
```

**Response `200 OK`** â€” Raw JSON proxied from RailRadar upstream. Typical shape:

```json
{
  "stationCode": "NDLS",
  "stationName": "New Delhi",
  "latitude": 28.6419,
  "longitude": 77.2194,
  "zone": "NR",
  "division": "DLI",
  "platforms": 16,
  "facilities": ["wifi", "food_court", "parking"],
  "upcomingArrivals": []
}
```

---

### 6.2 Get Station Weather

Returns current weather conditions at the station's location.

| Method | `GET` |
|--------|-------|
| URL | `https://railai-yqqj.onrender.com/api/v1/stations/{stationCode}/weather` |

**Example**

```
GET https://railai-yqqj.onrender.com/api/v1/stations/NDLS/weather
```

**Response `200 OK`** â€” Raw JSON from upstream weather API. Typical shape:

```json
{
  "stationCode": "NDLS",
  "temperature": 34.2,
  "feelsLike": 38.0,
  "humidity": 72,
  "weatherCondition": "Partly Cloudy",
  "windSpeedKmh": 14.5,
  "visibilityKm": 8.0,
  "isMonsoon": true,
  "isFog": false,
  "updatedAt": "2026-09-06T15:00:00Z"
}
```

---

## 7. WebSocket â€” Real-Time Live Train Tracking

The WebSocket connection is **public** (no authentication required).

---

### 7.1 Connection URLs

| Environment | URL |
|-------------|-----|
| **Production (recommended)** | `wss://railai-yqqj.onrender.com/trains/{trainNumber}/live` |
| Production alt 1 | `wss://railai-yqqj.onrender.com/ws/trains/{trainNumber}/live` |
| Production alt 2 (generic) | `wss://railai-yqqj.onrender.com/trains/live` |
| Production alt 3 (generic) | `wss://railai-yqqj.onrender.com/ws/train-status` |
| Local Dev | `ws://localhost:8080/trains/{trainNumber}/live` |

**Recommended Connection URL:**

```
wss://railai-yqqj.onrender.com/trains/{trainNumber}/live?date=YYYY-MM-DD
```

**URL Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `date` | string | Journey date `YYYY-MM-DD`. Defaults to today. |
| `journeyDate` | string | Alias for `date` |
| `trainNumber` | string | Train number (only needed for generic paths) |

---

### 7.2 Auto-Subscribe via URL

If you connect to a URL containing `{trainNumber}` in the path, the server **automatically subscribes** you to that train and immediately sends `LIVE_STATUS_INITIAL`. No subscribe message needed.

**Example â€” auto subscribe:**
```
wss://railai-yqqj.onrender.com/trains/22436/live?date=2026-09-06
```
On connect: server immediately sends `LIVE_STATUS_INITIAL`.

**Example â€” manual subscribe required (generic path):**
```
wss://railai-yqqj.onrender.com/trains/live
```
On connect: server sends `CONNECTED`. You must then send a `subscribe` action.

---

### 7.3 Client to Server Messages

Send JSON text frames to control your subscription.

---

#### Subscribe

```json
{
  "action": "subscribe",
  "trainNumber": "22436",
  "date": "2026-09-06"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `action` | string | Yes | `"subscribe"` (case-insensitive) |
| `trainNumber` | string | Yes | Train number |
| `date` | string | No | `YYYY-MM-DD` or use `journeyDate`. Defaults to today. |

After subscribing, server immediately sends `LIVE_STATUS_INITIAL`, then pushes `LIVE_STATUS_UPDATE` every 60 seconds.

---

#### Unsubscribe

```json
{
  "action": "unsubscribe",
  "trainNumber": "22436",
  "date": "2026-09-06"
}
```

Server responds with `UNSUBSCRIBED`.

---

#### Ping (Heartbeat)

```json
{
  "action": "ping"
}
```

Server responds with `PONG`. Send every **30â€“45 seconds** to keep the connection alive.

---

### 7.4 Server to Client Messages

All messages are JSON. Use the `type` field to identify message type.

---

#### CONNECTED

Sent when connecting via a generic URL (no train number in path).

```json
{
  "type": "CONNECTED",
  "message": "WebSocket connected. Send {\"action\": \"subscribe\", \"trainNumber\": \"12168\"} to listen for live updates."
}
```

---

#### LIVE_STATUS_INITIAL

Sent immediately after auto-subscribe (via URL) or after a `subscribe` action. Contains the current live state.

```json
{
  "type": "LIVE_STATUS_INITIAL",
  "trainNumber": "22436",
  "journeyDate": "2026-09-06",
  "data": {
    "trainNumber": "22436",
    "trainName": "New Delhi - Varanasi Vande Bharat Express",
    "status": "completed",
    "delayMinutes": -6,
    "currentStationCode": "BSB",
    "currentSequence": 117,
    "previousHaltCode": "PRYJ",
    "nextHaltCode": null,
    "speedKmh": null,
    "bearingDegrees": null,
    "segmentProgress": null,
    "locationAvailable": false,
    "latitude": null,
    "longitude": null,
    "dataFreshnessSeconds": 18543,
    "confidenceLevel": "LOW",
    "lastUpdatedAt": "2026-09-06T13:45:00Z"
  }
}
```

---

#### LIVE_STATUS_UPDATE

Pushed **every 60 seconds** automatically while connection is active. Same structure as `LIVE_STATUS_INITIAL`.

```json
{
  "type": "LIVE_STATUS_UPDATE",
  "trainNumber": "22436",
  "journeyDate": "2026-09-06",
  "data": {
    "trainNumber": "22436",
    "trainName": "New Delhi - Varanasi Vande Bharat Express",
    "status": "running",
    "delayMinutes": 5,
    "currentStationCode": "MGS",
    "currentSequence": 89,
    "previousHaltCode": "CNB",
    "nextHaltCode": "PRYJ",
    "speedKmh": 108.5,
    "bearingDegrees": 125.0,
    "segmentProgress": 0.73,
    "locationAvailable": true,
    "latitude": 25.3176,
    "longitude": 82.9739,
    "dataFreshnessSeconds": 45,
    "confidenceLevel": "HIGH",
    "lastUpdatedAt": "2026-09-06T10:15:00Z"
  }
}
```

> **Note:** The `data` field may also include additional fields from the RailRadar provider API when upstream data is richer.

---

#### UNSUBSCRIBED

Sent after a successful `unsubscribe` action.

```json
{
  "type": "UNSUBSCRIBED",
  "trainNumber": "22436"
}
```

---

#### PONG

Response to a `ping` heartbeat.

```json
{
  "type": "PONG",
  "timestamp": 1788694042193
}
```

---

#### ERROR

Sent when something goes wrong.

```json
{
  "type": "ERROR",
  "message": "Failed to fetch live status for train 22436"
}
```

**Possible error messages:**

| Scenario | Message |
|----------|---------|
| Unknown action sent | `"Unknown or invalid action. Supported: subscribe, unsubscribe, ping"` |
| Invalid JSON payload | `"Invalid JSON payload format"` |
| Live fetch fails | `"Failed to fetch live status for train {trainNumber}"` |

---

### 7.5 How the 1-Minute Polling Works

1. When you connect to a train URL or send `subscribe`, the backend **immediately** fetches live data from RailRadar and sends `LIVE_STATUS_INITIAL`.
2. A **background scheduler** fires every **60 seconds**.
3. On each tick, it polls RailRadar **only for trains with at least one active WebSocket connection** (no wasted polling for idle trains).
4. After fetching, the updated data is broadcast as `LIVE_STATUS_UPDATE` to all sessions subscribed to that train.
5. When you disconnect, your session is removed. When no sessions remain for a train, background polling for that train stops automatically.

---

## 8. Error Responses

All REST errors follow this shape:

```json
{
  "message": "Authentication required",
  "status": 401,
  "timestamp": "2026-09-06T15:30:00Z"
}
```

**HTTP Status Codes**

| Status | Meaning |
|--------|---------|
| `400 Bad Request` | Validation error â€” check request body |
| `401 Unauthorized` | Missing or invalid JWT token |
| `403 Forbidden` | Valid token, insufficient role |
| `404 Not Found` | Train, station, or resource not found |
| `202 Accepted` | Async operation accepted (e.g. refresh trigger) |
| `500 Internal Server Error` | Server-side error |

---

## 9. Frontend Integration Examples

### Base URLs

```js
const HTTP_BASE = 'https://railai-yqqj.onrender.com';
const WS_BASE   = 'wss://railai-yqqj.onrender.com';
```

---

### Auth Headers Helper

```js
function authHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  };
}
```

---

### Login and Store Tokens

```js
async function login(email, password) {
  const res = await fetch(`${HTTP_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) throw new Error(`Login failed: ${res.status}`);

  const data = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}
```

---

### Refresh Access Token

```js
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  const res = await fetch(`${HTTP_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  const data = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  return data.accessToken;
}
```

---

### Fetch Train Details

```js
async function getTrainDetails(trainNumber) {
  const res = await fetch(`${HTTP_BASE}/api/v1/trains/${trainNumber}`);
  if (!res.ok) throw new Error(`Train not found: ${res.status}`);
  return res.json();
}
```

---

### Search Trains Between Stations

```js
async function searchBetween(from, to, journeyDate) {
  const params = new URLSearchParams({ from, to });
  if (journeyDate) params.set('journeyDate', journeyDate);

  const res = await fetch(`${HTTP_BASE}/api/v1/trains/between?${params}`);
  return res.json(); // Returns array of TrainSummaryResponse
}
```

---

### Get ML ETA

```js
async function getLiveEta(trainNumber) {
  const res = await fetch(`${HTTP_BASE}/api/v1/trains/live-eta/${trainNumber}`);
  return res.json();
}
```

---

### WebSocket Client â€” Vanilla JavaScript

```js
class TrainLiveTracker {
  constructor(trainNumber, date, onUpdate, onError) {
    this.trainNumber = trainNumber;
    this.date = date || new Date().toISOString().split('T')[0];
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.ws = null;
    this.pingInterval = null;
    this.reconnectTimeout = null;
    this.reconnectDelay = 3000;
    this.connect();
  }

  connect() {
    const url = `${WS_BASE}/trains/${this.trainNumber}/live?date=${this.date}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log(`[RailAI WS] Connected: train ${this.trainNumber}`);
      this.reconnectDelay = 3000; // Reset backoff
      // Start heartbeat every 30 seconds
      this.pingInterval = setInterval(() => {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ action: 'ping' }));
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'LIVE_STATUS_INITIAL':
        case 'LIVE_STATUS_UPDATE':
          this.onUpdate(msg.data, msg.type);
          break;
        case 'PONG':
          // heartbeat ok
          break;
        case 'ERROR':
          if (this.onError) this.onError(msg.message);
          break;
      }
    };

    this.ws.onclose = () => {
      console.log(`[RailAI WS] Disconnected. Reconnecting in ${this.reconnectDelay}ms`);
      clearInterval(this.pingInterval);
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // max 30s
        this.connect();
      }, this.reconnectDelay);
    };

    this.ws.onerror = (err) => {
      console.error('[RailAI WS] Error:', err);
    };
  }

  disconnect() {
    clearInterval(this.pingInterval);
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect loop
      this.ws.close();
    }
  }
}

// Usage
const tracker = new TrainLiveTracker(
  '22436',
  '2026-09-06',
  (data, type) => {
    console.log(`[${type}] Status: ${data.status} | Delay: ${data.delayMinutes} min`);
    console.log(`Current station: ${data.currentStationCode}`);
    if (data.locationAvailable) {
      console.log(`GPS: ${data.latitude}, ${data.longitude} at ${data.speedKmh} km/h`);
    }
  },
  (errMsg) => console.error('WS Error:', errMsg)
);

// Stop when done:
// tracker.disconnect();
```

---

### React / Next.js Hook

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';

const HTTP_BASE = 'https://railai-yqqj.onrender.com';
const WS_BASE   = 'wss://railai-yqqj.onrender.com';

/**
 * Hook for real-time live train tracking.
 * Fetches static train info via HTTP and streams live status via WebSocket.
 */
export function useTrainLiveTracking(trainNumber, journeyDate) {
  const [liveStatus, setLiveStatus]   = useState(null);
  const [trainInfo, setTrainInfo]     = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError]             = useState(null);

  const wsRef           = useRef(null);
  const pingRef         = useRef(null);
  const reconnectRef    = useRef(null);
  const reconnectDelay  = useRef(3000);

  const date = journeyDate || new Date().toISOString().split('T')[0];

  // Fetch static train info once on mount
  useEffect(() => {
    if (!trainNumber) return;
    fetch(`${HTTP_BASE}/api/v1/trains/${trainNumber}`)
      .then(r => r.json())
      .then(setTrainInfo)
      .catch(err => console.error('Failed to fetch train info:', err));
  }, [trainNumber]);

  const connect = useCallback(() => {
    if (!trainNumber) return;

    const url = `${WS_BASE}/trains/${trainNumber}/live?date=${date}`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectDelay.current = 3000;

      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: 'ping' }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'LIVE_STATUS_INITIAL' || msg.type === 'LIVE_STATUS_UPDATE') {
        setLiveStatus(msg.data);
        setLastUpdated(new Date());
      }
      if (msg.type === 'ERROR') {
        setError(msg.message);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      clearInterval(pingRef.current);
      reconnectRef.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => setError('WebSocket connection error');
  }, [trainNumber, date]);

  useEffect(() => {
    connect();
    return () => {
      clearInterval(pingRef.current);
      clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { liveStatus, trainInfo, isConnected, lastUpdated, error };
}
```

**Example component using the hook:**

```jsx
function TrainTracker({ trainNumber }) {
  const { liveStatus, trainInfo, isConnected, lastUpdated, error } =
    useTrainLiveTracking(trainNumber, '2026-09-06');

  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>{trainInfo?.trainName ?? trainNumber}</h2>
      <span style={{ color: isConnected ? 'green' : 'red' }}>
        {isConnected ? 'Live' : 'Reconnecting...'}
      </span>

      {liveStatus ? (
        <div>
          <p>Status: {liveStatus.status}</p>
          <p>Current Station: {liveStatus.currentStationCode ?? 'N/A'}</p>
          <p>Delay: {liveStatus.delayMinutes} min
            {liveStatus.delayMinutes < 0 ? ' (early)' : liveStatus.delayMinutes > 0 ? ' (late)' : ' (on time)'}
          </p>
          <p>Confidence: {liveStatus.confidenceLevel}</p>
          {liveStatus.locationAvailable && (
            <p>GPS: {liveStatus.latitude.toFixed(4)}, {liveStatus.longitude.toFixed(4)}
              {liveStatus.speedKmh != null ? ` at ${liveStatus.speedKmh} km/h` : ''}
            </p>
          )}
        </div>
      ) : (
        <p>Loading live data...</p>
      )}

      {lastUpdated && (
        <small>Last updated: {lastUpdated.toLocaleTimeString()}</small>
      )}
    </div>
  );
}
```

---

*Generated from source: `/src/main/java/com/example/railai/**` â€” controllers, DTOs, and WebSocket handlers. For discrepancies, the source files are authoritative.*
