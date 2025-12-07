import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord, Employee } from './types';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ManagerDashboard from './components/ManagerDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import { supabase } from './services/supabaseClient';

type AuthView = 'LANDING' | 'LOGIN_EMPLOYEE' | 'LOGIN_MANAGER' | 'REGISTER_EMPLOYEE' | 'REGISTER_MANAGER';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<AuthView>('LANDING');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize Supabase Auth and Data
  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Session check error:", error);
        setLoading(false);
      }
    };
    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // If we don't have the user profile yet, fetch it
        // We check current user.id to avoid redundant fetches if already loaded
        if (!user || user.id !== session.user.id) {
          await fetchProfile(session.user.id);
        }
      } else {
        setUser(null);
        setAttendanceRecords([]);
        setAuthView('LANDING');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [user?.id]); // Depend on user ID to avoid stale closure issues if needed

  const fetchProfile = async (userId: string, retries = 3) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setUser(data as User);
        // Profile loaded successfully, now fetch application data
        await fetchAppData(); 
      } else {
        throw new Error("Profile not found");
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      if (retries > 0) {
        // Retry logic
        // We use a timeout to delay the retry, but we don't await the timeout here 
        // to block execution. However, we must ensure loading doesn't stop yet.
        setTimeout(() => fetchProfile(userId, retries - 1), 1000);
      } else {
        // Retries exhausted - stop loading so UI can show something (likely Landing page)
        console.error("Failed to load profile after multiple attempts.");
        setLoading(false);
        // If we have a session but no profile, something is wrong. 
        // We might want to sign them out or let them fall back to landing.
      }
    }
  };

  const fetchAppData = async () => {
    try {
      // Fetch all employees (for Manager view and name resolution)
      const { data: empData, error: empError } = await supabase
        .from('profiles')
        .select('*');
      
      if (empData) {
        setEmployees(empData.map((p: any) => ({
            id: p.id,
            name: p.name,
            role: p.role,
            department: p.department || 'General',
            avatar: p.avatar
        })));
      }

      // Fetch attendance records
      const { data: recordData, error: recordError } = await supabase
        .from('attendance_records')
        .select('*');

      if (recordData) {
        // Map snake_case DB fields to camelCase TS interfaces
        const formattedRecords: AttendanceRecord[] = recordData.map((r: any) => ({
          id: r.id,
          employeeId: r.employee_id,
          date: r.date,
          checkIn: r.check_in,
          checkOut: r.check_out,
          status: r.status,
          durationHours: r.duration_hours
        }));
        setAttendanceRecords(formattedRecords);
      }
    } catch (error) {
      console.error('Error fetching app data:', error);
    } finally {
      // Ensure loading is ALWAYS turned off after app data attempt
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAuthView('LANDING');
  };

  const handleUpdateRecord = async (updatedRecord: AttendanceRecord) => {
    // Optimistic Update
    setAttendanceRecords(prevRecords => {
      const exists = prevRecords.find(r => r.id === updatedRecord.id);
      if (exists) {
        return prevRecords.map(r => r.id === updatedRecord.id ? updatedRecord : r);
      } else {
        return [...prevRecords, updatedRecord];
      }
    });

    // DB Update
    try {
      const dbRecord = {
        id: updatedRecord.id,
        employee_id: updatedRecord.employeeId,
        date: updatedRecord.date,
        check_in: updatedRecord.checkIn,
        check_out: updatedRecord.checkOut,
        status: updatedRecord.status,
        duration_hours: updatedRecord.durationHours
      };

      const { error } = await supabase
        .from('attendance_records')
        .upsert(dbRecord);

      if (error) {
        console.error('Error saving record:', error);
        alert('Failed to save record: ' + (error.message || 'Unknown error'));
      }
    } catch (err: any) {
      console.error(err);
      alert('An unexpected error occurred while saving.');
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    // Optimistic Update
    setAttendanceRecords(prevRecords => prevRecords.filter(r => r.id !== recordId));

    // DB Update
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', recordId);
        
      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting record:', error);
      const errorMsg = error.message || (typeof error === 'string' ? error : 'Unknown error');
      alert('Failed to delete record: ' + errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-500 text-sm font-medium">Loading TimeTrack Pro...</p>
        </div>
      </div>
    );
  }

  // 1. Authenticated State
  if (user) {
    if (user.role === 'MANAGER') {
      return (
        <ManagerDashboard 
          currentUser={user} 
          records={attendanceRecords}
          employees={employees}
          onLogout={handleLogout} 
        />
      );
    }
    return (
      <EmployeeDashboard 
        currentUser={user} 
        records={attendanceRecords}
        employees={employees}
        onLogout={handleLogout} 
        onUpdateRecord={handleUpdateRecord}
        onDeleteRecord={handleDeleteRecord}
      />
    );
  }

  // 2. Unauthenticated State Routing
  switch (authView) {
    case 'LOGIN_EMPLOYEE':
      return (
        <LoginPage 
          title="Employee Portal"
          isManager={false}
          onSwitchToRegister={() => setAuthView('REGISTER_EMPLOYEE')} 
          onBack={() => setAuthView('LANDING')}
        />
      );
    case 'LOGIN_MANAGER':
      return (
        <LoginPage 
          title="Manager Portal"
          isManager={true}
          onSwitchToRegister={() => setAuthView('REGISTER_MANAGER')} 
          onBack={() => setAuthView('LANDING')}
        />
      );
    case 'REGISTER_EMPLOYEE':
      return (
        <RegisterPage 
          onSwitchToLogin={() => setAuthView('LOGIN_EMPLOYEE')} 
          onBack={() => setAuthView('LANDING')}
        />
      );
    case 'REGISTER_MANAGER':
      return (
        <RegisterPage 
          isManager={true}
          onSwitchToLogin={() => setAuthView('LOGIN_MANAGER')} 
          onBack={() => setAuthView('LANDING')}
        />
      );
    case 'LANDING':
    default:
      return (
        <LandingPage 
          onSelectEmployee={() => setAuthView('LOGIN_EMPLOYEE')}
          onSelectManager={() => setAuthView('LOGIN_MANAGER')}
        />
      );
  }
};

export default App;