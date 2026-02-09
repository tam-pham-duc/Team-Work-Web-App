import type { Role, UserWithRole } from '../types/database';

export type Permission =
  | 'projects.create'
  | 'projects.read'
  | 'projects.update'
  | 'projects.delete'
  | 'tasks.create'
  | 'tasks.read'
  | 'tasks.update'
  | 'tasks.delete'
  | 'tasks.assign'
  | 'members.invite'
  | 'members.remove'
  | 'time_logs.create'
  | 'time_logs.read'
  | 'time_logs.update'
  | 'reports.read'
  | 'reports.create'
  | 'admin.access';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'projects.create', 'projects.read', 'projects.update', 'projects.delete',
    'tasks.create', 'tasks.read', 'tasks.update', 'tasks.delete', 'tasks.assign',
    'members.invite', 'members.remove',
    'time_logs.create', 'time_logs.read', 'time_logs.update',
    'reports.read', 'reports.create',
    'admin.access',
  ],
  manager: [
    'projects.create', 'projects.read', 'projects.update', 'projects.delete',
    'tasks.create', 'tasks.read', 'tasks.update', 'tasks.delete', 'tasks.assign',
    'members.invite', 'members.remove',
    'time_logs.create', 'time_logs.read', 'time_logs.update',
    'reports.read', 'reports.create',
  ],
  member: [
    'projects.read',
    'tasks.create', 'tasks.read', 'tasks.update',
    'time_logs.create', 'time_logs.read', 'time_logs.update',
    'reports.read',
  ],
  viewer: [
    'projects.read',
    'tasks.read',
    'time_logs.read',
    'reports.read',
  ],
};

export function hasPermission(user: UserWithRole | null, permission: Permission): boolean {
  if (!user || !user.role) return false;

  const roleName = user.role.name;
  const permissions = ROLE_PERMISSIONS[roleName] || [];

  return permissions.includes(permission);
}

export function hasAnyPermission(user: UserWithRole | null, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

export function hasAllPermissions(user: UserWithRole | null, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(user, p));
}

export function isAdmin(user: UserWithRole | null): boolean {
  return user?.role?.name === 'admin';
}

export function isManager(user: UserWithRole | null): boolean {
  return user?.role?.name === 'manager' || isAdmin(user);
}

export function isMember(user: UserWithRole | null): boolean {
  return user?.role?.name === 'member' || isManager(user);
}

export function isViewer(user: UserWithRole | null): boolean {
  return !!user?.role;
}

export function getRoleDisplayName(role: Role | null): string {
  if (!role) return 'No Role';

  const displayNames: Record<string, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    member: 'Team Member',
    viewer: 'Viewer',
  };

  return displayNames[role.name] || role.name;
}
