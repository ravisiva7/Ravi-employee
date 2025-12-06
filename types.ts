export enum AttendanceStatus {
  PRESENT = 'Present',
  ABSENT = 'Absent',
  LATE = 'Late',
  HALF_DAY = 'Half Day',
  ON_LEAVE = 'On Leave'
}

export type Role = 'MANAGER' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  department?: string; // Optional, useful for employees
  roleTitle?: string;  // e.g. "Senior Developer"
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // ISO Date string YYYY-MM-DD
  checkIn: string | null; // ISO Date Time
  checkOut: string | null; // ISO Date Time
  status: AttendanceStatus;
  durationHours: number;
}

export interface MonthlyStats {
  totalWorkHours: number;
  averageCheckIn: string;
  attendanceRate: number;
  lateArrivals: number;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  EMPLOYEES = 'EMPLOYEES',
  REPORTS = 'REPORTS',
  MY_ATTENDANCE = 'MY_ATTENDANCE'
}