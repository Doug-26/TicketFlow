// Maps to dbo.RequestTypes (what the API returns).
// The list endpoint also joins in `departmentName` for display.
export interface RequestType {
  requestTypeId: number;
  departmentId: number;
  departmentName?: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

// Body for POST /api/requesttypes
export interface RequestTypeCreate {
  departmentId: number;
  name: string;
}

// Body for PUT /api/requesttypes/{id}
export interface RequestTypeUpdate {
  departmentId: number;
  name: string;
  isActive: boolean;
}
