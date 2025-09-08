#!/bin/bash

# Stop the pinger service
if [ -f .pinger_pid ]; then
  PINGER_PID=$(cat .pinger_pid)
  if kill -0 $PINGER_PID > /dev/null 2>&1; then
    echo "Stopping the pinger service..."
    kill $PINGER_PID
    rm .pinger_pid
  else
    echo "Pinger service is not running."
  fi
else
  echo "No pinger service PID file found."
fi

# Stop the development server
if [ -f .dev_pid ]; then
  DEV_PID=$(cat .dev_pid)
  if kill -0 $DEV_PID > /dev/null 2>&1; then
    echo "Stopping the development server..."
    kill $DEV_PID
    rm .dev_pid
  else
    echo "Development server is not running."
  fi
else
  echo "No development server PID file found."
fi

echo "All services stopped."