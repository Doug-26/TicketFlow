import { RoleName } from '../constants/app.constants';

// Body of POST /api/auth/login
export interface LoginRequest {
  email: string;
  password: string;
}

// Body returned by POST /api/auth/login
export interface LoginResponse {
  token: string;
  employeeId: number;
  fullName: string;
  role: RoleName;
  departmentId: number | null;
}

// Cached current user (everything except the token, which lives in TOKEN_KEY).
export interface CurrentUser {
  employeeId: number;
  fullName: string;
  role: RoleName;
  departmentId: number | null;
}
