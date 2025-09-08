import React, { useEffect, useState, useRef } from "react";
import { pingHost } from "./utils/ping";
import MonitorCard from "./components/MonitorCard";

const intervalSec = 5; // seconds
const timeoutMm = intervalSec * 1000; // mmilliseconds

const defaultMonitors = [
  { name: "Google", url: "https://www.google.com", protocol: "HTTP", interval: intervalSec },
  { name: "GitHub", url: "https://github.com", protocol: "HTTP", interval: intervalSec },
  { name: "Observa", url: "https://observanow.com", protocol: "HTTP", interval: intervalSec },
  { name: "API Server", url: "http://20.29.187.121", protocol: "HTTP", interval: intervalSec },
  { name: "Observa API", url: "https://www.observanow.com/api2/", protocol: "HTTP", interval: intervalSec },
  { name: "Observa Internal Company", url: "https://www.observanow.com/internal/company/", protocol: "HTTP", interval: intervalSec },
];

function App() {
  const [monitors, setMonitors] = useState(defaultMonitors.map(m => ({ ...m, status: "loading", latency: null })));
  const monitorsRef = useRef(monitors);
  const mountedRef = useRef(true);

  // keep a ref in sync so runPings can read the latest list without depending on it
  useEffect(() => {
    monitorsRef.current = monitors;
  }, [monitors]);

  useEffect(() => {
    mountedRef.current = true;

    const runPings = () => {
      // mark monitors as checking (optional)
      setMonitors(prev => prev.map(m => ({ ...m, status: 'checking' })));

      // fire off a ping for each monitor without awaiting all of them
      for (const monitor of monitorsRef.current) {
        (async (mon) => {
          try {
            const result = await pingHost(mon.url);
            if (!mountedRef.current) return;
            setMonitors(prev => prev.map(m => m.url === mon.url ? { ...m, ...result } : m));
          } catch (err) {
            if (!mountedRef.current) return;
            // on error, mark that monitor as down but don't block others
            setMonitors(prev => prev.map(m => m.url === mon.url ? { ...m, status: 'down', latency: null } : m));
          }
        })(monitor);
      }
    };

    // initial run and periodic interval
    runPings();
    const interval = setInterval(runPings, timeoutMm); // refresh every intervalSec

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Uptime Monitors</h1>
      {monitors.map((monitor, idx) => (
        <MonitorCard key={idx} monitor={monitor} />
      ))}
    </div>
  );
}

export default App;
