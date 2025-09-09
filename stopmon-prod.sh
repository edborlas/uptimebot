#!/bin/bash
# filepath: /Users/observa/Repos/uptimebot/stopmonprod.sh

# Check if the bot is running
if [ ! -f .pinger_pid ]; then
  echo "Uptimebot is not running."
  exit 1
fi

# Stop the uptimebot
echo "Stopping uptimebot..."
kill -9 $(cat .pinger_pid) && rm -f .pinger_pid
echo "Uptimebot stopped."