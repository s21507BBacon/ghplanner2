// Shared types for the application

export interface Task {
  _id?: string;
  id: string;
  title: string;
  description?: string;
  columnId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  labels: string[];
  prUrl?: string;
  assignee?: string;
  createdAt: Date;
  updatedAt: Date;
  checklist: ChecklistItem[];
  boardId: string;
  order: number;
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
  requiresPr?: boolean;
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
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-700',
    header: 'bg-slate-50',
    value: 'slate'
  },
  {
    name: 'Blue',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    header: 'bg-blue-100',
    value: 'blue'
  },
  {
    name: 'Green',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    header: 'bg-green-100',
    value: 'green'
  },
  {
    name: 'Amber',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    header: 'bg-amber-100',
    value: 'amber'
  },
  {
    name: 'Red',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    header: 'bg-red-100',
    value: 'red'
  },
  {
    name: 'Purple',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    header: 'bg-purple-100',
    value: 'purple'
  },
  {
    name: 'Indigo',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    header: 'bg-indigo-100',
    value: 'indigo'
  },
  {
    name: 'Pink',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-700',
    header: 'bg-pink-100',
    value: 'pink'
  },
  {
    name: 'Zinc',
    bg: 'bg-zinc-50',
    border: 'border-zinc-200',
    text: 'text-zinc-700',
    header: 'bg-zinc-100',
    value: 'zinc'
  }
] as const;

export function getColumnColorClasses(color: string) {
  const colorConfig = COLUMN_COLORS.find(c => c.value === color);
  return colorConfig || COLUMN_COLORS[0]; // Default to slate
}

export const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  blocked: 'bg-red-100 text-red-800 border-red-200',
} as const;
