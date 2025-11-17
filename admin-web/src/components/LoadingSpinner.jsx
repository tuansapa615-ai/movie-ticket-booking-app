// src/components/LoadingSpinner.js
import React from 'react';

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full min-h-[200px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    <span className="ml-3 text-lg text-gray-600">Đang tải...</span>
  </div>
);

export default LoadingSpinner;
