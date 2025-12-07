import React, { useState } from 'react';
import { Lock, User as UserIcon, Building, ArrowLeft, BadgeInfo } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
  onBack: () => void;
  isManager?: boolean;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin, onBack, isManager = false }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Construct email from username
      // We use lowerCase for consistency
      const safeUsername = username.trim().toLowerCase();
      const email = `${safeUsername}@timetrack.local`;

      // SPECIAL LOGIC: Allow 'raviadmin' to register as MANAGER to bootstrap the system
      // OR if explicitly registering via Manager portal
      const role = (isManager || safeUsername === 'raviadmin') ? 'MANAGER' : 'EMPLOYEE';
      const userDepartment = role === 'MANAGER' ? 'Administration' : department;

      // 1. Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create Profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            name,
            email, 
            role: role, // Dynamic role based on username check or prop
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`,
            department: userDepartment
          });

        if (profileError) {
            // If profile creation fails, we should probably warn the user but not block entirely 
            // if the auth user was created. However, for this app, profile is needed.
            console.error("Profile creation error", profileError);
            throw profileError;
        }
        
        // 3. Ensure Session Exists
        // Since email verification is OFF, a session should exist.
        // If for some reason it doesn't, we attempt a manual sign-in to ensure the user gets into the app.
        if (!authData.session) {
           const { error: signInError } = await supabase.auth.signInWithPassword({
             email,
             password
           });
           
           if (signInError) throw signInError;
        }
        
        // Success! The App.tsx auth listener will handle the redirect.
      }
    } catch (err: any) {
      console.error("Registration Error:", err);
      
      let msg = "Registration failed";
      
      if (typeof err === 'string') {
        msg = err;
      } else if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'object' && err !== null) {
        if (err.message && typeof err.message === 'string') {
          msg = err.message;
        } else if (err.error_description && typeof err.error_description === 'string') {
          msg = err.error_description;
        } else if (err.msg && typeof err.msg === 'string') {
          msg = err.msg;
        } else {
          try {
             const jsonMsg = JSON.stringify(err);
             if (jsonMsg !== '{}') msg = jsonMsg;
          } catch {
             msg = "An unexpected error occurred.";
          }
        }
      }
      
      // Specific handling for common Supabase configuration errors
      if (msg.toLowerCase().includes("email signups are disabled")) {
        msg = "Setup Error: Go to Supabase > Authentication > Providers > Email and ensure 'Enable Email provider' is enabled.";
      }
      
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-100 relative">
        <button 
          onClick={onBack}
          className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors"
          title="Back to Portal Selection"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="text-center mb-8 pt-4">
          <h1 className="text-2xl font-bold text-slate-800">
            {isManager ? 'Create Manager Account' : 'Create Account'}
          </h1>
          <p className="text-slate-500 mt-2">
            {isManager ? 'Join TimeTrack Pro as a Manager' : 'Join TimeTrack Pro as an Employee'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`text-sm p-3 rounded-lg border break-words font-medium ${error.includes('successful') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <div className="relative">
              <BadgeInfo className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="john.doe"
                required
                autoCapitalize="none"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 pl-1">This will be your login ID.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          {!isManager && (
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-10 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none text-sm"
                >
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="HR">HR</option>
                    <option value="Sales">Sales</option>
                </select>
                </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className={`w-full text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm flex justify-center mt-2 ${
                isManager ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300' : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
            }`}
          >
             {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : (isManager ? 'Create Manager Account' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <button 
            onClick={onSwitchToLogin}
            className={`font-medium hover:underline ${isManager ? 'text-indigo-600' : 'text-blue-600'}`}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;