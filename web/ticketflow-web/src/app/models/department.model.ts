// Maps to dbo.Departments (what the API returns).
export interface Department {
  departmentId: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

// Body for POST /api/departments
export interface DepartmentCreate {
  name: string;
  description: string | null;
}

// Body for PUT /api/departments/{id}
export interface DepartmentUpdate {
  name: string;
  description: string | null;
  isActive: boolean;
}
