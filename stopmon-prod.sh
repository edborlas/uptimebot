#!/bin/bash
# filepath: /Users/observa/Repos/uptimebot/stopmonprod.sh

# Check if the bot is running
if [ ! -f .pinger_pid ]; then
  echo "Uptimebot is not running."
fi

# Check if the production server is running
if [ ! -f .dev_pid ]; then
  echo "Production server is not running."
fi

if [ -f .pinger_pid ]; then
  # Stop the uptimebot
  echo "Stopping uptimebot..."
  kill -9 $(cat .pinger_pid) && rm -f .pinger_pid
  echo "Uptimebot stopped."
fi

if [ -f .dev_pid ]; then
  # Stop the production server
  echo "Stopping production server..."
  PID=$(lsof -ti :4173)
  kill -9 $PID && rm -f .dev_pid
  #kill -9 $(cat .dev_pid) && rm -f .dev_pid
  echo "Production server stopped."
fi