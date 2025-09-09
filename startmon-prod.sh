#!/bin/bash

# Start the pinger service in the background
if lsof -i :4100 > /dev/null; then
  echo "Pinger service is already running on port 4100."
  exit 1
fi

echo "Starting the pinger service..."
node ./scripts/pinger.js > pinger.log 2>&1 &
PINGER_PID=$!
echo $PINGER_PID > .pinger_pid

# Build the production version of the app
echo "Building the production version of the app..."
npm run build

# Start the production server
if lsof -i :4173 > /dev/null; then
  echo "Production server is already running on port 4173."
  exit 1
fi

echo "Starting the production server..."
npm run preview > app.log 2>&1 &
PREVIEW_PID=$!
echo $PREVIEW_PID > .dev_pid

# Wait for both processes to start
sleep 2

echo "Pinger service and production server started."