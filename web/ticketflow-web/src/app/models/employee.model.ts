// What GET /api/employees returns (EmployeeListItemDto on the API side).
export interface Employee {
  employeeId: number;
  fullName: string;
  email: string;
  roleId: number;
  roleName: string;
  departmentId: number | null;
  departmentName: string | null;
  isActive: boolean;
  createdAt: string;
}

// POST /api/employees
export interface EmployeeCreate {
  fullName: string;
  email: string;
  password: string;
  roleId: number;
  departmentId: number | null;
}

// PUT /api/employees/{id}
// password is optional — omit to keep the existing one.
export interface EmployeeUpdate {
  fullName: string;
  email: string;
  password?: string | null;
  roleId: number;
  departmentId: number | null;
  isActive: boolean;
}
