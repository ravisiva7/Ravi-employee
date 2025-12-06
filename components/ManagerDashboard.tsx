import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Clock, 
  LogOut, 
  Sparkles,
  BarChart as BarChartIcon,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, subMonths, isSameMonth, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

import { ViewMode, User, AttendanceRecord, Employee } from '../types';
import StatCard from './StatCard';
import AttendanceTable from './AttendanceTable';
import { generateAttendanceReport } from '../services/geminiService';

interface ManagerDashboardProps {
  currentUser: User;
  records: AttendanceRecord[];
  employees: Employee[];
  onLogout: () => void;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ currentUser, records, employees, onLogout }) => {
  const [activeTab, setActiveTab] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [selectedMonth, setSelectedMonth] = useState<'current' | 'previous'>('current');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // --- Date Logic ---
  const today = new Date();
  const currentMonthStart = startOfMonth(today);
  const previousMonthDate = subMonths(today, 1);
  const previousMonthStart = startOfMonth(previousMonthDate);
  const previousMonthEnd = endOfMonth(previousMonthDate);

  // --- Data Filtering ---
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const recordDate = parseISO(record.date);
      if (selectedMonth === 'current') {
        return isSameMonth(recordDate, today);
      } else {
        return isWithinInterval(recordDate, { start: previousMonthStart, end: previousMonthEnd });
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedMonth, today, previousMonthStart, previousMonthEnd, records]);

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    const totalRecords = filteredRecords.length;
    const present = filteredRecords.filter(r => r.status === 'Present').length;
    const late = filteredRecords.filter(r => r.status === 'Late').length;
    const totalHours = filteredRecords.reduce((acc, curr) => acc + curr.durationHours, 0);
    const avgHours = totalRecords > 0 ? (totalHours / totalRecords).toFixed(1) : '0';
    const attendanceRate = totalRecords > 0 ? Math.round(((present + late) / totalRecords) * 100) : 0;

    return {
      totalHours: Math.round(totalHours),
      avgHours,
      attendanceRate,
      late,
      present
    };
  }, [filteredRecords]);

  // --- Chart Data Preparation ---
  const chartData = useMemo(() => {
    // Aggregate by day
    const dailyStats: Record<string, { date: string, hours: number, present: number }> = {};
    
    filteredRecords.forEach(record => {
        const d = format(parseISO(record.date), 'dd MMM');
        if (!dailyStats[d]) {
            dailyStats[d] = { date: d, hours: 0, present: 0 };
        }
        dailyStats[d].hours += record.durationHours;
        if (record.status === 'Present' || record.status === 'Late') {
            dailyStats[d].present += 1;
        }
    });

    return Object.values(dailyStats).reverse().slice(0, 14); // Last 14 active days
  }, [filteredRecords]);

  const handleGenerateReport = async () => {
    setIsGeneratingAI(true);
    const periodName = selectedMonth === 'current' ? 'Current Month' : 'Previous Month';
    const report = await generateAttendanceReport(filteredRecords, employees, periodName);
    setAiReport(report);
    setIsGeneratingAI(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-10 hidden md:flex">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
            <Clock size={20} />
          </div>
          <span className="text-xl font-bold text-slate-800">TimeTrack Pro</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab(ViewMode.DASHBOARD)}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === ViewMode.DASHBOARD ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={18} className="mr-3" />
            Dashboard
          </button>
          <button 
             onClick={() => setActiveTab(ViewMode.EMPLOYEES)}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === ViewMode.EMPLOYEES ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Users size={18} className="mr-3" />
            Employees
          </button>
          <button 
             onClick={() => setActiveTab(ViewMode.REPORTS)}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === ViewMode.REPORTS ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <FileText size={18} className="mr-3" />
            Reports
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
           <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-8 h-8 rounded-full border border-slate-200"
              />
              <div className="text-sm overflow-hidden">
                <div className="font-medium text-slate-800 truncate">{currentUser.name}</div>
                <div className="text-xs text-slate-500 truncate">Manager</div>
              </div>
            </div>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <h1 className="text-xl font-semibold text-slate-800">
            {activeTab === ViewMode.DASHBOARD ? 'Dashboard Overview' : 
             activeTab === ViewMode.EMPLOYEES ? 'Employee Directory' : 'Reports & Analytics'}
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="relative inline-flex bg-slate-100 rounded-lg p-1 border border-slate-200">
              <button 
                onClick={() => setSelectedMonth('current')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${selectedMonth === 'current' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Current Month
              </button>
              <button 
                onClick={() => setSelectedMonth('previous')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${selectedMonth === 'previous' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Previous Month
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="Total Work Hours" 
              value={stats.totalHours.toLocaleString()} 
              icon={<Clock className="w-6 h-6" />}
              color="blue"
              trend="12%"
              trendUp={true}
            />
             <StatCard 
              title="Attendance Rate" 
              value={`${stats.attendanceRate}%`} 
              icon={<Calendar className="w-6 h-6" />}
              color="green"
              trend="2.4%"
              trendUp={true}
            />
             <StatCard 
              title="Late Arrivals" 
              value={stats.late} 
              icon={<AlertCircle className="w-6 h-6" />}
              color="orange"
              trend="5%"
              trendUp={false}
            />
             <StatCard 
              title="Avg Daily Hours" 
              value={stats.avgHours} 
              icon={<BarChartIcon className="w-6 h-6" />}
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">Team Work Hours Trend</h3>
                <span className="text-sm text-slate-500">Last 14 Active Days</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 12}} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#64748b', fontSize: 12}} 
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="#0ea5e9" 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorHours)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                    <Sparkles size={20} />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">Gemini Insights</h3>
              </div>
              
              <div className="flex-1 bg-slate-50 rounded-lg p-4 mb-4 overflow-y-auto max-h-60 border border-slate-100">
                {isGeneratingAI ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="text-sm">Analyzing attendance patterns...</span>
                    </div>
                ) : aiReport ? (
                    <div className="prose prose-sm text-slate-600 prose-headings:text-slate-800">
                        {aiReport.split('\n').map((line, i) => (
                          <p key={i} className={`mb-2 ${line.startsWith('#') ? 'font-bold text-slate-800' : ''}`}>{line.replace(/#/g, '')}</p>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                        <p className="text-sm mb-2">Generate an AI-powered summary of this month's attendance performance.</p>
                    </div>
                )}
              </div>

              <button 
                onClick={handleGenerateReport}
                disabled={isGeneratingAI}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isGeneratingAI ? 'Thinking...' : 'Generate Analysis'}
                {!isGeneratingAI && <Sparkles size={16} />}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {activeTab === ViewMode.EMPLOYEES ? 'All Employees Directory' : 'Detailed Attendance Logs'}
            </h3>
            <AttendanceTable records={filteredRecords} employees={employees} />
          </div>

        </div>
      </main>
    </div>
  );
};

export default ManagerDashboard;