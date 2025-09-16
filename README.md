# watchthis-user-service

User management service for WatchThis

## Getting started

Add a `.env` file and add some environment variables:

```text
BASE_URL=http://localhost:8583
MONGO_URL=mongodb://localhost:27017/user-service
SESSION_SECRET=verysecret
```

Install npm dependencies

```bash
npm install
```

Install mongodb

```bash
brew tap mongodb/brew
brew install mongodb-community
```

Run mongodb locally

```bash
brew services start mongodb/brew/mongodb-community
```

If you want a GUI to look at the database, i recommend

```bash
brew install mongodb-compass
```

## Build the source code

```bash
npm run build
```

## Run unit tests

```bash
npm run test
```

## Build CSS

```bash
npm run tailwind:css
```

## Run the server locally

```bash
npm run start
```

Visit http://localhost:8583 in your browser

## Run in development mode

```bash
npm run dev
```

This will automatically rebuild the source code and restart the server for you.

## Format code

The project uses ESLint and Prettier to ensure consistent coding standards.

```bash
npm run lint
npm run format
npm run package:lint
```

- `lint` will check for errors and fix formatting in `.ts` and `.js` files.
- `format` will apply format rules to all possible files.
- `package:lint` will warn of any inconsistencies in the `package.json` file.

## JWT Authentication

This service supports JWT-based authentication for API access. JWT tokens provide a stateless way to authenticate users across the WatchThis microservices.

### API Endpoints

#### Login with JWT

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "username": "your_username"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

#### Get Current User

```bash
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "username": "your_username"
    }
  }
}
```

#### Refresh Access Token

```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "username": "your_username"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

#### Convert Session to JWT Tokens

For services that need to convert web session authentication to JWT tokens (e.g., home service calling APIs):

```bash
GET /api/v1/auth/session-to-jwt
Cookie: connect.sid=<session_cookie>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "username": "your_username"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

**Error Response (No Session):**

```json
{
  "success": false,
  "error": {
    "code": "NO_SESSION",
    "message": "No valid session found"
  }
}
```

### Using JWT Tokens

#### Authentication Header

Include the JWT access token in the Authorization header for authenticated requests:

```bash
Authorization: Bearer <access_token>
```

#### Example with curl

```bash
# Login to get tokens
curl -X POST http://localhost:8583/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'

# Use access token for authenticated requests
curl -X GET http://localhost:8583/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"

# Refresh access token
curl -X POST http://localhost:8583/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

#### Example with JavaScript/fetch

```javascript
// Login
const loginResponse = await fetch("http://localhost:8583/api/v1/auth/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    username: "your_username",
    password: "your_password",
  }),
});

const { data } = await loginResponse.json();
const { accessToken, refreshToken } = data;

// Make authenticated requests
const userResponse = await fetch("http://localhost:8583/api/v1/auth/me", {
  method: "GET",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

// Refresh access token
const refreshResponse = await fetch("http://localhost:8583/api/v1/auth/refresh", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    refreshToken,
  }),
});

const { data } = await refreshResponse.json();
const { accessToken, refreshToken } = data;
```

### Token Configuration

JWT tokens can be configured via environment variables:

```bash
# JWT Secret (auto-generated if not provided)
JWT_SECRET=your-secret-key

# Access token expiration (default: 24h)
JWT_EXPIRES_IN=24h

# Refresh token expiration (default: 7d)
JWT_REFRESH_EXPIRES_IN=7d
```

### Error Responses

The API returns structured error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Common error codes

- `MISSING_CREDENTIALS` - Username or password not provided
- `INVALID_CREDENTIALS` - Invalid username or password
- `AUTHENTICATION_REQUIRED` - Valid JWT token required
- `INVALID_REFRESH_TOKEN` - Refresh token is invalid or expired
