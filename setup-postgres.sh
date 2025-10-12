#!/bin/bash

# Setup script for PostgreSQL migration

echo "🚀 Setting up PostgreSQL for WatchThis User Service..."

# Create database if it doesn't exist
echo "Creating database..."
createdb watchthis_user_service 2>/dev/null || echo "Database already exists or needs manual creation"

# Set up environment variable
export DATABASE_URL="postgresql://localhost:5432/watchthis_user_service"
echo "DATABASE_URL=postgresql://localhost:5432/watchthis_user_service" > .env

echo "✅ Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Make sure PostgreSQL is running"
echo "2. Run: npx prisma db push (to create tables)"
echo "3. Run: npm run build && npm test (to test)"
echo ""
echo "For production, set DATABASE_URL to your Scalingo PostgreSQL connection string."