import React from "react";

const MonitorCard = ({ monitor }) => {
  return (
    <div className="flex justify-between items-center bg-gray-800 p-4 mb-2 rounded-md">
      <div className="flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${monitor.status === "up" ? "bg-green-400" : "bg-red-500"}`}></div>
        <div>
          <h2 className="font-semibold">{monitor.name}</h2>
          <p className="text-xs text-gray-400">
            {monitor.protocol} • Last check: {monitor.latency ?? "N/A"}ms
          </p>
        </div>
      </div>
      <div className="text-sm text-gray-400">⟳ {monitor.interval}s</div>
    </div>
  );
};

export default MonitorCard;
