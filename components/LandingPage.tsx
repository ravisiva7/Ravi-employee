import React from 'react';
import { User, Briefcase } from 'lucide-react';

interface LandingPageProps {
  onSelectEmployee: () => void;
  onSelectManager: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelectEmployee, onSelectManager }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4">TimeTrack Pro</h1>
          <p className="text-slate-500 text-lg">Select your portal to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Employee Card */}
          <button 
            onClick={onSelectEmployee}
            className="group relative bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300 text-left flex flex-col items-center justify-center gap-6 h-64"
          >
            <div className="bg-blue-50 p-4 rounded-full group-hover:bg-blue-100 transition-colors">
              <User size={48} className="text-blue-600" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">Employee Portal</h2>
              <p className="text-slate-500 mt-2">Check in/out, view history, and manage your time.</p>
            </div>
          </button>

          {/* Manager Card */}
          <button 
            onClick={onSelectManager}
            className="group relative bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all duration-300 text-left flex flex-col items-center justify-center gap-6 h-64"
          >
            <div className="bg-indigo-50 p-4 rounded-full group-hover:bg-indigo-100 transition-colors">
              <Briefcase size={48} className="text-indigo-600" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">Manager Portal</h2>
              <p className="text-slate-500 mt-2">View reports, analytics, and manage team attendance.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;