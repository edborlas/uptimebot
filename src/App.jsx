import React, { useEffect, useState } from "react";
import MonitorCard from "./components/MonitorCard";

const POLL_MS = 30 * 1000; // poll server every 30s for UI updates

function App() {
  const [monitors, setMonitors] = useState([]);
  const [modalContent, setModalContent] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch("http://localhost:4100/status");
        if (!res.ok) throw new Error("bad status");
        const data = await res.json();
        if (!mounted) return;
        // server uses ISO timestamps in lastChecked and downSince
        setMonitors(data.monitors || []);
      } catch (err) {
        console.error("Failed to fetch status", err);
      }
    };

    fetchStatus();
    const id = setInterval(fetchStatus, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const fetchLog = async (logType) => {
    try {
      const res = await fetch(`http://localhost:4100/${logType}`);
      if (!res.ok) throw new Error("Failed to fetch log");
      const text = await res.text();
      setModalContent({ title: logType, content: text }); // Include title in modalContent
    } catch (err) {
      console.error("Error fetching log:", err);
    }
  };

  const closeModal = () => setModalContent(null);

  return (
    <div className="max-w-3xl mx-auto mt-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Uptime Monitors</h1>
        <div className="flex gap-2">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => fetchLog("pinger")}
          >
            View Pinger Log
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => fetchLog("app")}
          >
            View App Log
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => fetchLog("up")}
          >
            View Up Log
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => fetchLog("down")}
          >
            View Down Log
          </button>
        </div>
      </div>
      {monitors.map((monitor, idx) => (
        <MonitorCard key={idx} monitor={monitor} />
      ))}
      {modalContent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
          onClick={closeModal}
        >
          <div
            className="bg-white p-4 rounded max-w-lg w-full max-h-[80%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-2 text-black">{modalContent.title}</h2> {/* Display title */}
            <pre className="whitespace-pre-wrap text-[9px] text-black">{modalContent.content}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
