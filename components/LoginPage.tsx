import React, { useState } from 'react';
import { Lock, User, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface LoginPageProps {
  title: string;
  isManager: boolean;
  onSwitchToRegister: () => void;
  onBack: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ title, isManager, onSwitchToRegister, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Append a dummy domain to satisfy Supabase email requirement
      const email = `${username.trim()}@timetrack.local`;

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // Success is handled by the onAuthStateChange listener in App.tsx
    } catch (err: any) {
      console.error("Login Error:", err);
      let msg = 'Failed to login';

      if (typeof err === 'string') {
        msg = err;
      } else if (err instanceof Error) {
        msg = err.message;
        // make error friendlier if it's about invalid login
        if (msg.includes('Invalid login credentials')) {
          msg = 'Invalid username or password.';
        }
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
             // ignore
           }
        }
      }
      setError(msg);
    } finally {
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
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 mt-2">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 break-words font-medium">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="john.doe"
                required
                autoCapitalize="none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm flex justify-center ${
              isManager 
                ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300' 
                : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
            }`}
          >
            {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <button 
            onClick={onSwitchToRegister}
            className={`font-medium hover:underline ${isManager ? 'text-indigo-600' : 'text-blue-600'}`}
          >
            Create account
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;