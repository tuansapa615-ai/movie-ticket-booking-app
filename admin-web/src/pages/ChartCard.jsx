// ChartCard.jsx
import React from "react";

export default function ChartCard({ title, value, children, color = "text-black", bgColor = "bg-white" }) {
  return (
    <div className={`rounded-xl p-4 shadow-md ${bgColor}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
      <p className={`text-4xl font-bold mb-3 ${color}`}>{value}</p>
      {children}
    </div>
  );
}
