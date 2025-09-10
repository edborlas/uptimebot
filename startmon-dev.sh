#!/bin/bash

# Start the pinger service in the background
if lsof -i :4100 > /dev/null; then
  echo "Pinger service is already running on port 4100."
  exit 1
fi

echo "Starting the pinger service..."
node ./scripts/pinger.js > ./logs/pinger.log 2>&1 &
PINGER_PID=$!
echo $PINGER_PID > .pinger_pid

# Start the development server
if pgrep -f "npm run dev" > /dev/null; then
  echo "Development server is already running."
  exit 1
fi

echo "Starting the development server..."
npm run dev > ./logs/app.log 2>&1 &
DEV_PID=$!
echo $DEV_PID > .dev_pid

# Wait for both processes to start
sleep 2

echo "Pinger service and development server started."