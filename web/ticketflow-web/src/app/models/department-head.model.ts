// Anonymous shape the API returns for department heads.
export interface DepartmentHead {
  departmentHeadId: number;
  departmentId: number;
  departmentName?: string;
  employeeId: number;
  employeeName?: string;
  isActive: boolean;
  createdAt: string;
}

// POST /api/departmentheads
export interface DepartmentHeadCreate {
  departmentId: number;
  employeeId: number;
}
