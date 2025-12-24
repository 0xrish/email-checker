#!/bin/bash

set -e

echo "Starting Email Checker Apify Actor..."

# Start chromedriver in background
echo "Starting chromedriver..."
chromedriver --port=9515 &
CHROMEDRIVER_PID=$!

# Start Rust backend in background
echo "Starting Rust backend on port 8080..."
./reacher_backend &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo "Backend is ready!"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for backend... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "ERROR: Backend failed to start within 30 seconds"
    kill $BACKEND_PID $CHROMEDRIVER_PID 2>/dev/null || true
    exit 1
fi

# Start the Actor
echo "Starting Apify Actor..."
node dist/main.js

# Capture exit code
EXIT_CODE=$?

# Cleanup background processes
echo "Shutting down services..."
kill $BACKEND_PID $CHROMEDRIVER_PID 2>/dev/null || true

exit $EXIT_CODE
