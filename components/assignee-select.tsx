'use client';

/**
 * Assignee picker shared by the assign-task button and the assign-actions
 * panel. A task can go to a whole role (anyone with that role_type) or to a
 * specific person. Value is encoded as "role:<role_type>" or "user:<roles.id>".
 */

import { useEffect, useState } from 'react';
import { ROLE_TYPES, roleLabel } from '@/lib/roles';
import type { RoleType } from '@/lib/types';

export type Assignee = {
  id: string;
  name: string | null;
  username: string | null;
  role_type: RoleType;
};

/** Fetch the assignable people once. Empty array until loaded / on error. */
export function useAssignees(): Assignee[] {
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  useEffect(() => {
    let alive = true;
    fetch('/api/assignees', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { assignees: [] }))
      .then((j) => {
        if (alive) setAssignees(j.assignees ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return assignees;
}

const ASSIGNABLE_ROLES = ROLE_TYPES.filter((rt) => rt !== 'admin');

export function personLabel(a: Assignee): string {
  return `${a.name || a.username || 'User'} · ${roleLabel(a.role_type)}`;
}

/** Turn an encoded value into the fields the /api/actions body expects. */
export function parseAssignee(value: string): { assigned_to_role?: string; assigned_to_user?: string } {
  if (value.startsWith('user:')) return { assigned_to_user: value.slice(5) };
  if (value.startsWith('role:')) return { assigned_to_role: value.slice(5) };
  return { assigned_to_role: 'pm' };
}

/** Human label for an encoded value (for confirmation messages). */
export function labelForValue(value: string, assignees: Assignee[]): string {
  if (value.startsWith('user:')) {
    const a = assignees.find((x) => x.id === value.slice(5));
    return a ? personLabel(a) : 'the selected person';
  }
  if (value.startsWith('role:')) return `${roleLabel(value.slice(5) as RoleType)} (anyone)`;
  return 'Senior PM';
}

export function AssigneeSelect({
  value,
  onChange,
  assignees,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  assignees: Assignee[];
  className?: string;
}) {
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      <optgroup label="Whole role (anyone)">
        {ASSIGNABLE_ROLES.map((rt) => (
          <option key={`role:${rt}`} value={`role:${rt}`}>
            {roleLabel(rt)} — anyone
          </option>
        ))}
      </optgroup>
      {assignees.length > 0 && (
        <optgroup label="Specific person">
          {assignees.map((a) => (
            <option key={`user:${a.id}`} value={`user:${a.id}`}>
              {personLabel(a)}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

/**
 * Deterministically resolve typed text to a single person. Tokenises both the
 * text and each person's name + Login ID the same way and looks for a shared
 * word (3+ chars). Returns the unique match, or null when there is no match or
 * it is ambiguous — so a role-level default is kept unless a name clearly wins.
 */
export function matchPersonInText(text: string, assignees: Assignee[]): Assignee | null {
  if (!text) return null;
  const words = new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3));
  if (words.size === 0) return null;
  const hits: Assignee[] = [];
  for (const a of assignees) {
    const src = `${a.name ?? ''} ${a.username ?? ''}`.toLowerCase();
    for (const part of src.split(/[^a-z0-9]+/)) {
      if (part.length >= 3 && words.has(part)) {
        hits.push(a);
        break;
      }
    }
  }
  const ids = Array.from(new Set(hits.map((h) => h.id)));
  return ids.length === 1 ? hits.find((h) => h.id === ids[0]) ?? null : null;
}
