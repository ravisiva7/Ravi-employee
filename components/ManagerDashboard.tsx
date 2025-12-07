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
  Calendar,
  Download,
  ArrowLeft,
  Briefcase,
  Building
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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

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

  // --- Helper for Duration Formatting ---
  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  // --- Stats Calculation Helper ---
  const calculateStats = (recs: AttendanceRecord[]) => {
    const totalRecords = recs.length;
    const present = recs.filter(r => r.status === 'Present').length;
    const late = recs.filter(r => r.status === 'Late').length;
    
    const totalHoursDecimal = recs.reduce((acc, curr) => acc + curr.durationHours, 0);
    const avgHoursDecimal = totalRecords > 0 ? totalHoursDecimal / totalRecords : 0;
    
    const attendanceRate = totalRecords > 0 ? Math.round(((present + late) / totalRecords) * 100) : 0;

    return {
      totalHours: formatDuration(totalHoursDecimal),
      avgHours: formatDuration(avgHoursDecimal),
      attendanceRate,
      late,
      present
    };
  };

  const globalStats = useMemo(() => calculateStats(filteredRecords), [filteredRecords]);

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

  const handleExportCSV = () => {
    const headers = ['Employee Name', 'Role', 'Department', 'Date', 'Check In', 'Check Out', 'Duration (Hours)', 'Status'];
    
    // If viewing a specific employee, filter records for CSV export too
    const recordsToExport = (activeTab === ViewMode.EMPLOYEES && selectedEmployeeId) 
        ? filteredRecords.filter(r => r.employeeId === selectedEmployeeId)
        : filteredRecords;

    const rows = recordsToExport.map(record => {
      const emp = employees.find(e => e.id === record.employeeId);
      return [
        `"${emp?.name || 'Unknown'}"`,
        `"${emp?.role || 'N/A'}"`,
        `"${emp?.department || 'N/A'}"`,
        record.date,
        record.checkIn ? format(parseISO(record.checkIn), 'HH:mm') : '-',
        record.checkOut ? format(parseISO(record.checkOut), 'HH:mm') : '-',
        record.durationHours,
        record.status
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${selectedMonth}_${format(today, 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTabChange = (tab: ViewMode) => {
    setActiveTab(tab);
    setSelectedEmployeeId(null); // Reset selection when switching tabs
  };

  // --- Render Logic for Detailed Employee View ---
  const renderEmployeeDetail = () => {
    if (!selectedEmployeeId) return null;
    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee) return <div>Employee not found</div>;

    const employeeRecords = filteredRecords.filter(r => r.employeeId === selectedEmployeeId);
    const empStats = calculateStats(employeeRecords);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4 mb-2">
            <button 
                onClick={() => setSelectedEmployeeId(null)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                title="Back to List"
            >
                <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-4">
                <img src={employee.avatar} alt={employee.name} className="w-12 h-12 rounded-full border border-slate-200" />
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{employee.name}</h2>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Briefcase size={14} /> {employee.role}</span>
                        <span className="flex items-center gap-1"><Building size={14} /> {employee.department}</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard 
              title="Work Hours" 
              value={empStats.totalHours} 
              icon={<Clock className="w-5 h-5" />}
              color="blue"
            />
             <StatCard 
              title="Attendance" 
              value={`${empStats.attendanceRate}%`} 
              icon={<Calendar className="w-5 h-5" />}
              color="green"
            />
             <StatCard 
              title="Late Days" 
              value={empStats.late} 
              icon={<AlertCircle className="w-5 h-5" />}
              color="orange"
            />
             <StatCard 
              title="Avg Daily" 
              value={empStats.avgHours} 
              icon={<BarChartIcon className="w-5 h-5" />}
              color="purple"
            />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-800">
                Detailed Attendance History ({selectedMonth === 'current' ? 'Current Month' : 'Previous Month'})
            </div>
            <AttendanceTable records={employeeRecords} employees={employees} />
        </div>
      </div>
    );
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
            onClick={() => handleTabChange(ViewMode.DASHBOARD)}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === ViewMode.DASHBOARD ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard size={18} className="mr-3" />
            Dashboard
          </button>
          <button 
             onClick={() => handleTabChange(ViewMode.EMPLOYEES)}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === ViewMode.EMPLOYEES ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Users size={18} className="mr-3" />
            Employees
          </button>
          <button 
             onClick={() => handleTabChange(ViewMode.REPORTS)}
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
             activeTab === ViewMode.EMPLOYEES ? (selectedEmployeeId ? 'Employee Details' : 'Employee Directory') : 'Reports & Analytics'}
          </h1>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
              title="Download CSV Report"
            >
              <Download size={16} />
              Export CSV
            </button>
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
          
          {activeTab === ViewMode.DASHBOARD && (
            <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard 
                    title="Total Work Hours" 
                    value={globalStats.totalHours} 
                    icon={<Clock className="w-6 h-6" />}
                    color="blue"
                    trend="12%"
                    trendUp={true}
                    />
                    <StatCard 
                    title="Attendance Rate" 
                    value={`${globalStats.attendanceRate}%`} 
                    icon={<Calendar className="w-6 h-6" />}
                    color="green"
                    trend="2.4%"
                    trendUp={true}
                    />
                    <StatCard 
                    title="Late Arrivals" 
                    value={globalStats.late} 
                    icon={<AlertCircle className="w-6 h-6" />}
                    color="orange"
                    trend="5%"
                    trendUp={false}
                    />
                    <StatCard 
                    title="Avg Daily Hours" 
                    value={globalStats.avgHours} 
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
                        Detailed Attendance Logs
                    </h3>
                    <AttendanceTable records={filteredRecords} employees={employees} />
                </div>
            </>
          )}

          {activeTab === ViewMode.EMPLOYEES && (
            selectedEmployeeId ? renderEmployeeDetail() : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {employees.filter(e => e.role !== 'MANAGER').map((emp) => (
                        <div 
                            key={emp.id}
                            onClick={() => setSelectedEmployeeId(emp.id)}
                            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group flex flex-col items-center text-center"
                        >
                            <div className="relative mb-4">
                                <img 
                                    src={emp.avatar} 
                                    alt={emp.name} 
                                    className="w-20 h-20 rounded-full border-2 border-slate-100 group-hover:border-blue-100 transition-colors"
                                />
                                <div className="absolute bottom-0 right-0 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                            </div>
                            <h3 className="font-semibold text-slate-800 text-lg mb-1">{emp.name}</h3>
                            <div className="text-sm text-slate-500 mb-4 flex flex-col gap-1">
                                <span>{emp.role}</span>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{emp.department}</span>
                            </div>
                            <button className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                View Details
                            </button>
                        </div>
                    ))}
                </div>
            )
          )}

          {activeTab === ViewMode.REPORTS && (
             <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                <FileText size={48} className="mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-600">Reports Module</h3>
                <p className="max-w-md text-center mt-2">Use the "Generate Analysis" button in the dashboard or "Export CSV" to get detailed reports.</p>
             </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default ManagerDashboard;