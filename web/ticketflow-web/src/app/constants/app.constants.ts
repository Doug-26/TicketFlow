// Centralised string keys & enum-like constants used across the app.

// localStorage keys
export const TOKEN_KEY = 'ticketflow.token';
export const USER_KEY = 'ticketflow.user';
export const THEME_KEY = 'ticketflow.theme';

// Role names — must match the seed values in dbo.Roles.Name
export const ROLES = {
  Employee: 'Employee',
  Admin: 'Admin',
  HR: 'HR'
} as const;

export type RoleName = typeof ROLES[keyof typeof ROLES];

// Theme variants
export type ThemeName = 'light' | 'dark';
