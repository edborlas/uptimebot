import React, { useEffect, useState } from "react";
import MonitorCard from "./components/MonitorCard";

const POLL_MS = 30 * 1000; // poll server every 30s for UI updates

function App() {
  const [monitors, setMonitors] = useState([]);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch('http://localhost:4100/status');
        if (!res.ok) throw new Error('bad status');
        const data = await res.json();
        if (!mounted) return;
        // server uses ISO timestamps in lastChecked and downSince
        setMonitors(data.monitors || []);
      } catch (err) {
        console.error('Failed to fetch status', err);
      }
    };

    fetchStatus();
    const id = setInterval(fetchStatus, POLL_MS);
    return () => { mounted = false; clearInterval(id); };
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
