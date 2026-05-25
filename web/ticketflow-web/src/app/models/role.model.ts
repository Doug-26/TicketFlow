// Maps to dbo.Roles.
export interface Role {
  roleId: number;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface RoleCreate {
  name: string;
}

export interface RoleUpdate {
  name: string;
  isActive: boolean;
}
