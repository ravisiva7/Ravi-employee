import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, 
  LogOut, 
  BarChart as BarChartIcon,
  AlertCircle,
  Calendar,
  UserCheck,
  PlayCircle,
  StopCircle,
  Edit,
  X,
  Save,
  PlusCircle
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { format, subMonths, isSameMonth, parseISO, startOfMonth, endOfMonth, isWithinInterval, differenceInMinutes, startOfDay } from 'date-fns';

import { ViewMode, User, AttendanceRecord, AttendanceStatus, Employee } from '../types';
import StatCard from './StatCard';
import AttendanceTable from './AttendanceTable';

interface EmployeeDashboardProps {
  currentUser: User;
  records: AttendanceRecord[];
  employees: Employee[];
  onLogout: () => void;
  onUpdateRecord: (record: AttendanceRecord) => void;
  onDeleteRecord: (recordId: string) => void;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ currentUser, records, employees, onLogout, onUpdateRecord, onDeleteRecord }) => {
  const [activeTab, setActiveTab] = useState<ViewMode>(ViewMode.MY_ATTENDANCE);
  const [selectedMonth, setSelectedMonth] = useState<'current' | 'previous'>('current');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Edit/Add Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    checkIn: '',
    checkOut: ''
  });

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Date Logic ---
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const currentMonthStart = startOfMonth(today);
  const previousMonthDate = subMonths(today, 1);
  const previousMonthStart = startOfMonth(previousMonthDate);
  const previousMonthEnd = endOfMonth(previousMonthDate);

  // --- Filter Records for THIS Employee Only ---
  const myRecords = useMemo(() => {
    return records.filter(record => record.employeeId === currentUser.id);
  }, [records, currentUser.id]);

  const todayRecord = useMemo(() => {
    return myRecords.find(r => r.date === todayStr);
  }, [myRecords, todayStr]);

  const filteredRecords = useMemo(() => {
    return myRecords.filter(record => {
      const recordDate = parseISO(record.date);
      if (selectedMonth === 'current') {
        return isSameMonth(recordDate, today);
      } else {
        return isWithinInterval(recordDate, { start: previousMonthStart, end: previousMonthEnd });
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedMonth, today, previousMonthStart, previousMonthEnd, myRecords]);

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
    return filteredRecords
        .slice(0, 10)
        .reverse()
        .map(record => ({
            date: format(parseISO(record.date), 'dd MMM'),
            hours: record.durationHours
        }));
  }, [filteredRecords]);

  // --- Handlers ---

  const handleCheckIn = () => {
    const now = new Date();
    const newRecord: AttendanceRecord = {
      id: `${currentUser.id}-${todayStr}`,
      employeeId: currentUser.id,
      date: todayStr,
      checkIn: now.toISOString(),
      checkOut: null,
      status: now.getHours() >= 10 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
      durationHours: 0
    };
    onUpdateRecord(newRecord);
  };

  const handleCheckOut = () => {
    if (!todayRecord) return;
    const now = new Date();
    
    // Calculate duration
    const checkInTime = todayRecord.checkIn ? new Date(todayRecord.checkIn) : now;
    const diffMinutes = differenceInMinutes(now, checkInTime);
    const hours = Number((diffMinutes / 60).toFixed(2));

    const updatedRecord: AttendanceRecord = {
      ...todayRecord,
      checkOut: now.toISOString(),
      durationHours: hours
    };
    onUpdateRecord(updatedRecord);
  };

  const openEditModal = (record: AttendanceRecord) => {
    setIsCreating(false);
    setEditingRecord(record);
    setEditForm({
      date: record.date,
      checkIn: record.checkIn ? format(parseISO(record.checkIn), "yyyy-MM-dd'T'HH:mm") : '',
      checkOut: record.checkOut ? format(parseISO(record.checkOut), "yyyy-MM-dd'T'HH:mm") : ''
    });
    setIsEditModalOpen(true);
  };

  const handleAddNew = () => {
    setIsCreating(true);
    setEditingRecord(null);
    setEditForm({
      date: todayStr,
      checkIn: '',
      checkOut: ''
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (record: AttendanceRecord) => {
    if (window.confirm(`Are you sure you want to delete the attendance record for ${record.date}?`)) {
        onDeleteRecord(record.id);
    }
  };

  const handleSaveEdit = () => {
    if (!isCreating && !editingRecord) return;
    if (isCreating && !editForm.date) return;

    // Validation: prevent adding future dates
    if (new Date(editForm.date) > new Date()) {
      alert("Cannot add records for future dates.");
      return;
    }

    // Validation: Check if record exists when creating
    if (isCreating) {
      const exists = records.find(r => r.id === `${currentUser.id}-${editForm.date}`);
      if (exists) {
        alert("A record already exists for this date. Please edit the existing record instead.");
        return;
      }
    }

    let duration = 0;
    let status = AttendanceStatus.PRESENT;

    if (editForm.checkIn && editForm.checkOut) {
       const start = new Date(editForm.checkIn);
       const end = new Date(editForm.checkOut);
       
       if (end < start) {
         alert("Check-out time cannot be before check-in time.");
         return;
       }

       const diff = differenceInMinutes(end, start);
       duration = diff > 0 ? Number((diff / 60).toFixed(2)) : 0;
       
       // Simple status logic for manual entry
       if (start.getHours() >= 10) {
         status = AttendanceStatus.LATE;
       }
    }

    const newRecord: AttendanceRecord = {
      id: isCreating ? `${currentUser.id}-${editForm.date}` : editingRecord!.id,
      employeeId: currentUser.id,
      date: editForm.date,
      checkIn: editForm.checkIn ? new Date(editForm.checkIn).toISOString() : null,
      checkOut: editForm.checkOut ? new Date(editForm.checkOut).toISOString() : null,
      durationHours: duration,
      status: status
    };

    onUpdateRecord(newRecord);
    setIsEditModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-10 hidden md:flex">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
            <UserCheck size={20} />
          </div>
          <span className="text-xl font-bold text-slate-800">My Portal</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors bg-indigo-50 text-indigo-700`}
          >
            <Clock size={18} className="mr-3" />
            My Attendance
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
                <div className="text-xs text-slate-500 truncate">{currentUser.roleTitle || 'Employee'}</div>
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
             Attendance Dashboard
          </h1>
          
          <div className="flex items-center gap-4">
             <div className="text-sm text-slate-500 font-mono bg-slate-100 px-3 py-1 rounded-md">
                {format(currentTime, 'EEE, MMM dd • hh:mm:ss a')}
             </div>
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

          {/* Today's Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Today's Status</h2>
                    <p className="text-slate-500 text-sm mt-1">{format(today, 'EEEE, MMMM do, yyyy')}</p>
                    
                    <div className="flex gap-8 mt-4">
                        <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entry Time</span>
                            <div className="text-2xl font-mono text-slate-800 mt-1">
                                {todayRecord?.checkIn ? format(parseISO(todayRecord.checkIn), 'hh:mm a') : '--:--'}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Exit Time</span>
                             <div className="text-2xl font-mono text-slate-800 mt-1">
                                {todayRecord?.checkOut ? format(parseISO(todayRecord.checkOut), 'hh:mm a') : '--:--'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                   {todayRecord && (
                       <button
                         onClick={() => openEditModal(todayRecord)}
                         className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                       >
                           <Edit size={18} />
                           Modify Time
                       </button>
                   )}

                    {!todayRecord ? (
                        <button 
                            onClick={handleCheckIn}
                            className="flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-200 transition-all transform hover:scale-105 active:scale-95"
                        >
                            <PlayCircle size={28} />
                            <div className="text-left">
                                <div className="text-sm opacity-90">Start Day</div>
                                <div className="font-bold text-lg leading-none">Check In</div>
                            </div>
                        </button>
                    ) : !todayRecord.checkOut ? (
                        <button 
                            onClick={handleCheckOut}
                            className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg shadow-red-200 transition-all transform hover:scale-105 active:scale-95"
                        >
                            <StopCircle size={28} />
                            <div className="text-left">
                                <div className="text-sm opacity-90">End Day</div>
                                <div className="font-bold text-lg leading-none">Check Out</div>
                            </div>
                        </button>
                    ) : (
                         <div className="px-8 py-4 bg-slate-100 rounded-xl border border-slate-200 text-center">
                             <div className="text-green-600 font-bold flex items-center gap-2">
                                 <UserCheck size={20} />
                                 Completed
                             </div>
                             <div className="text-xs text-slate-500 mt-1">{todayRecord.durationHours} hrs worked</div>
                         </div>
                    )}
                </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              title="My Work Hours" 
              value={stats.totalHours} 
              icon={<Clock className="w-6 h-6" />}
              color="indigo"
            />
             <StatCard 
              title="Days Present" 
              value={stats.present} 
              icon={<Calendar className="w-6 h-6" />}
              color="green"
            />
             <StatCard 
              title="Late Arrivals" 
              value={stats.late} 
              icon={<AlertCircle className="w-6 h-6" />}
              color="orange"
            />
             <StatCard 
              title="Avg Daily Hours" 
              value={stats.avgHours} 
              icon={<BarChartIcon className="w-6 h-6" />}
              color="purple"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800">My Daily Hours</h3>
                <span className="text-sm text-slate-500">Recent Activity</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
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
                      cursor={{fill: '#f1f5f9'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Bar 
                      dataKey="hours" 
                      fill="#6366f1" 
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mb-6">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Attendance Log</h3>
                <button 
                  onClick={handleAddNew}
                  className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <PlusCircle size={16} />
                  Add Missing Record
                </button>
             </div>
            <AttendanceTable 
                records={filteredRecords} 
                employees={employees} 
                onEdit={openEditModal}
                onDelete={handleDelete}
            />
          </div>

        </div>
      </main>

      {/* Edit/Add Modal */}
      {isEditModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-800">
                      {isCreating ? 'Add Manual Entry' : 'Modify Attendance'}
                    </h3>
                    <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {isCreating && (
                      <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs mb-2">
                        You can add missing records for the current and previous month.
                      </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                        <input 
                            type="date" 
                            value={editForm.date}
                            disabled={!isCreating}
                            min={format(previousMonthStart, 'yyyy-MM-dd')}
                            max={todayStr}
                            onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                            className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none ${!isCreating ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Check In Time</label>
                            <input 
                                type="datetime-local" 
                                value={editForm.checkIn}
                                onChange={(e) => setEditForm({...editForm, checkIn: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Check Out Time</label>
                            <input 
                                type="datetime-local" 
                                value={editForm.checkOut}
                                onChange={(e) => setEditForm({...editForm, checkOut: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                            />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                        onClick={() => setIsEditModalOpen(false)}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;