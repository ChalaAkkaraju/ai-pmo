/**
 * Workspace scoping — which project types a signed-in role may see.
 *
 * Migration 0045 adds roles.project_types (NULL = the per-role default in
 * lib/roles.ts). Server code (pages and route handlers) filters projects
 * by this scope; RLS only enforces "authenticated", so the app layer is the
 * gate. Keep every query for project lists going through `scopedTypes`.
 */

import { DEFAULT_ROLE_PROJECT_TYPES } from './roles';
import type { ProjectType, Role } from './types';

export function scopedTypes(role: Role): ProjectType[] {
  const fromRow = Array.isArray(role.project_types) ? role.project_types : [];
  const types = fromRow.length > 0 ? fromRow : (DEFAULT_ROLE_PROJECT_TYPES[role.role_type] ?? ['revenue']);
  return types.filter((t): t is ProjectType => ['revenue', 'it', 'capital', 'rnd'].includes(t));
}

export function roleSees(role: Role, type: ProjectType): boolean {
  return scopedTypes(role).includes(type);
}

/** Roles whose home is the IT PMO workspace. */
export function isItRole(role: Role): boolean {
  return role.role_type.startsWith('it_');
}

/** Where the role's "home" dashboard lives. */
export function homePathFor(role: Role): string {
  if (role.role_type === 'admin') return '/admin';
  if (role.role_type === 'portfolio_executive') return '/portfolio/enterprise';
  if (isItRole(role)) return '/portfolio/it';
  return '/dashboard';
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  revenue: 'Revenue',
  it: 'IT',
  capital: 'Capital',
  rnd: 'R&D / NPI',
};
