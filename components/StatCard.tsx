import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendUp, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-purple-50 text-purple-600",
  };

  const selectedColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between h-full transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${selectedColor}`}>
          {icon}
        </div>
      </div>
      {trend && (
        <div className="flex items-center text-xs">
          <span className={`font-medium ${trendUp ? 'text-green-600' : 'text-red-500'} mr-2`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
          <span className="text-slate-400">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
