# watchthis-user-service

User management service for WatchThis - provides user authentication, session management, and JWT token generation.

## Prerequisites

- **Node.js** (v18 or later)
- **PostgreSQL** (v16 or later)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up PostgreSQL

Install PostgreSQL (if not already installed):

```bash
# On macOS with Homebrew
brew install postgresql@16
brew services start postgresql@16
```

Create a database user and database:

```bash
# Connect to PostgreSQL
psql postgres

# Create user and database
CREATE USER watchthis WITH PASSWORD 'watchthis_dev';
CREATE DATABASE watchthis_user OWNER watchthis;
GRANT ALL PRIVILEGES ON DATABASE watchthis_user TO watchthis;

# Exit PostgreSQL
\q
```

### 3. Configure Environment

```bash
# Setup environment variables
cp .env.local .env
# Edit .env if needed for your local setup
```

### 4. Initialize Database

Create the database tables using Prisma:

```bash
# Push schema to database (creates tables)
npm run database:setup

# Generate Prisma client (should already be done)
npx prisma generate
```

### 5. Set Up Test Database

The tests use a separate database to avoid interfering with development data:

```bash
# Create test database
createdb watchthis_user_test
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE watchthis_user_test TO watchthis;"

# Initialize test database schema
npm run database:test:setup
```

**Note:** Tests automatically load configuration from `.env.test` which points to the separate test database.

### 6. Optional: Database GUI

For a PostgreSQL GUI, we recommend:

```bash
# pgAdmin (web-based)
brew install --cask pgadmin4

# Or TablePlus (native app)
brew install --cask tableplus

# Or use Prisma Studio
npx prisma studio
```

## Development Workflow

### Build the source code

```bash
npm run build
```

### Run unit tests

```bash
npm run test
```

**Note:** Tests use a separate test database. The test suite will automatically clean up data between tests.

### Build CSS

```bash
npm run tailwind:css
```

### Run the server locally

```bash
npm run start
```

Visit http://localhost:8583 in your browser to see the web interface.

### Run in development mode

```bash
npm run dev
```

This will automatically:

- Rebuild TypeScript source code when files change
- Restart the server
- Rebuild CSS when Tailwind classes change

## Code Quality

The project uses ESLint and Prettier to ensure consistent coding standards.

```bash
# Check and fix TypeScript/JavaScript files
npm run lint

# Format all files
npm run format

# Check package.json consistency
npm run package:lint

# Run all checks
npm run lint && npm run format && npm run package:lint
```

## Architecture

### Database Schema

The service uses PostgreSQL with Prisma ORM:

- **Users table**: Stores user credentials and profile information
- **Sessions table**: Manages web session data (replaces connect-mongo)

### Authentication Methods

1. **Web Sessions**: Traditional cookie-based authentication for web interface
2. **JWT Tokens**: Stateless API authentication for microservices communication

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Passport.js + JWT
- **Session Store**: PostgreSQL (connect-pg-simple)
- **Frontend**: Pug templates + TailwindCSS
- **Testing**: Node.js built-in test runner

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

## Production Deployment

### Environment Variables

For production deployment (e.g., Scalingo), set these environment variables:

```bash
# Server
BASE_URL=https://your-app.scalingo.io
PORT=8583
NODE_ENV=production
ALLOWED_REDIRECT_HOSTS=your-app.scalingo.io,yourdomain.com

# Database (from Scalingo PostgreSQL addon)
DATABASE_URL=postgresql://username:password@host:port/database

# Security (generate secure random strings)
SESSION_SECRET=very-long-random-string-for-session-security
JWT_SECRET=another-very-long-random-string-for-jwt-tokens

# JWT Configuration (optional, defaults shown)
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

### Database Migration on Scalingo

After deploying, run the database migration:

```bash
# Using Scalingo CLI
scalingo --app your-app run npm run database:setup

# Or through the web dashboard
# Go to your app → Run → One-off container
# Command: npm run database:setup
```

### Health Check

The service provides a health check endpoint:

```bash
GET /health
```

Returns:

```json
{
  "status": "healthy",
  "service": "watchthis-user-service",
  "version": "2.3.5",
  "database": "connected",
  "timestamp": "2025-10-12T14:30:00.000Z"
}
```

## Migration from MongoDB

This service has been migrated from MongoDB to PostgreSQL. Key changes:

- **Object IDs**: Changed from MongoDB ObjectIds to PostgreSQL UUIDs
- **Schema**: Defined using Prisma instead of Mongoose
- **Sessions**: Moved from MongoDB sessions to PostgreSQL sessions
- **Queries**: Converted from Mongoose syntax to Prisma syntax
