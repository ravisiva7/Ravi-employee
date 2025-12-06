import React from 'react';
import { AttendanceRecord, Employee, AttendanceStatus } from '../types';
import { format, parseISO } from 'date-fns';
import { Edit2, Trash2 } from 'lucide-react';

interface AttendanceTableProps {
  records: AttendanceRecord[];
  employees: Employee[];
  onEdit?: (record: AttendanceRecord) => void;
  onDelete?: (record: AttendanceRecord) => void;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ records, employees, onEdit, onDelete }) => {
  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT: return 'bg-green-100 text-green-700';
      case AttendanceStatus.ABSENT: return 'bg-red-100 text-red-700';
      case AttendanceStatus.LATE: return 'bg-orange-100 text-orange-700';
      case AttendanceStatus.HALF_DAY: return 'bg-yellow-100 text-yellow-700';
      case AttendanceStatus.ON_LEAVE: return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const showActions = onEdit || onDelete;

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-6 py-3 font-semibold">Employee</th>
            <th className="px-6 py-3 font-semibold">Date</th>
            <th className="px-6 py-3 font-semibold">Entry Time</th>
            <th className="px-6 py-3 font-semibold">Exit Time</th>
            <th className="px-6 py-3 font-semibold">Duration</th>
            <th className="px-6 py-3 font-semibold">Status</th>
            {showActions && <th className="px-6 py-3 font-semibold text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((record) => {
            const employee = getEmployee(record.employeeId);
            if (!employee) return null;

            return (
              <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 flex items-center gap-3">
                  <img src={employee.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                  <div>
                    <div className="font-medium text-slate-900">{employee.name}</div>
                    <div className="text-xs text-slate-500">{employee.role}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {format(parseISO(record.date), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 font-mono text-slate-600">
                  {record.checkIn ? format(parseISO(record.checkIn), 'hh:mm a') : '--:--'}
                </td>
                <td className="px-6 py-4 font-mono text-slate-600">
                  {record.checkOut ? format(parseISO(record.checkOut), 'hh:mm a') : '--:--'}
                </td>
                <td className="px-6 py-4 font-medium text-slate-700">
                  {record.durationHours > 0 ? `${record.durationHours} hrs` : '-'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border border-transparent ${getStatusColor(record.status)}`}>
                    {record.status}
                  </span>
                </td>
                {showActions && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(record)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Record"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(record)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
          {records.length === 0 && (
            <tr>
              <td colSpan={showActions ? 7 : 6} className="px-6 py-8 text-center text-slate-400">
                No attendance records found for this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceTable;