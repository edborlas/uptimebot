import React from "react";

const MonitorCard = ({ monitor }) => {
  const renderStatus = () => {
    if (monitor.status === 'down') {
      if (monitor.downSince) {
        const downSince = new Date(monitor.downSince);
        const diffMs = Date.now() - downSince.getTime();
        const minutes = Math.max(0, Math.floor(diffMs / 60000));
        return `Down for ${minutes} minute${minutes === 1 ? '' : 's'}`;
      }
      return 'Down';
    }
    return monitor.status === 'up' ? 'Up' : monitor.status;
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="flex justify-between items-center bg-gray-800 p-4 mb-2 rounded-md">
      <div className="flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${monitor.status === "up" ? "bg-green-400" : "bg-red-500"}`}></div>
        <div>
          <h2 className="font-semibold">{monitor.name}</h2>
          <p className="text-xs text-gray-400">
            {monitor.protocol}  Last check: {monitor.lastChecked ? formatDate(monitor.lastChecked) : "N/A"}
          </p>
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <span className="material-icons text-sm">schedule</span> 5m
          </p>
        </div>
      </div>
      <div className="text-sm text-gray-400">{renderStatus()}</div>
    </div>
  );
};

export default MonitorCard;