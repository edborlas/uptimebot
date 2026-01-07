USE SCRIPTS TO START and STOP in DEV:
    ./startmon-dev.sh
    ./stopmon-dev.sh
    Open http://localhost:5173

USE SCRIPTS TO START and STOP in PROD:
    ./startmon-prod.sh
    ./stopmon-prod.sh
    Open http://localhost:4173

MANUAL START: 
repo in ~/Repos/uptimebot

open terminal and start pinger: 
    node ./scripts/pinger.js & sleep 0.6; curl -sS http://localhost:4100/status || true

then start app:
    npm run dev

to check for port 4100 running (pinger service):
    lsof -i :4100

to stop port 4100 (pinger service):
    kill -9 <whatever that PID is minus angle brackets>     
