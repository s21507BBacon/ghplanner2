// Shared types for the application

export interface Task {
  _id?: string;
  id: string;
  title: string;
  description?: string;
  columnId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'approved' | 'merged' | 'changes_requested';
  labels: string[];
  prUrl?: string;
  prNumber?: number; // optional shortcut when project repo configured
  assignee?: string; // deprecated - kept for backwards compatibility
  assignees?: string[]; // array of user IDs
  createdAt: Date;
  updatedAt: Date;
  checklist: ChecklistItem[];
  boardId: string;
  order: number;
  // Multi-tenant scoping (optional during migration)
  companyId?: string;
  projectId?: string;
  createdByUserId?: string;
  // Task locking
  isLocked?: boolean;
  lockedByUserId?: string;
}

export interface ChecklistItem {
  id: string;
  content: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Board {
  _id?: string;
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  // Optional scoping
  companyId?: string;
  projectId?: string;
}

export interface Column {
  _id?: string;
  id: string;
  name: string;
  color: string;
  order: number;
  boardId: string;
  createdAt: Date;
  updatedAt: Date;
  x?: number;
  y?: number;
  requiresPr?: boolean;
  moveToColumnOnMerge?: string; // Column ID to move tasks to when PR is merged
  moveToColumnOnClosed?: string; // Column ID to move tasks to when PR is closed (but not merged)
  moveToColumnOnRequestChanges?: string; // Column ID to move tasks to when PR has requested changes
}

export interface TaskUpdate {
  id: string;
  taskId: string;
  type: 'status_change' | 'assignment' | 'comment' | 'checklist_update';
  content: string;
  author: string;
  createdAt: Date;
}

export const COLUMN_COLORS = [
  {
    name: 'Slate',
    bg: 'bg-slate-500/20',
    border: 'border-slate-500',
    text: 'text-white',
    header: 'bg-slate-500/30',
    value: 'slate'
  },
  {
    name: 'Blue',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500',
    text: 'text-white',
    header: 'bg-blue-500/30',
    value: 'blue'
  },
  {
    name: 'Green',
    bg: 'bg-green-500/20',
    border: 'border-green-500',
    text: 'text-white',
    header: 'bg-green-500/30',
    value: 'green'
  },
  {
    name: 'Amber',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500',
    text: 'text-white',
    header: 'bg-amber-500/30',
    value: 'amber'
  },
  {
    name: 'Red',
    bg: 'bg-red-500/20',
    border: 'border-red-500',
    text: 'text-white',
    header: 'bg-red-500/30',
    value: 'red'
  },
  {
    name: 'Purple',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500',
    text: 'text-white',
    header: 'bg-purple-500/30',
    value: 'purple'
  },
  {
    name: 'Indigo',
    bg: 'bg-indigo-500/20',
    border: 'border-indigo-500',
    text: 'text-white',
    header: 'bg-indigo-500/30',
    value: 'indigo'
  },
  {
    name: 'Pink',
    bg: 'bg-pink-500/20',
    border: 'border-pink-500',
    text: 'text-white',
    header: 'bg-pink-500/30',
    value: 'pink'
  },
  {
    name: 'Zinc',
    bg: 'bg-zinc-500/20',
    border: 'border-zinc-500',
    text: 'text-white',
    header: 'bg-zinc-500/30',
    value: 'zinc'
  }
] as const;

export function getColumnColorClasses(color: string) {
  const colorConfig = COLUMN_COLORS.find(c => c.value === color);
  return colorConfig || COLUMN_COLORS[0]; // Default to slate
}

export const STATUS_COLORS = {
  pending: 'bg-slate-600 text-white border-slate-500 font-semibold',
  in_progress: 'bg-blue-600 text-white border-blue-500 font-semibold',
  completed: 'bg-green-500 text-white border-green-400 font-semibold',
  blocked: 'bg-red-600 text-white border-red-500 font-semibold',
  approved: 'bg-emerald-600 text-white border-emerald-500 font-semibold',
  merged: 'bg-purple-600 text-white border-purple-500 font-semibold',
  changes_requested: 'bg-orange-600 text-white border-orange-500 font-semibold',
} as const;

// New multi-tenant domain entities
export interface AppUser {
  _id?: string;
  id: string;
  email: string;
  name?: string;
  passwordHash?: string; // for credentials sign-in
  emailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  _id?: string;
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  enterpriseId?: string;
  inviteCode: string;
  inviteLinkSalt: string;
  domainAllowlist?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type Role = 'owner' | 'admin' | 'staff' | 'member';

export interface Membership {
  _id?: string;
  id: string;
  userId: string;
  companyId: string;
  role: Role;
  status: 'active' | 'pending';
  createdAt: Date;
}

export interface Project {
  _id?: string;
  id: string;
  companyId: string;
  name: string;
  description?: string;
  maxSeats: number;
  isActive: boolean;
  inviteCode: string;
  inviteLinkSalt: string;
  repoOwner?: string;
  repoName?: string;
  repoTokenEncrypted?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectPreference {
  _id?: string;
  id: string;
  userId: string;
  companyId: string;
  projectId: string;
  rank: number; // 1..N (1 = top preference)
  createdAt: Date;
}

export interface Assignment {
  _id?: string;
  id: string;
  userId: string;
  companyId: string;
  projectId: string;
  assignedAt: Date;
  assignedByUserId: string; // 'auto' or actual user id
}

// Enterprise entities
export interface Enterprise {
  _id?: string;
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  inviteCode: string;
  inviteLinkSalt: string;
  domainAllowlist?: string[];
  githubTokenEncrypted?: string; // Enterprise admin's personal GitHub access token (encrypted)
  createdAt: Date;
  updatedAt: Date;
}

export interface EnterpriseMembership {
  _id?: string;
  id: string;
  userId: string;
  enterpriseId: string;
  role: Role;
  status: 'active' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

// UserPreference for enterprise join flow
export interface UserPreference {
  _id?: string;
  id: string;
  userId: string;
  enterpriseId: string;
  companyId?: string;
  projectId?: string;
  status: 'pending' | 'allocated' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface EnterpriseInvite {
  _id?: string;
  id: string;
  enterpriseId: string;
  email: string;
  name?: string;
  token: string;
  invitedByUserId: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
}

export interface Connection {
  _id?: string;
  id: string;
  boardId: string;
  sourceColumnId: string;
  targetColumnId: string;
  label?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteStyle {
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontFamily?: string;
  textColor?: string; // hex or CSS color string
}

export interface Note {
  _id?: string;
  id: string;
  boardId: string;
  x: number;
  y: number;
  color: string; // e.g. 'yellow' | 'pink' | 'blue' | 'green' | 'purple'
  content: string;
  style?: NoteStyle;
  createdAt: Date;
  updatedAt: Date;
}
