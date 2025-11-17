// components/StatCard.jsx
import React from "react";

export default function StatCard({ title, value, color = "text-blue-600", icon = null }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {icon && <div className="text-2xl">{icon}</div>}
      </div>
      <p className={`text-4xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
