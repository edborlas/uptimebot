import React from 'react';

const Header = () => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-bold">Monitors.</h1>
      <div className="flex gap-2">
        <button className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md text-sm">Bulk Actions</button>
        <button className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md text-sm">All Tags</button>
        <button className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded-md text-sm font-semibold">
          + New Monitor
        </button>
      </div>
    </div>
  );
};

export default Header;
