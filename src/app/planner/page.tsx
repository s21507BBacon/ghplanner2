"use client";

import { useState, useEffect, useMemo, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Plus, MoreHorizontal, ExternalLink, Calendar, User, X, Edit3, Trash2, Trash, GitMerge, AlertCircle, XCircle, Pin, Filter, Layout, Grid3x3, Maximize, Search, Lock, Upload, File, Download, MousePointer2, Link2, StickyNote, Shapes, Type, Hand, GitPullRequest } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, Board, type Column, type Connection, type Note, type Label, type Attachment, type Shape, type ShapeType, STATUS_COLORS, getColumnColorClasses, COLUMN_COLORS, LABEL_COLORS } from '@/lib/types';

// Add project interface
interface Project {
  id: string;
  name: string;
  description?: string;
  maxSeats: number;
  isActive: boolean;
  repoOwner?: string;
  repoName?: string;
}

function StatusBadge({ status }: { status: string }) {
  const statusLabels: Record<string, string> = {
    'pending': 'Pending',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'blocked': 'Blocked',
    'approved': 'Approved',
    'merged': 'Merged',
    'changes_requested': 'Changes Requested',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending}`}>
      {statusLabels[status] || status.replace('_', ' ')}
    </span>
  );
}

function TaskCard({
  task,
  onUpdate,
  onEdit,
  isDragging = false,
  currentUserId,
  userRole
}: {
  task: Task;
  onUpdate: (task: Task) => void;
  onEdit: (task: Task) => void;
  isDragging?: boolean;
  currentUserId?: string;
  userRole?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const completedItems = task.checklist?.filter(item => item.completed).length || 0;
  const totalItems = task.checklist?.length || 0;
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  // Check if user can edit this task
  const taskAssignees = (task as any).assignees || [];
  const isCreator = currentUserId && (task as any).createdBy?.id === currentUserId;
  const isAssignee = currentUserId && taskAssignees.includes(currentUserId);
  const isAdmin = userRole && ['owner', 'admin', 'staff'].includes(userRole);
  
  // Determine if user can edit
  const canEdit = (task as any).isLocked 
    ? (isCreator || isAssignee || isAdmin)
    : (taskAssignees.length === 0 || isAssignee || isAdmin);

  const handleCardClick = () => {
    window.location.href = `/task/${task.id}`;
  };

  return (
    <div
      className={`bg-[#1a2332] rounded-lg border border-white/10 p-4 hover:border-orange-500/50 transition-all cursor-pointer shadow-lg ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={handleCardClick}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-white flex-1 text-sm leading-tight">
            {task.title}
          </h4>
          {canEdit && (
            <button
              className="text-slate-400 hover:text-orange-400 ml-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              title="Edit task"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
          {(task as any).isLocked && (
            <div className="ml-2" title="This task is locked">
              <Lock className="w-4 h-4 text-orange-500" />
            </div>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-slate-300 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {(task as any).labelObjects?.map((label: any) => {
            const isWhite = label.color === '#ffffff' || label.color.toLowerCase() === '#fff';
            const textColor = isWhite ? 'text-black' : 'text-white';
            return (
              <span
                key={label.id}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${textColor}`}
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </span>
            );
          })}
          <StatusBadge status={task.status} />
          {(task.status === 'merged' || (task.status === 'completed' && (task as any).prStatus === 'merged')) && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-purple-500/20 text-purple-400 border-purple-500/30">
              <GitMerge className="w-3 h-3" />
              merged
            </span>
          )}
          {task.status === 'changes_requested' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/20 text-amber-400 border-amber-500/30">
              <AlertCircle className="w-3 h-3" />
              changes requested
            </span>
          )}
          {(task as any).prStatus === 'closed' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-500/20 text-red-400 border-red-500/30">
              <XCircle className="w-3 h-3" />
              closed
            </span>
          )}
        </div>

        {totalItems > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Progress</span>
              <span>{completedItems}/{totalItems}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            {((task as any).assignees?.length > 0) && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="font-mono">
                  {(task as any).assignees.length} assignee{(task as any).assignees.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            {task.prUrl && (
              <a
                href={task.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                <span>PR</span>
              </a>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(task as any).createdBy && (
              <div className="flex items-center gap-1" title={`Created by ${(task as any).createdBy.name}`}>
                <User className="w-3 h-3" />
                <span className="font-mono">{(task as any).createdBy.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColumnComponent({
  column,
  tasks,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
  onEditTask,
  isDragging,
  onDragHandlePointerDown,
  isFreeFormMode = false,
  currentUserId,
  userRole,
  allColumns = [],
}: {
  column: Column;
  tasks: Task[];
  onAddTask: (columnId: string) => void;
  onEditColumn: (column: Column) => void;
  onDeleteColumn: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  isDragging?: boolean;
  onDragHandlePointerDown?: (e: any) => void;
  isFreeFormMode?: boolean;
  currentUserId?: string;
  userRole?: string;
  allColumns?: Column[];
}) {
  const colors = getColumnColorClasses(column.color);

  // Check if this column is a destination for any auto-move rules
  const isMergeDestination = allColumns.some(col => (col as any).moveToColumnOnMerge === column.id);
  const isClosedDestination = allColumns.some(col => (col as any).moveToColumnOnClosed === column.id);
  const isChangesDestination = allColumns.some(col => (col as any).moveToColumnOnRequestChanges === column.id);
  const requiresPr = (column as any).requiresPr;

  return (
    <div className={`flex flex-col ${isFreeFormMode ? 'h-full' : ''} min-w-80 ${colors.bg} ${colors.border} border rounded-lg ${
      isDragging ? 'opacity-50 shadow-2xl' : ''
    }`}>
      <div className={`${colors.header} ${colors.text} p-4 rounded-t-lg border-b ${colors.border} cursor-move`} onPointerDown={onDragHandlePointerDown}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{column.name}</h3>
            <span className={`inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-slate-900 bg-white rounded-full`}>
              {tasks.length}
            </span>
            {requiresPr && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500 text-white border border-purple-600"
                title="This column requires PR links"
              >
                <GitPullRequest className="w-3 h-3" />
                PR
              </span>
            )}
            {isMergeDestination && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white border border-green-600"
                title="Tasks auto-move here when PR is merged"
              >
                <GitMerge className="w-3 h-3" />
                Merged
              </span>
            )}
            {isClosedDestination && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white border border-red-600"
                title="Tasks auto-move here when PR is closed without merging"
              >
                <X className="w-3 h-3" />
                Closed
              </span>
            )}
            {isChangesDestination && (
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white border border-orange-600"
                title="Tasks auto-move here when changes are requested"
              >
                <AlertCircle className="w-3 h-3" />
                Changed
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEditColumn(column)}
              className={`${colors.text} hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors`}
              title="Edit column"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDeleteColumn(column.id)}
              className={`${colors.text} hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors`}
              title="Delete column"
            >
              <X className="w-3 h-3" />
            </button>
            <button
              onClick={() => onAddTask(column.id)}
              className={`${colors.text} hover:bg-white hover:bg-opacity-20 p-1 rounded transition-colors`}
              title="Add task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className={`flex-1 p-3 space-y-3 ${isFreeFormMode ? 'overflow-y-auto scrollbar-hide' : ''}`} style={isFreeFormMode ? {
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      } : undefined}>
        <Droppable droppableId={column.id} type="task">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-3 min-h-32 ${
                snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''
              }`}
            >
              {tasks.length === 0 ? (
                <div 
                  className="text-center py-8 text-slate-400 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => onAddTask(column.id)}
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                    <Plus className="w-6 h-6" />
                  </div>
                  <p className="text-sm">No tasks yet</p>
                  <p className="text-xs">Click + to add a task</p>
                </div>
              ) : (
                <>
                  {tasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <TaskCard
                            task={task}
                            onUpdate={() => {}}
                            onEdit={onEditTask}
                            isDragging={snapshot.isDragging}
                            currentUserId={currentUserId}
                            userRole={userRole}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {/* Add task button below existing tasks */}
                  <button
                    onClick={() => onAddTask(column.id)}
                    className="w-full py-3 border-2 border-dashed border-white/20 rounded-lg text-slate-400 hover:border-orange-500/50 hover:text-orange-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add task</span>
                  </button>
                </>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}

function NewTaskModal({
  isOpen,
  onClose,
  columnId,
  columnName,
  onSubmit,
  projectId,
  boardLabels,
}: {
  isOpen: boolean;
  onClose: () => void;
  columnId: string;
  columnName: string;
  onSubmit: (task: Partial<Task>) => void;
  projectId: string;
  boardLabels: Label[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [prUrl, setPrUrl] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [projectUsers, setProjectUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const labelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      (async () => {
        const res = await fetch(`/api/projects/${projectId}/users`);
        if (res.ok) {
          const data = await res.json();
          setProjectUsers(data.users || []);
        }
      })();
    }
  }, [isOpen, projectId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(event.target as Node)) {
        setShowLabelDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const toggleAssignee = (userId: string) => {
    setAssignees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels(prev =>
      prev.includes(labelId) ? prev.filter(id => id !== labelId) : [...prev, labelId]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      columnId,
      labels: selectedLabels,
      prUrl: prUrl.trim() || undefined,
      assignees: assignees.length > 0 ? assignees : undefined,
      isLocked: isLocked,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    } as any);

    setTitle('');
    setDescription('');
    setSelectedLabels([]);
    setPrUrl('');
    setAssignees([]);
    setIsLocked(false);
    setStartDate('');
    setEndDate('');
    setSelectedFiles([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a2332] border border-white/10 rounded-lg w-1/2 max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-xl font-semibold text-white">
            Add Task to {columnName}
          </h3>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="Enter task title..."
              required
            />
          </div>

          {/* Assignment / Lock row */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1" ref={assigneeDropdownRef}>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Assignees
              </label>
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-left focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              >
                {assignees.length === 0 ? (
                  <span className="text-slate-400">Select assignees...</span>
                ) : (
                  <span className="text-white">
                    {assignees.length} user{assignees.length > 1 ? 's' : ''} selected
                  </span>
                )}
              </button>
              {showAssigneeDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a2332] border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {projectUsers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-400">No users in this project</div>
                  ) : (
                    projectUsers.map(user => (
                      <label key={user.id} className="flex items-center px-3 py-2 hover:bg-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignees.includes(user.id)}
                          onChange={() => toggleAssignee(user.id)}
                          className="mr-2"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{user.name}</div>
                          <div className="text-xs text-slate-400">{user.email}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex items-end pb-3">
              <label 
                className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors"
                title="Locking task prevents other users who are not the creator or assignees from making edits to task"
              >
                <input type="checkbox" checked={isLocked} onChange={(e) => setIsLocked(e.target.checked)} className="sr-only" />
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg border-2 transition-colors ${
                  isLocked 
                    ? 'bg-orange-500 border-orange-500 text-white' 
                    : 'border-white/30 text-slate-400 hover:border-white/50'
                }`}>
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-sm">Lock task</span>
              </label>
            </div>
          </div>

          {/* Column / Label / Attachments row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Column
              </label>
              <input
                type="text"
                value={columnName}
                disabled
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-400 cursor-not-allowed"
              />
            </div>
            <div className="relative" ref={labelDropdownRef}>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Labels
              </label>
              <button
                type="button"
                onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-left focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              >
                {selectedLabels.length === 0 ? (
                  <span className="text-slate-400">Select labels...</span>
                ) : (
                  <div className="flex gap-1 flex-wrap">
                    {selectedLabels.map(labelId => {
                      const label = boardLabels.find(l => l.id === labelId);
                      if (!label) return null;
                      const isWhite = label.color === '#ffffff' || label.color.toLowerCase() === '#fff';
                      const textColor = isWhite ? 'text-black' : 'text-white';
                      return (
                        <span
                          key={label.id}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${textColor}`}
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
              {showLabelDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a2332] border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {boardLabels.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-400">No labels available</div>
                  ) : (
                    boardLabels.map(label => {
                      const isWhite = label.color === '#ffffff' || label.color.toLowerCase() === '#fff';
                      const textColor = isWhite ? 'text-black' : 'text-white';
                      return (
                        <label key={label.id} className="flex items-center px-3 py-2 hover:bg-white/5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedLabels.includes(label.id)}
                            onChange={() => toggleLabel(label.id)}
                            className="mr-2"
                          />
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${textColor}`}
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Attachments
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload files
              </button>
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-white truncate">{file.name}</span>
                        <span className="text-slate-400 text-xs flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-400 hover:text-red-300 ml-2 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Start date / End date row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Start date (optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                End date (optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="Enter task description..."
            />
          </div>

          {/* PR Link */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              PR Link
            </label>
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="https://github.com/owner/repo/pull/123"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="gh-cta-button px-6 py-2 rounded-lg text-white font-semibold"
            >
              Add Task
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-300 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LabelManagementModal({
  isOpen,
  onClose,
  labels,
  onCreateLabel,
  onDeleteLabel,
}: {
  isOpen: boolean;
  onClose: () => void;
  labels: Label[];
  onCreateLabel: (name: string, color: string) => void;
  onDeleteLabel: (labelId: string) => void;
}) {
  const [labelName, setLabelName] = useState('');
  const [labelColor, setLabelColor] = useState<string>(LABEL_COLORS[0].value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelName.trim()) return;
    onCreateLabel(labelName.trim(), labelColor);
    setLabelName('');
    setLabelColor(LABEL_COLORS[0].value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a2332] border border-white/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Manage Labels</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Create new label form */}
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-3">Create New Label</h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-300 mb-2">Label Name</label>
                <input
                  type="text"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
                  placeholder="Enter label name..."
                  required
                />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-slate-300 mb-2">Color</label>
                <select
                  value={labelColor}
                  onChange={(e) => setLabelColor(e.target.value)}
                  className={`w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-orange-500 transition-colors text-sm ${labelColor === '#ffffff' || labelColor.toLowerCase() === '#fff' ? 'text-black' : 'text-white'}`}
                  style={{ backgroundColor: labelColor }}
                >
                  {LABEL_COLORS.map(color => (
                    <option key={color.value} value={color.value} style={{ backgroundColor: color.value, color: color.value === '#ffffff' ? '#000000' : '#ffffff' }}>
                      {color.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="gh-cta-button px-4 py-2 rounded-lg text-white font-semibold text-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Existing labels list */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Existing Labels</h4>
            {labels.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">No labels yet</p>
                <p className="text-xs">Create your first label above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {labels.map(label => {
                  const isWhite = label.color === '#ffffff' || label.color.toLowerCase() === '#fff';
                  const textColor = isWhite ? 'text-black' : 'text-white';
                  return (
                    <div
                      key={label.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${textColor}`}
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                      <button
                        onClick={() => onDeleteLabel(label.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1"
                        title="Delete label"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlannerBoard() {
  const { data: session } = useSession();
  const currentUserId = (session as any)?.userId;
  const [userRole, setUserRole] = useState<string | undefined>();
  const [isMounted, setIsMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskColumnId, setNewTaskColumnId] = useState('');
  const [newTaskColumnName, setNewTaskColumnName] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);

  // Column management state
  const [isNewColumnModalOpen, setIsNewColumnModalOpen] = useState(false);
  const [isEditColumnModalOpen, setIsEditColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Pull Request modal state for PR-required columns
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [prModalTask, setPrModalTask] = useState<Task | null>(null);
  const [pendingMove, setPendingMove] = useState<DropResult | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Connection edit state
  const [draggingConn, setDraggingConn] = useState<{ id: string; end: 'source' | 'target' } | null>(null);
  const [draggingControlPoint, setDraggingControlPoint] = useState<{ id: string; point: 1 | 2 } | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [editingConnectionEnd, setEditingConnectionEnd] = useState<'source' | 'target' | null>(null);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [isNotePaletteOpen, setIsNotePaletteOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [noteDragOffset, setNoteDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [resizingColumnId, setResizingColumnId] = useState<string | null>(null);
  const [resizingNoteId, setResizingNoteId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ width: number; height: number; x: number; y: number } | null>(null);
  
  // Board panning state (right mouse button drag)
  // Start with offset at top of screen
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Shapes state
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [draggingShapeId, setDraggingShapeId] = useState<string | null>(null);
  const [shapeDragOffset, setShapeDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedShapeType, setSelectedShapeType] = useState<ShapeType | null>(null);
  const [shapeFillColor, setShapeFillColor] = useState<string>('#60a5fa');
  const [shapeStrokeColor, setShapeStrokeColor] = useState<string>('#1e293b');
  const [shapeNoFill, setShapeNoFill] = useState<boolean>(false);
  // Defaults for new text items
  const [textColorDefault, setTextColorDefault] = useState<string>('#ffffff');
  const [textFontSizeDefault, setTextFontSizeDefault] = useState<number>(20);
  const [textFontFamilyDefault, setTextFontFamilyDefault] = useState<string>('Inter, system-ui, sans-serif');
  const [editingTextShapeId, setEditingTextShapeId] = useState<string | null>(null);
  const [editingTextContent, setEditingTextContent] = useState<string>('');

  // View mode and filter state
  const [viewMode, setViewMode] = useState<'free-form' | 'traditional' | 'grid'>('free-form');
  const [toolbarMode, setToolbarMode] = useState<'normal' | 'connect' | 'note' | 'shape' | 'pan'>('normal');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterPRNumber, setFilterPRNumber] = useState('');
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const [filterAssignees, setFilterAssignees] = useState<string[]>([]);
  const [filterHasPR, setFilterHasPR] = useState<boolean | null>(null);
  const [selectedGridColumn, setSelectedGridColumn] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Labels state
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  // Track DOM rects of each column for accurate side anchors
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [columnRects, setColumnRects] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({});

  const setColumnRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) columnRefs.current.set(id, el);
    else columnRefs.current.delete(id);
  };

  const computeColumnRects = useCallback(() => {
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const boardBox = boardEl.getBoundingClientRect();
    const next: Record<string, { x: number; y: number; width: number; height: number }> = {};
    columnRefs.current.forEach((el, id) => {
      const r = el.getBoundingClientRect();
      next[id] = { x: r.left - boardBox.left, y: r.top - boardBox.top, width: r.width, height: r.height };
    });
    setColumnRects(next);
  }, []);

  useEffect(() => {
    computeColumnRects();
  }, [columns, draggingColumnId, computeColumnRects]);

  useEffect(() => {
    const onResize = () => computeColumnRects();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [computeColumnRects]);

  // Recompute positions when connections are loaded to ensure arrows connect properly
  useEffect(() => {
    if (connections.length > 0) {
      // Use requestAnimationFrame for better timing, then add a small delay
      // to ensure DOM is fully laid out after navigation
      requestAnimationFrame(() => {
        setTimeout(() => computeColumnRects(), 150);
      });
    }
  }, [connections, computeColumnRects]);

  // Helper to find which column is at a board-relative point
  const columnIdAtPoint = useCallback((x: number, y: number) => {
    for (const [id, r] of Object.entries(columnRects)) {
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) return id;
    }
    return null;
  }, [columnRects]);

  // When switching into connect mode, exit any connection editing state
  useEffect(() => {
    if (connectMode) {
      setSelectedConnectionId(null);
      setDraggingConn(null);
      setEditingConnectionEnd(null);
    }
  }, [connectMode]);

  // Additional effect to recompute after mount and columns are available
  useEffect(() => {
    if (isMounted && columns.length > 0 && connections.length > 0) {
      // Give extra time for initial render to complete
      requestAnimationFrame(() => {
        setTimeout(() => computeColumnRects(), 100);
      });
    }
  }, [isMounted, columns.length, connections.length, computeColumnRects]);

  // Project/company scoping from URL
  const searchParams = useSearchParams();
  const projectIdFromQuery = searchParams.get('projectId') || '';
  const companyIdFromQueryParam = searchParams.get('companyId') || '';

  // Fix for react-beautiful-dnd hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Revert a pending move back to its original column
  const revertPendingMove = async () => {
    if (!pendingMove || !prModalTask) return;
    const sourceId = pendingMove.source.droppableId; // original column
    const destId = pendingMove.destination?.droppableId as string; // where it was dropped

    // Compute current index of the task in the destination column (after the optimistic move)
    const destTasks = tasks
      .filter(t => t.columnId === destId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIndexInDest = destTasks.findIndex(t => t.id === prModalTask.id);

    const reverse = {
      draggableId: prModalTask.id,
      source: { droppableId: destId, index: Math.max(0, currentIndexInDest) },
      destination: { droppableId: sourceId, index: pendingMove.source.index },
    } as unknown as DropResult;

    await applyDragMove(reverse, false);
    setPrModalTask(null);
    setPendingMove(null);
  };

  // Map a task status to a matching column (by common names)
  const mapStatusToColumnId = (status: Task['status'], cols: Column[]) => {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
    const findBy = (preds: string[]) =>
      cols.find(c => {
        const n = norm(c.name);
        return preds.some(p => n.includes(p));
      })?.id;

    switch (status) {
      case 'pending':
        return findBy(['backlog', 'todo', 'to-do']);
      case 'in_progress':
        return findBy(['inprogress', 'progress', 'doing']);
      case 'completed':
        return findBy(['done', 'complete', 'completed']);
      case 'blocked':
        return findBy(['blocked', 'blockers']);
      default:
        return undefined;
    }
  };

  // Add the fetchProject function after fetchBoards
  const fetchProject = async () => {
    if (!projectIdFromQuery || !companyIdFromQueryParam) return;
    
    setProjectLoading(true);
    try {
      const response = await fetch(`/api/projects?companyId=${companyIdFromQueryParam}`);
      const data = await response.json();
      if (data.projects) {
        const foundProject = data.projects.find((p: Project) => p.id === projectIdFromQuery);
        setProject(foundProject || null);
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setProjectLoading(false);
    }
  };

  // Update the useEffect hooks to handle dependencies correctly
  useEffect(() => {
    if (projectIdFromQuery) {
      fetchProject();
    } else {
      fetchBoards();
    }
  }, [projectIdFromQuery, companyIdFromQueryParam]);

  useEffect(() => {
    if (!projectLoading && selectedBoard === '' && projectIdFromQuery) {
      fetchBoards();
    }
  }, [project, projectLoading, selectedBoard]);

  useEffect(() => {
    if (selectedBoard) {
      fetchTasks();
      fetchColumns();
      fetchConnections();
      fetchNotes();
      fetchLabels();
      fetchShapes();
    }
  }, [selectedBoard]);

  const fetchBoards = async () => {
    try {
      const qs = new URLSearchParams();
      if (projectIdFromQuery) qs.set('projectId', projectIdFromQuery);
      if (companyIdFromQueryParam) qs.set('companyId', companyIdFromQueryParam);
      const response = await fetch(`/api/planner/boards${qs.toString() ? `?${qs.toString()}` : ''}`);
      const data = await response.json();
      setBoards(data.boards || []);

      if (data.boards?.length > 0) {
        setSelectedBoard(data.boards[0].id);
      } else {
        // Create a default board with project name
        const defaultBoardName = project ? `${project.name} 1` : 'My Project';
        await createBoard(defaultBoardName);
      }
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    }
  };

  const createBoard = async (name: string) => {
    try {
      const response = await fetch('/api/planner/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          projectId: projectIdFromQuery || undefined, 
          companyId: companyIdFromQueryParam || undefined 
        }),
      });
      const data = await response.json();
      setBoards(prev => [...prev, data]); // Add new board to existing boards, don't replace
      setSelectedBoard(data.id);
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  };

  const deleteBoard = async (boardId: string) => {
    try {
      const response = await fetch(`/api/planner/boards?id=${boardId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete board');
        return;
      }

      // Remove board from state
      setBoards(prev => prev.filter(b => b.id !== boardId));

      // If deleted board was selected, select another board
      if (selectedBoard === boardId) {
        const remainingBoards = boards.filter(b => b.id !== boardId);
        if (remainingBoards.length > 0) {
          setSelectedBoard(remainingBoards[0].id);
        } else {
          // Create a new default board if none left
          const defaultBoardName = project ? `${project.name} 1` : 'My Project';
          await createBoard(defaultBoardName);
        }
      }
    } catch (error) {
      console.error('Failed to delete board:', error);
      alert('Failed to delete board. Please try again.');
    }
  };

  const updateBoardViewMode = async (boardId: string, newViewMode: 'free-form' | 'traditional' | 'grid') => {
    try {
      const response = await fetch('/api/planner/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: boardId, viewMode: newViewMode }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update view mode');
        return;
      }

      const updated = await response.json();
      setBoards(prev => prev.map(b => (b.id === boardId ? { ...b, viewMode: updated.viewMode } : b)));
      setViewMode(newViewMode);
    } catch (error) {
      console.error('Failed to update view mode:', error);
      alert('Failed to update view mode. Please try again.');
    }
  };

  // Sync view mode when board changes
  useEffect(() => {
    const currentBoard = boards.find(b => b.id === selectedBoard);
    if (currentBoard?.viewMode) {
      setViewMode(currentBoard.viewMode);
    }
  }, [selectedBoard, boards]);

  // Reset toolbar mode when leaving free-form view
  useEffect(() => {
    if (viewMode !== 'free-form') {
      setToolbarMode('normal');
      setConnectMode(false);
      setConnectSource(null);
    }
  }, [viewMode]);

  const fetchColumns = async () => {
    if (!selectedBoard) return;

    try {
      const response = await fetch(`/api/planner/columns?boardId=${selectedBoard}`);
      const data = await response.json();
      setColumns(data.columns || []);

      // Create default columns if none exist
      if (data.columns.length === 0) {
        await createDefaultColumns();
      }
    } catch (error) {
      console.error('Failed to fetch columns:', error);
    }
  };

  const createDefaultColumns = async () => {
    const defaultColumns = [
      { name: 'Backlog', color: 'slate' },
      { name: 'In Progress', color: 'blue' },
      { name: 'Review', color: 'amber' },
      { name: 'Done', color: 'green' },
    ];

    try {
      for (const column of defaultColumns) {
        await fetch('/api/planner/columns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...column, boardId: selectedBoard }),
        });
      }
      fetchColumns(); // Refresh columns after creation
    } catch (error) {
      console.error('Failed to create default columns:', error);
    }
  };

  const fetchTasks = async () => {
    if (!selectedBoard) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/planner/tasks?boardId=${selectedBoard}${projectIdFromQuery ? `&projectId=${projectIdFromQuery}` : ''}`);
      const data = await response.json();
      setTasks(data.tasks || []);
      
      // Check for merged PRs and auto-move tasks
      await checkMergedPRs();
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkMergedPRs = async () => {
    if (!selectedBoard) return;

    try {
      console.log('Checking PR statuses and syncing task statuses...');
      const response = await fetch('/api/planner/tasks/check-merged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: selectedBoard }),
      });

      if (response.ok) {
        const data = await response.json();
        let needsRefresh = false;
        
        if (data.movedTasks && data.movedTasks.length > 0) {
          console.log(`Auto-moved ${data.movedTasks.length} tasks:`, data.movedTasks);
          needsRefresh = true;
        }
        
        if (data.statusUpdates && data.statusUpdates.length > 0) {
          console.log(`Updated ${data.statusUpdates.length} task statuses:`, data.statusUpdates);
          needsRefresh = true;
        }
        
        if (data.syncedStatuses && data.syncedStatuses.length > 0) {
          console.log(`Synced ${data.syncedStatuses.length} task statuses with column names:`, data.syncedStatuses);
          needsRefresh = true;
        }
        
        if (needsRefresh) {
          // Refresh tasks to show the updated positions and statuses
          const tasksResponse = await fetch(`/api/planner/tasks?boardId=${selectedBoard}${projectIdFromQuery ? `&projectId=${projectIdFromQuery}` : ''}`);
          const tasksData = await tasksResponse.json();
          setTasks(tasksData.tasks || []);
        }
      }
    } catch (error) {
      console.error('Failed to check PRs:', error);
    }
  };

  const createTask = async (taskData: Partial<Task>) => {
    try {
      const response = await fetch('/api/planner/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskData,
          boardId: selectedBoard,
          ...(projectIdFromQuery ? { projectId: projectIdFromQuery } : {}),
          ...(companyIdFromQueryParam ? { companyId: companyIdFromQueryParam } : {}),
        }),
      });
      await response.json();
      // Refetch all tasks to get populated label data
      await fetchTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const createColumn = async (columnData: { name: string; color: string; requiresPr: boolean; moveToColumnOnMerge?: string; moveToColumnOnClosed?: string; moveToColumnOnRequestChanges?: string }) => {
    try {
      // Calculate position within visible viewport
      let x = 20; // Default position with some padding
      let y = 20;
      
      // Get the scroll container (parent of boardRef)
      const boardEl = boardRef.current;
      if (boardEl) {
        const scrollContainer = boardEl.parentElement;
        if (scrollContainer) {
          // Get current scroll position
          const scrollLeft = scrollContainer.scrollLeft;
          const scrollTop = scrollContainer.scrollTop;
          
          // Position new column in the visible area with padding
          x = scrollLeft + 20;
          y = scrollTop + 20;
          
          // Check if position would overlap with existing columns
          const existingColumns = columns.filter(col => {
            const colWithPos = col as Column & { x?: number; y?: number };
            const colX = colWithPos.x || 0;
            const colY = colWithPos.y || 0;
            // Check if position is too close to existing column
            return Math.abs(colX - x) < 100 && Math.abs(colY - y) < 100;
          });
          
          // If there's overlap, offset the position
          if (existingColumns.length > 0) {
            x += 40;
            y += 40;
          }
        }
      }
      
      const response = await fetch('/api/planner/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...columnData, 
          boardId: selectedBoard,
          x: Math.round(x),
          y: Math.round(y)
        }),
      });
      const data = await response.json();
      setColumns(prev => [...prev, data]);
    } catch (error) {
      console.error('Failed to create column:', error);
    }
  };

  const fetchConnections = async () => {
    if (!selectedBoard) return;
    try {
      const res = await fetch(`/api/planner/connections?boardId=${selectedBoard}`);
      const data = await res.json();
      setConnections(data.connections || []);
      // Recompute column positions after connections are loaded to ensure arrows are positioned correctly
      // Use requestAnimationFrame for better timing with the render cycle
      requestAnimationFrame(() => {
        setTimeout(() => computeColumnRects(), 150);
      });
    } catch (e) {
      console.error('Failed to fetch connections:', e);
    }
  };

  const fetchLabels = async () => {
    if (!selectedBoard) return;
    try {
      const res = await fetch(`/api/planner/labels?boardId=${selectedBoard}`);
      const data = await res.json();
      setLabels(data.labels || []);
    } catch (e) {
      console.error('Failed to fetch labels:', e);
    }
  };

  const createLabel = async (name: string, color: string) => {
    try {
      const res = await fetch('/api/planner/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          color,
          boardId: selectedBoard,
          projectId: projectIdFromQuery,
          companyId: companyIdFromQueryParam,
        }),
      });
      const data = await res.json();
      setLabels(prev => [...prev, data.label]);
    } catch (e) {
      console.error('Failed to create label:', e);
    }
  };

  const deleteLabel = async (labelId: string) => {
    try {
      await fetch(`/api/planner/labels?id=${labelId}`, {
        method: 'DELETE',
      });
      setLabels(prev => prev.filter(l => l.id !== labelId));
    } catch (e) {
      console.error('Failed to delete label:', e);
    }
  };

  // Sticky notes CRUD
  const fetchNotes = async () => {
    if (!selectedBoard) return;
    try {
      const res = await fetch(`/api/planner/notes?boardId=${selectedBoard}`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (e) {
      console.error('Failed to fetch notes:', e);
    }
  };

  const createNote = async (color: string) => {
    if (!selectedBoard) return;
    try {
      const res = await fetch('/api/planner/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: selectedBoard, x: 120, y: 120, color, content: '' })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to create note');
        return;
      }
      const note = await res.json();
      setNotes(prev => [...prev, note]);
    } catch (e) {
      console.error('Failed to create note:', e);
    }
  };

  const updateNote = async (id: string, updates: Partial<Pick<Note, 'x' | 'y' | 'width' | 'height' | 'color' | 'content' | 'style'>>) => {
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...updates } as Note : n)));
    try {
      await fetch('/api/planner/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });
    } catch (e) {
      console.error('Failed to update note:', e);
    }
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    setNotes(prev => prev.filter(n => n.id !== id));
    setSelectedNoteId(null);
    setEditingNoteId(null);
    try {
      await fetch(`/api/planner/notes?id=${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  // Shapes CRUD
  const fetchShapes = async () => {
    if (!selectedBoard) return;
    try {
      const res = await fetch(`/api/planner/shapes?boardId=${selectedBoard}`);
      const data = await res.json();
      setShapes(data.shapes || []);
    } catch (e) {
      console.error('Failed to fetch shapes:', e);
    }
  };

  const createShape = async (shape: Partial<Shape>) => {
    if (!selectedBoard) return;
    try {
      const res = await fetch('/api/planner/shapes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...shape, boardId: selectedBoard })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Failed to create shape:', err.error);
        return null;
      }
      const savedShape = await res.json();
      return savedShape;
    } catch (e) {
      console.error('Failed to create shape:', e);
      return null;
    }
  };

  const updateShapeInDb = async (id: string, updates: Partial<Shape>) => {
    try {
      await fetch('/api/planner/shapes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });
    } catch (e) {
      console.error('Failed to update shape:', e);
    }
  };

  const deleteShape = async (id: string) => {
    setShapes(prev => prev.filter(s => s.id !== id));
    setSelectedShapeId(null);
    try {
      await fetch(`/api/planner/shapes?id=${id}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Failed to delete shape:', e);
    }
  };

  const createConnection = async (sourceColumnId: string, targetColumnId: string, label?: string, color?: string) => {
    try {
      const res = await fetch('/api/planner/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId: selectedBoard, sourceColumnId, targetColumnId, label, color }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to create connection');
        return;
      }
      const conn = await res.json();
      setConnections(prev => [...prev, conn]);
    } catch (e) {
      console.error('Failed to create connection:', e);
    }
  };

  const updateConnection = async (id: string, updates: { 
    sourceColumnId?: string; 
    targetColumnId?: string; 
    label?: string; 
    color?: string; 
    style?: 'solid' | 'dashed' | 'dotted'; 
    arrowType?: 'single' | 'double' | 'none';
    controlPoint1?: { x: number; y: number };
    controlPoint2?: { x: number; y: number };
    sourceAnchorSide?: 'top' | 'right' | 'bottom' | 'left';
    targetAnchorSide?: 'top' | 'right' | 'bottom' | 'left';
  }) => {
    try {
      const res = await fetch('/api/planner/connections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to update connection');
        return;
      }
      const updated = await res.json();
      setConnections(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
    } catch (e) {
      console.error('Failed to update connection:', e);
    }
  };

  const deleteConnection = async (id: string) => {
    // First, optimistically remove from state to prevent multiple delete attempts
    setConnections(prev => prev.filter(c => c.id !== id));
    if (selectedConnectionId === id) {
      setSelectedConnectionId(null);
      setEditingConnectionEnd(null);
    }
    if (draggingConn?.id === id) setDraggingConn(null);
    
    try {
      const res = await fetch(`/api/planner/connections?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        // If it's a 404, the connection is already deleted, so we can ignore it
        if (res.status === 404) {
          console.log('Connection already deleted:', id);
          return;
        }
        
        // For other errors, restore the connection and show an alert
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete connection');
        
        // Restore the connection by re-fetching
        await fetchConnections();
        return;
      }
    } catch (e) {
      console.error('Failed to delete connection:', e);
      // Restore connections on error
      await fetchConnections();
    }
  };

  const updateColumn = async (columnId: string, updates: { name?: string; color?: string; requiresPr?: boolean; moveToColumnOnMerge?: string; moveToColumnOnClosed?: string; moveToColumnOnRequestChanges?: string; x?: number; y?: number; width?: number; height?: number }) => {
    try {
      console.log('Updating column:', columnId, 'with updates:', updates);
      const response = await fetch('/api/planner/columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: columnId, ...updates }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to update column:', errorData);
        alert(errorData.error || 'Failed to update column');
        return;
      }
      
      const data = await response.json();
      console.log('Column updated successfully:', data);
      console.log('Current columns before update:', columns);
      console.log('Matching column ID:', columnId, 'with returned ID:', data.id);
      
      setColumns(prev => {
        const updated = prev.map(col => {
          console.log('Comparing', col.id, '===', columnId, ':', col.id === columnId);
          return col.id === columnId ? data : col;
        });
        console.log('Updated columns:', updated);
        return updated;
      });
    } catch (error) {
      console.error('Failed to update column:', error);
    }
  };

  const deleteColumn = async (columnId: string) => {
    const tasksInColumn = tasks.filter(t => t.columnId === columnId);
    if (tasksInColumn.length > 0) {
      alert('Cannot delete column with tasks. Move tasks to another column first.');
      return;
    }

    try {
      await fetch(`/api/planner/columns?id=${columnId}`, {
        method: 'DELETE',
      });
      setColumns(prev => prev.filter(col => col.id !== columnId));
    } catch (error) {
      console.error('Failed to delete column:', error);
    }
  };

  const handleAddTask = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column) {
      setNewTaskColumnId(columnId);
      setNewTaskColumnName(column.name);
      setIsNewTaskModalOpen(true);
    }
  };

  const handleEditColumn = (column: Column) => {
    setEditingColumn(column);
    setIsEditColumnModalOpen(true);
  };

  const handleDeleteColumn = (columnId: string) => {
    if (confirm('Are you sure you want to delete this column?')) {
      deleteColumn(columnId);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditTaskModalOpen(true);
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    // Optimistic update so UI reflects instantly (e.g., column move)
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === taskId);
      if (idx === -1) return prev;
      const current = prev[idx];
      const optimistic: Task = { ...current, ...updates } as Task;
      const next = prev.slice();
      next[idx] = optimistic;
      return next;
    });

    try {
      const qs = new URLSearchParams();
      qs.set('id', taskId);
      Object.entries(updates).forEach(([k, v]) => {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      });
      const response = await fetch(`/api/planner/tasks?${qs.toString()}`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // Refetch all tasks to get populated label data
      await fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      // Re-sync from server if update failed
      fetchTasks();
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/planner/tasks?id=${taskId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({} as any));
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (editingTask && editingTask.id === taskId) {
        setIsEditTaskModalOpen(false);
        setEditingTask(null);
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const handleColumnReorder = async (sourceIndex: number, destinationIndex: number) => {
    console.log('handleColumnReorder called:', { sourceIndex, destinationIndex });
    const reorderedColumns = Array.from(columns);
    const [movedColumn] = reorderedColumns.splice(sourceIndex, 1);
    reorderedColumns.splice(destinationIndex, 0, movedColumn);

    console.log('Reordered columns:', reorderedColumns.map((c, i) => ({ name: c.name, order: i })));

    // Update local state optimistically with new order values
    const columnsWithNewOrder = reorderedColumns.map((col, index) => ({
      ...col,
      order: index
    }));
    setColumns(columnsWithNewOrder);

    // Persist the new order to the database
    try {
      const updatePromises = columnsWithNewOrder.map((col, index) => {
        console.log(`Updating column ${col.name} to order ${index}`);
        return fetch('/api/planner/columns', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: col.id, order: index }),
        });
      });
      await Promise.all(updatePromises);
      console.log('All column order updates completed');
    } catch (error) {
      console.error('Failed to persist column order:', error);
      // Revert on error
      fetchColumns();
    }
  };

  // Patch on server without touching local state (used for DnD persistence)
  const patchTaskSilently = async (taskId: string, updates: Partial<Task>) => {
    try {
      console.log('Patching task:', taskId, updates);
      const qs = new URLSearchParams();
      qs.set('id', taskId);
      Object.entries(updates).forEach(([k, v]) => {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      });
      const response = await fetch(`/api/planner/tasks?${qs.toString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, ...updates }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Silent patch failed', response.status, errorData);
        return false;
      }
      const result = await response.json();
      console.log('Patch successful:', result);
      return true;
    } catch (e) {
      console.error('Silent patch error', e);
      return false;
    }
  };

  const applyDragMove = async (result: DropResult, persist: boolean = true) => {
    console.log('applyDragMove called:', result, 'persist:', persist);
    const { destination, source, draggableId } = result;

    if (!destination) {
      console.log('No destination in applyDragMove');
      return;
    }
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      console.log('Same position in applyDragMove');
      return;
    }

    const moving = tasks.find(t => t.id === draggableId);
    console.log('Found moving task:', moving);
    if (!moving) {
      console.error('Moving task not found in applyDragMove');
      return;
    }

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;
    const sameColumn = sourceColId === destColId;
    console.log('Source column:', sourceColId, 'Dest column:', destColId, 'Same:', sameColumn);

    // Build working lists per column
    const byOrder = (a: Task, b: Task) => (a.order || 0) - (b.order || 0);
    const sourceList = tasks.filter(t => t.columnId === sourceColId).sort(byOrder);
    const destList = sameColumn ? sourceList.slice() : tasks.filter(t => t.columnId === destColId).sort(byOrder);

    // Remove from source
    const fromIndex = sourceList.findIndex(t => t.id === draggableId);
    if (fromIndex === -1) return;
    const [moved] = sourceList.splice(fromIndex, 1);
    moved.columnId = destColId;

    // Insert into destination at new position
    const insertInto = sameColumn ? sourceList : destList;
    insertInto.splice(destination.index, 0, moved);

    // Re-index orders
    sourceList.forEach((t, i) => (t.order = i));
    if (!sameColumn) destList.forEach((t, i) => (t.order = i));

    // Rebuild final tasks array
    const unaffected = tasks.filter(t => t.columnId !== sourceColId && t.columnId !== destColId);
    const next = sameColumn ? [...unaffected, ...sourceList] : [...unaffected, ...sourceList, ...destList];
    setTasks(next);

    if (persist) {
      // Persist updates (column change + minimal order updates) without re-touching local state
      try {
        const ops: Array<Promise<any>> = [];
        // Always persist moved task column+order
        const movedIndex = insertInto.findIndex(t => t.id === moved.id);
        ops.push(patchTaskSilently(moved.id, { columnId: destColId, order: movedIndex }));

        // Persist order changes for tasks that shifted position
        const changedInSource = sourceList.filter((t, i) => t.order !== i);
        const changedInDest = sameColumn ? [] : destList.filter((t, i) => t.order !== i);
        changedInSource.forEach((t, i) => ops.push(patchTaskSilently(t.id, { order: t.order || i })));
        changedInDest.forEach((t, i) => ops.push(patchTaskSilently(t.id, { order: t.order || i })));
        await Promise.all(ops);
      } catch (e) {
        console.warn('Failed to persist DnD updates', e);
      }
    }
  };

  const onDragEnd = async (result: DropResult) => {
    try {
      console.log('onDragEnd called:', result);
      const { destination, source, draggableId, type } = result;
      if (!destination) {
        console.log('No destination, drag cancelled');
        return;
      }
      if (destination.droppableId === source.droppableId && destination.index === source.index) {
        console.log('Same position, no change needed');
        return;
      }

      // Check if dragging a column (supports both free-form and traditional modes)
      if (type === 'column' || draggableId.startsWith('column-') || draggableId.startsWith('col-')) {
        console.log('Column drag detected');
        await handleColumnReorder(source.index, destination.index);
        return;
      }

      const moving = tasks.find(t => t.id === draggableId);
      console.log('Moving task:', moving);
      if (!moving) {
        console.error('Task not found:', draggableId);
        return;
      }
      const sameColumn = destination.droppableId === source.droppableId;

      // If destination column requires PR and task has none, open modal and only move locally (no persist yet)
      if (!sameColumn) {
        const destCol = columns.find(c => c.id === destination.droppableId);
        console.log('Destination column:', destCol);
        console.log('All columns:', columns);
        console.log('Looking for droppableId:', destination.droppableId);
        const requiresPr = !!(destCol as any)?.requiresPr;
        console.log('RequiresPr:', requiresPr, 'Task prUrl:', moving.prUrl);
        if (requiresPr && !moving.prUrl) {
          console.log('Column requires PR, showing modal');
          await applyDragMove(result, false);
          setPrModalTask(moving);
          setPendingMove(result);
          setIsPrModalOpen(true);
          return;
        }
      }

      // Otherwise, apply move and persist immediately
      console.log('Applying drag move with persistence');
      await applyDragMove(result, true);
    } catch (error) {
      console.error('Error in onDragEnd:', error);
      alert('Failed to move task. Please try again.');
    }
  };

  // Filter tasks based on current filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      if (filterSearch && !task.title.toLowerCase().includes(filterSearch.toLowerCase()) && 
          !(task.description || '').toLowerCase().includes(filterSearch.toLowerCase())) {
        return false;
      }
      
      // Label filter
      if (filterLabels.length > 0) {
        const taskLabels = task.labels || [];
        if (!filterLabels.some(label => taskLabels.includes(label))) {
          return false;
        }
      }
      
      // Assignee filter
      if (filterAssignees.length > 0) {
        const taskAssignees = (task as any).assignees || [];
        if (!filterAssignees.some(assignee => taskAssignees.includes(assignee))) {
          return false;
        }
      }
      
      // PR filter
      if (filterHasPR !== null) {
        const hasPR = !!task.prUrl;
        if (hasPR !== filterHasPR) {
          return false;
        }
      }
      
      return true;
    });
  }, [tasks, filterSearch, filterLabels, filterAssignees, filterHasPR]);

  const tasksByColumn = useMemo(() => {
    return columns.reduce((acc, column) => {
      acc[column.id] = filteredTasks.filter(t => t.columnId === column.id).sort((a, b) => (a.order || 0) - (b.order || 0));
      return acc;
    }, {} as Record<string, Task[]>);
  }, [columns, filteredTasks]);

  // Extract unique labels and assignees for filter dropdowns
  const uniqueLabels = useMemo(() => {
    const labels = new Set<string>();
    tasks.forEach(task => {
      (task.labels || []).forEach(label => labels.add(label));
    });
    return Array.from(labels).sort();
  }, [tasks]);

  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    tasks.forEach(task => {
      ((task as any).assignees || []).forEach((assignee: string) => assignees.add(assignee));
    });
    return Array.from(assignees);
  }, [tasks]);

  // Get user names for assignee filter
  const [projectUsers, setProjectUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  useEffect(() => {
    if (projectIdFromQuery) {
      (async () => {
        const res = await fetch(`/api/projects/${projectIdFromQuery}/users`);
        if (res.ok) {
          const data = await res.json();
          setProjectUsers(data.users || []);
        }
      })();
    }
  }, [projectIdFromQuery]);

  // Fetch user role for permission checks
  useEffect(() => {
    if (currentUserId && companyIdFromQueryParam) {
      (async () => {
        try {
          const res = await fetch(`/api/memberships?userId=${currentUserId}&companyId=${companyIdFromQueryParam}`);
          if (res.ok) {
            const data = await res.json();
            setUserRole(data.role);
          }
        } catch (e) {
          console.error('Failed to fetch user role:', e);
        }
      })();
    }
  }, [currentUserId, companyIdFromQueryParam]);

  const handleColumnHandlePointerDown = (colId: string) => (e: any) => {
    // If in connect mode, handle connection logic
    if (connectMode) {
      e.preventDefault();
      e.stopPropagation();
      if (!connectSource) {
        setConnectSource(colId);
      } else if (connectSource !== colId) {
        createConnection(connectSource, colId);
        setConnectSource(null);
      } else {
        setConnectSource(null);
      }
      return;
    }
    
    // Allow dragging the column (removed auto-activation of connect mode)
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    const col = columns.find(c => c.id === colId);
    if (!col) return;
    const baseX = (col as any).x ?? ((col as any).order || 0) * 320;
    const baseY = (col as any).y ?? 0;
    const offsetX = e.clientX - rect.left - baseX;
    const offsetY = e.clientY - rect.top - baseY;
    setDraggingColumnId(colId);
    setDragOffset({ x: offsetX, y: offsetY });
    if (e.target && typeof e.target.setPointerCapture === 'function') {
      try { e.target.setPointerCapture(e.pointerId); } catch {}
    }
  };

  // Sticky note drag start
  const handleNotePointerDown = (noteId: string) => (e: any) => {
    e.stopPropagation();
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const offsetX = e.clientX - rect.left - (note.x || 0);
    const offsetY = e.clientY - rect.top - (note.y || 0);
    setDraggingNoteId(noteId);
    setNoteDragOffset({ x: offsetX, y: offsetY });
  };

  // Column resize start
  const handleColumnResizeStart = (colId: string) => (e: any) => {
    e.stopPropagation();
    const col = columns.find(c => c.id === colId) as any;
    if (!col) return;
    setResizingColumnId(colId);
    setResizeStart({
      width: col.width || 320,
      height: col.height || 260,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Note resize start
  const handleNoteResizeStart = (noteId: string) => (e: any) => {
    e.stopPropagation();
    const note = notes.find(n => n.id === noteId) as any;
    if (!note) return;
    setResizingNoteId(noteId);
    setResizeStart({
      width: note.width || 224,
      height: note.height || 150,
      x: e.clientX,
      y: e.clientY,
    });
  };

  // Shape drag start
  const handleShapePointerDown = (shapeId: string) => (e: any) => {
    e.stopPropagation();
    const boardEl = boardRef.current;
    if (!boardEl) return;
    const rect = boardEl.getBoundingClientRect();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;
    const offsetX = e.clientX - rect.left - shape.x;
    const offsetY = e.clientY - rect.top - shape.y;
    setDraggingShapeId(shapeId);
    setShapeDragOffset({ x: offsetX, y: offsetY });
    setSelectedShapeId(shapeId);
  };

  // Shape resize start
  const handleShapeResizeStart = (shapeId: string) => (e: any) => {
    e.stopPropagation();
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;
    setResizeStart({
      width: shape.width,
      height: shape.height,
      x: e.clientX,
      y: e.clientY,
    });
    // Use a different state for resizing vs dragging
    setDraggingShapeId(`resize-${shapeId}`);
  };

  // Update shape properties
  const updateShape = (shapeId: string, updates: Partial<Shape>) => {
    setShapes(prev => prev.map(s => s.id === shapeId ? { ...s, ...updates } : s));
    updateShapeInDb(shapeId, updates);
  };

  useEffect(() => {
    if (!draggingColumnId) return;
    const onMove = (e: PointerEvent) => {
      const boardEl = boardRef.current;
      if (!boardEl) return;
      const rect = boardEl.getBoundingClientRect();
      let x = Math.round(e.clientX - rect.left - dragOffset.x);
      let y = Math.round(e.clientY - rect.top - dragOffset.y);
      x = Math.max(0, x);
      y = Math.max(0, y);
      setColumns(prev => prev.map(c => (c.id === draggingColumnId ? ({ ...c, x, y } as any) : c)));
    };
    const onUp = async () => {
      const col = columns.find(c => c.id === draggingColumnId) as any;
      if (col) {
        const x = typeof col.x === 'number' ? col.x : 0;
        const y = typeof col.y === 'number' ? col.y : 0;
        await updateColumn(draggingColumnId, { x, y });
      }
      setDraggingColumnId(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingColumnId, dragOffset, columns]);

  // Window-level event listeners for note dragging
  useEffect(() => {
    if (!draggingNoteId) return;
    const onMove = (e: PointerEvent) => {
      const boardEl = boardRef.current;
      if (!boardEl) return;
      const rect = boardEl.getBoundingClientRect();
      let x = Math.round(e.clientX - rect.left - noteDragOffset.x);
      let y = Math.round(e.clientY - rect.top - noteDragOffset.y);
      x = Math.max(0, x);
      y = Math.max(0, y);
      setNotes(prev => prev.map(n => (n.id === draggingNoteId ? ({ ...n, x, y } as Note) : n)));
    };
    const onUp = async () => {
      const note = notes.find(n => n.id === draggingNoteId);
      if (note) {
        await updateNote(draggingNoteId, { x: note.x, y: note.y });
      }
      setDraggingNoteId(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingNoteId, noteDragOffset, notes]);

  // Window-level event listeners for column resizing
  useEffect(() => {
    if (!resizingColumnId || !resizeStart) return;
    const onMove = (e: PointerEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(280, resizeStart.width + deltaX);
      const newHeight = Math.max(200, resizeStart.height + deltaY);
      setColumns(prev => prev.map(c => (c.id === resizingColumnId ? ({ ...c, width: newWidth, height: newHeight } as any) : c)));
    };
    const onUp = async () => {
      const col = columns.find(c => c.id === resizingColumnId) as any;
      if (col && (col.width || col.height)) {
        await updateColumn(resizingColumnId, { width: col.width, height: col.height });
      }
      setResizingColumnId(null);
      setResizeStart(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [resizingColumnId, resizeStart, columns]);

  // Window-level event listeners for note resizing
  useEffect(() => {
    if (!resizingNoteId || !resizeStart) return;
    const onMove = (e: PointerEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(150, resizeStart.width + deltaX);
      const newHeight = Math.max(100, resizeStart.height + deltaY);
      setNotes(prev => prev.map(n => (n.id === resizingNoteId ? ({ ...n, width: newWidth, height: newHeight } as Note) : n)));
    };
    const onUp = async () => {
      const note = notes.find(n => n.id === resizingNoteId);
      const noteWithDims = note as Note & { width?: number; height?: number };
      if (noteWithDims && (noteWithDims.width || noteWithDims.height)) {
        await updateNote(resizingNoteId, { width: noteWithDims.width, height: noteWithDims.height });
      }
      setResizingNoteId(null);
      setResizeStart(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [resizingNoteId, resizeStart, notes]);

  // Window-level event listeners for shape dragging
  useEffect(() => {
    if (!draggingShapeId || draggingShapeId.startsWith('resize-')) return;
    const onMove = (e: PointerEvent) => {
      const boardEl = boardRef.current;
      if (!boardEl) return;
      const rect = boardEl.getBoundingClientRect();
      let x = Math.round(e.clientX - rect.left - shapeDragOffset.x);
      let y = Math.round(e.clientY - rect.top - shapeDragOffset.y);
      x = Math.max(0, x);
      y = Math.max(0, y);
      setShapes(prev => prev.map(s => (s.id === draggingShapeId ? { ...s, x, y } : s)));
    };
    const onUp = () => {
      const shape = shapes.find(s => s.id === draggingShapeId);
      if (shape) {
        // Round to integers for database (INTEGER columns)
        updateShapeInDb(draggingShapeId, { x: Math.round(shape.x), y: Math.round(shape.y) });
      }
      setDraggingShapeId(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingShapeId, shapeDragOffset, shapes]);

  // Window-level event listeners for shape resizing
  useEffect(() => {
    if (!draggingShapeId || !draggingShapeId.startsWith('resize-') || !resizeStart) return;
    const shapeId = draggingShapeId.replace('resize-', '');
    let finalWidth = resizeStart.width;
    let finalHeight = resizeStart.height;
    
    const onMove = (e: PointerEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(50, resizeStart.width + deltaX);
      const newHeight = Math.max(50, resizeStart.height + deltaY);
      finalWidth = newWidth;
      finalHeight = newHeight;
      setShapes(prev => prev.map(s => (s.id === shapeId ? { ...s, width: newWidth, height: newHeight } : s)));
    };
    const onUp = () => {
      // Round to integers before saving to database (database columns are INTEGER type)
      updateShapeInDb(shapeId, { width: Math.round(finalWidth), height: Math.round(finalHeight) });
      setDraggingShapeId(null);
      setResizeStart(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingShapeId, resizeStart]);

  // Keyboard event listener for deleting shapes and notes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Delete or Backspace key is pressed
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Prevent default behavior (like browser back navigation)
        // Only if we're not typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return; // Don't interfere with typing in input fields
        }
        
        e.preventDefault();
        
        // Delete selected shape
        if (selectedShapeId) {
          deleteShape(selectedShapeId);
          return;
        }
        
        // Delete selected note
        if (selectedNoteId) {
          deleteNote(selectedNoteId);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedShapeId, selectedNoteId]);

  const getApproxRect = (colId: string) => {
    const rect = columnRects[colId];
    if (rect) return rect;
    const col = columns.find(c => c.id === colId);
    const colWithPos = col as Column & { x?: number; y?: number; order?: number };
    const x = (colWithPos?.x ?? ((colWithPos?.order || 0) * 320));
    const y = (colWithPos?.y ?? 0);
    const width = 320; // default min width
    const height = 260; // reasonable default
    return { x, y, width, height };
  };

  type AnchorSide = 'left' | 'right' | 'top' | 'bottom';

  // Get anchor point for a specific side of a column
  const getAnchorForSide = (colId: string, side: AnchorSide): { side: AnchorSide; x: number; y: number } => {
    const r = getApproxRect(colId);
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    
    switch (side) {
      case 'left':
        return { side: 'left', x: r.x, y: cy };
      case 'right':
        return { side: 'right', x: r.x + r.width, y: cy };
      case 'top':
        return { side: 'top', x: cx, y: r.y };
      case 'bottom':
        return { side: 'bottom', x: cx, y: r.y + r.height };
    }
  };

  const chooseAnchor = (colId: string, toward: { x: number; y: number }) => {
    const r = getApproxRect(colId);
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const sides: { side: AnchorSide; x: number; y: number }[] = [
      { side: 'left', x: r.x, y: cy },
      { side: 'right', x: r.x + r.width, y: cy },
      { side: 'top', x: cx, y: r.y },
      { side: 'bottom', x: cx, y: r.y + r.height },
    ];
    let best = sides[0];
    let bestD = Infinity;
    for (const s of sides) {
      const d = Math.hypot(s.x - toward.x, s.y - toward.y);
      if (d < bestD) { best = s; bestD = d; }
    }
    return best; // {side, x, y}
  };

  const offsetAlongSide = (p: { x: number; y: number }, side: AnchorSide, delta: number) => {
    if (side === 'left') return { x: p.x - delta, y: p.y };
    if (side === 'right') return { x: p.x + delta, y: p.y };
    if (side === 'top') return { x: p.x, y: p.y - delta };
    return { x: p.x, y: p.y + delta };
  };

  const makeBezierPath = (
    a0: { x: number; y: number }, 
    sideA: AnchorSide, 
    b0: { x: number; y: number }, 
    sideB: AnchorSide,
    customCP1?: { x: number; y: number },
    customCP2?: { x: number; y: number }
  ) => {
    // Nudge start slightly outside; keep end exactly at edge so tip touches column
    const start = offsetAlongSide(a0, sideA, 6);
    const end = offsetAlongSide(b0, sideB, 0);
    
    // Calculate default control points
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const k = Math.max(40, Math.max(dx, dy) / 2);
    let c1 = { x: start.x, y: start.y };
    let c2 = { x: end.x, y: end.y };
    if (sideA === 'left') c1.x -= k;
    if (sideA === 'right') c1.x += k;
    if (sideA === 'top') c1.y -= k;
    if (sideA === 'bottom') c1.y += k;

    if (sideB === 'left') c2.x -= k;
    if (sideB === 'right') c2.x += k;
    if (sideB === 'top') c2.y -= k;
    if (sideB === 'bottom') c2.y += k;

    // Use custom control points if provided
    if (customCP1) c1 = customCP1;
    if (customCP2) c2 = customCP2;

    return `M ${start.x},${start.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`;
  };

  // Calculate point on cubic bezier curve at t (0 to 1)
  const getBezierPoint = (p0: {x: number, y: number}, c1: {x: number, y: number}, c2: {x: number, y: number}, p1: {x: number, y: number}, t: number) => {
    const t1 = 1 - t;
    return {
      x: t1*t1*t1*p0.x + 3*t1*t1*t*c1.x + 3*t1*t*t*c2.x + t*t*t*p1.x,
      y: t1*t1*t1*p0.y + 3*t1*t1*t*c1.y + 3*t1*t*t*c2.y + t*t*t*p1.y
    };
  };

  // Get bezier midpoint and control points for positioning
  const getBezierMidpoint = (a0: { x: number; y: number }, sideA: AnchorSide, b0: { x: number; y: number }, sideB: AnchorSide) => {
    const start = offsetAlongSide(a0, sideA, 6);
    const end = offsetAlongSide(b0, sideB, 0);
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const k = Math.max(40, Math.max(dx, dy) / 2);
    const c1 = { x: start.x, y: start.y };
    const c2 = { x: end.x, y: end.y };
    if (sideA === 'left') c1.x -= k;
    if (sideA === 'right') c1.x += k;
    if (sideA === 'top') c1.y -= k;
    if (sideA === 'bottom') c1.y += k;

    if (sideB === 'left') c2.x -= k;
    if (sideB === 'right') c2.x += k;
    if (sideB === 'top') c2.y -= k;
    if (sideB === 'bottom') c2.y += k;

    return getBezierPoint(start, c1, c2, end, 0.5);
  };

  // Helper to cycle through anchor sides
  const cycleAnchorSide = (currentSide: AnchorSide): AnchorSide => {
    const sides: AnchorSide[] = ['top', 'right', 'bottom', 'left'];
    const currentIndex = sides.indexOf(currentSide);
    return sides[(currentIndex + 1) % sides.length];
  };

  // Get control points for a connection (either custom or default)
  const getConnectionControlPoints = (conn: Connection, src: { x: number; y: number; side: AnchorSide }, dst: { x: number; y: number; side: AnchorSide }) => {
    const start = offsetAlongSide({ x: src.x, y: src.y }, src.side, 6);
    const end = offsetAlongSide({ x: dst.x, y: dst.y }, dst.side, 0);
    
    // If custom control points exist, use them
    if (conn.controlPoint1 && conn.controlPoint2) {
      return { c1: conn.controlPoint1, c2: conn.controlPoint2, start, end };
    }
    
    // Otherwise calculate default control points
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const k = Math.max(40, Math.max(dx, dy) / 2);
    const c1 = { x: start.x, y: start.y };
    const c2 = { x: end.x, y: end.y };
    if (src.side === 'left') c1.x -= k;
    if (src.side === 'right') c1.x += k;
    if (src.side === 'top') c1.y -= k;
    if (src.side === 'bottom') c1.y += k;

    if (dst.side === 'left') c2.x -= k;
    if (dst.side === 'right') c2.x += k;
    if (dst.side === 'top') c2.y -= k;
    if (dst.side === 'bottom') c2.y += k;
    
    return { c1, c2, start, end };
  };

  // Render traditional planner board view (fixed row, reorderable columns, no arrows/notes)
  const renderTraditionalView = () => {
    const sortedColumns = [...columns].sort((a, b) => (a.order || 0) - (b.order || 0));
    console.log('Rendering traditional view with columns:', sortedColumns.map(c => ({ name: c.name, order: c.order })));
    
    return (
      <Droppable droppableId="traditional-columns" direction="horizontal" type="column">
        {(provided) => (
          <div 
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex gap-4 overflow-x-auto pb-6"
          >
            {sortedColumns.map((column, index) => (
              <Draggable key={column.id} draggableId={`col-${column.id}`} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`flex-shrink-0 w-80 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                  >
                    <ColumnComponent
                      column={column}
                      tasks={tasksByColumn[column.id] || []}
                      onAddTask={handleAddTask}
                      onEditColumn={handleEditColumn}
                      onDeleteColumn={handleDeleteColumn}
                      onEditTask={handleEditTask}
                      currentUserId={currentUserId}
                      userRole={userRole}
                      allColumns={columns}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {/* Add Column Button */}
            <button
              onClick={() => setIsNewColumnModalOpen(true)}
              className="flex-shrink-0 w-80 border-2 border-dashed border-white/20 rounded-lg text-slate-400 hover:border-orange-500/50 hover:text-orange-400 transition-colors flex flex-col items-center justify-center gap-2 py-8"
              title="Add new column"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs">Add Column</span>
            </button>
          </div>
        )}
      </Droppable>
    );
  };

  // Render grid view with task cards
  const renderGridView = () => {
    const tasksToShow = selectedGridColumn
      ? tasksByColumn[selectedGridColumn] || []
      : Object.values(tasksByColumn).flat();

    return (
      <div className="space-y-4">
        {/* Column Filter for Grid View */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-300">View Column:</label>
          <select
            value={selectedGridColumn || ''}
            onChange={(e) => setSelectedGridColumn(e.target.value || null)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
          >
            <option value="" className="bg-[#1a2332]">All Columns</option>
            {columns.map(column => (
              <option key={column.id} value={column.id} className="bg-[#1a2332]">
                {column.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (selectedGridColumn) {
                handleAddTask(selectedGridColumn);
              } else {
                alert('Please select a column first to add a task.');
              }
            }}
            className="p-2 text-slate-300 hover:bg-white/10 rounded-lg transition-colors hover:text-white"
            title="Add New Task"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsNewColumnModalOpen(true)}
            className="p-2 text-slate-300 hover:bg-white/10 rounded-lg transition-colors hover:text-white"
            title="Create New Column"
          >
            <Layout className="w-5 h-5" />
          </button>
        </div>

        {/* Task Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tasksToShow.length === 0 ? (
            <div className="col-span-full text-center py-12 text-slate-400">
              No tasks found{selectedGridColumn ? ' in this column' : ''}.
            </div>
          ) : (
            tasksToShow.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={() => {}}
                onEdit={handleEditTask}
                currentUserId={currentUserId}
                userRole={userRole}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen gh-hero-gradient">
      <div className="sticky top-24 bg-[#1a2332]/95 backdrop-blur-sm border-b border-white/10 z-10">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                {project ? project.name : 'Project Planner'}
              </h1>
              {selectedBoard && (
                <p className="text-slate-300 mt-1">
                  Board: {boards.find(b => b.id === selectedBoard)?.name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 relative">
              <button 
                onClick={() => {
                  const boardName = prompt('Enter board name:');
                  if (boardName?.trim()) {
                    createBoard(boardName.trim());
                  }
                }}
                className="gh-cta-button px-5 py-2 rounded-lg text-white font-semibold"
              >
                New Board
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={selectedBoard}
                  onChange={(e) => setSelectedBoard(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                >
                  {boards.map(board => (
                    <option key={board.id} value={board.id} className="bg-[#1a2332]">
                      {board.name}
                    </option>
                  ))}
                </select>
                {boards.length > 1 && (
                  <button
                    onClick={() => {
                      const currentBoard = boards.find(b => b.id === selectedBoard);
                      if (confirm(`Are you sure you want to delete "${currentBoard?.name}"? All columns and tasks must be deleted first.`)) {
                        deleteBoard(selectedBoard);
                      }
                    }}
                    className="p-2 text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                    title="Delete board"
                  >
                    <Trash className="w-5 h-5" />
                  </button>
                )}
              </div>
              {/* View Mode Selector */}
              <div className="flex items-center gap-1 border border-white/10 rounded-lg p-1 bg-white/5">
                <button
                  onClick={() => updateBoardViewMode(selectedBoard, 'free-form')}
                  className={`px-3 py-1.5 rounded transition-colors ${viewMode === 'free-form' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                  title="Free-form Board (drag anywhere)"
                >
                  <Maximize className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateBoardViewMode(selectedBoard, 'traditional')}
                  className={`px-3 py-1.5 rounded transition-colors ${viewMode === 'traditional' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                  title="Traditional Planner (fixed row)"
                >
                  <Layout className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateBoardViewMode(selectedBoard, 'grid')}
                  className={`px-3 py-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}
                  title="Grid View"
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-5 py-2 rounded-lg font-semibold ${showFilters ? 'gh-cta-button text-white' : 'gh-cta-button-secondary bg-transparent'}`}
                title="Toggle Filters"
              >
                <Filter className="w-4 h-4 inline mr-2" />
                Filters
              </button>

              <button
                onClick={() => setIsLabelModalOpen(true)}
                className="gh-cta-button-secondary px-5 py-2 rounded-lg font-semibold bg-transparent"
              >
                Manage Labels
              </button>
            </div>
          </div>
          {/* Connection styling toolbar (visible when a connection is selected) - Only for non-freeform modes */}
          {viewMode !== 'free-form' && selectedConnectionId && (() => {
              const conn = connections.find(c => c.id === selectedConnectionId);
              if (!conn) return null;
              return (
                <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                  <span className="text-slate-300 text-sm mr-2">Arrow style:</span>
                  <div className="flex flex-wrap items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-lg">
                    {/* Arrow colors */}
                    <div className="flex items-center gap-1">
                      {['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#6b7280'].map(color => (
                        <button
                          key={color}
                          className={`w-6 h-6 rounded border-2 ${
                            conn.color === color ? 'border-white' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateConnection(conn.id, { color })}
                          title="Arrow color"
                        />
                      ))}
                    </div>
                    <div className="h-6 w-px bg-white/20" />
                    {/* Line style buttons */}
                    <button
                      className={`px-3 py-1 rounded text-sm border ${
                        conn.style === 'solid' || !conn.style
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-transparent border-white/10 text-slate-300'
                      }`}
                      onClick={() => updateConnection(conn.id, { style: 'solid' })}
                      title="Solid line"
                    >
                      ——
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-sm border ${
                        conn.style === 'dashed'
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-transparent border-white/10 text-slate-300'
                      }`}
                      onClick={() => updateConnection(conn.id, { style: 'dashed' })}
                      title="Dashed line"
                    >
                      - - -
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-sm border ${
                        conn.style === 'dotted'
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-transparent border-white/10 text-slate-300'
                      }`}
                      onClick={() => updateConnection(conn.id, { style: 'dotted' })}
                      title="Dotted line"
                    >
                      · · ·
                    </button>
                    <div className="h-6 w-px bg-white/20" />
                    {/* Arrow type buttons */}
                    <button
                      className={`px-3 py-1 rounded text-sm border ${
                        conn.arrowType === 'single' || !conn.arrowType
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-transparent border-white/10 text-slate-300'
                      }`}
                      onClick={() => updateConnection(conn.id, { arrowType: 'single' })}
                      title="Single arrow"
                    >
                      →
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-sm border ${
                        conn.arrowType === 'double'
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-transparent border-white/10 text-slate-300'
                      }`}
                      onClick={() => updateConnection(conn.id, { arrowType: 'double' })}
                      title="Double arrow"
                    >
                      ↔
                    </button>
                    <button
                      className={`px-3 py-1 rounded text-sm border ${
                        conn.arrowType === 'none'
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-transparent border-white/10 text-slate-300'
                      }`}
                      onClick={() => updateConnection(conn.id, { arrowType: 'none' })}
                      title="No arrows"
                    >
                      —
                    </button>
                    <div className="h-6 w-px bg-white/20" />
                    {/* Connection label */}
                    <input
                      type="text"
                      value={conn.label || ''}
                      onChange={(e) => updateConnection(conn.id, { label: e.target.value })}
                      placeholder="Label..."
                      className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm w-24"
                    />
                  </div>
                </div>
              );
            })()}

          {/* Filter Panel */}
          {showFilters && (
            <div className="absolute top-full right-6 mt-2 z-20">
              <div className="p-4 bg-[#1a2332] border border-white/10 rounded-lg shadow-xl">
                <div className="flex items-center gap-3 flex-wrap">
                {/* Search Filter */}
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Search box"
                  className="px-4 py-2 bg-transparent border-2 border-white/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors text-sm min-w-[200px]"
                />

                {/* Creator/Assignee Filter */}
                <select
                  value={filterAssignees[0] || ''}
                  onChange={(e) => setFilterAssignees(e.target.value ? [e.target.value] : [])}
                  className="px-4 py-2 bg-transparent border-2 border-white/30 rounded-lg text-white focus:outline-none focus:border-orange-500 transition-colors text-sm min-w-[180px]"
                >
                  <option value="" className="bg-[#1a2332]">Creator/Assignee</option>
                  {projectUsers.map(user => (
                    <option key={user.id} value={user.id} className="bg-[#1a2332]">{user.name}</option>
                  ))}
                </select>

                {/* Label Filter Dropdown */}
                <select
                  value={filterLabels[0] || ''}
                  onChange={(e) => setFilterLabels(e.target.value ? [e.target.value] : [])}
                  className="px-4 py-2 bg-transparent border-2 border-white/30 rounded-lg text-white focus:outline-none focus:border-orange-500 transition-colors text-sm min-w-[150px]"
                >
                  <option value="" className="bg-[#1a2332]">Select Label</option>
                  {labels.map(label => (
                    <option key={label.id} value={label.id} className="bg-[#1a2332]">{label.name}</option>
                  ))}
                </select>

                {/* PR Number Search */}
                <input
                  type="number"
                  value={filterPRNumber}
                  onChange={(e) => setFilterPRNumber(e.target.value)}
                  placeholder="Search PR #"
                  className="px-4 py-2 bg-transparent border-2 border-white/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors text-sm min-w-[140px]"
                />

                {/* PR Checkbox */}
                <label className="flex items-center gap-2 px-4 py-2 border-2 border-white/30 rounded-lg cursor-pointer hover:border-white/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={filterHasPR === true}
                    onChange={(e) => setFilterHasPR(e.target.checked ? true : null)}
                    className="w-4 h-4 rounded border-white/30 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-white">Has PR</span>
                </label>

                {/* Clear Filters Icon */}
                <button
                  onClick={() => {
                    setFilterSearch('');
                    setFilterPRNumber('');
                    setFilterLabels([]);
                    setFilterAssignees([]);
                    setFilterHasPR(null);
                  }}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Clear all filters"
                >
                  <X className="w-5 h-5" />
                </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-4 pt-16 pb-4">
        {loading || projectLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
            <p className="text-slate-300">Loading tasks...</p>
          </div>
        ) : !isMounted ? (
          <div className="text-center py-12">
            <p className="text-slate-300">Initialising board...</p>
          </div>
        ) : viewMode === 'traditional' ? (
          <DragDropContext onDragEnd={onDragEnd}>
            {renderTraditionalView()}
          </DragDropContext>
        ) : viewMode === 'grid' ? (
          renderGridView()
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="relative overflow-auto pb-6 scrollbar-hide" style={{ minHeight: '60vh' }}>
              <div 
                   ref={boardRef} 
                   className="relative" 
                   style={{ 
                     width: 4800, 
                     height: 2800,
                     transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                     cursor: toolbarMode === 'pan' ? 'grab' : isPanning ? 'grabbing' : undefined,
                   }}
                   onPointerDown={(e) => {
                     // Start panning with Ctrl/Cmd + left click OR if in pan mode
                     if ((e.metaKey || e.ctrlKey || toolbarMode === 'pan') && e.button === 0) {
                       e.preventDefault();
                       setIsPanning(true);
                       setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
                       e.currentTarget.style.cursor = 'grabbing';
                     }
                   }}
                   onPointerMove={(e) => {
                     // Handle panning
                     if (isPanning) {
                       setPanOffset({
                         x: e.clientX - panStart.x,
                         y: e.clientY - panStart.y
                       });
                       return;
                     }
                     
                     if (!((connectMode && connectSource) || draggingConn || draggingControlPoint)) return;
                     const el = boardRef.current; if (!el) return;
                     const rect = el.getBoundingClientRect();
                     // Compute in board coordinates (rect already includes CSS transform)
                    const pos = { 
                      x: e.clientX - rect.left, 
                      y: e.clientY - rect.top 
                    };
                    setPointerPos(pos);
                     
                     // Handle control point dragging
                     if (draggingControlPoint) {
                       const conn = connections.find(c => c.id === draggingControlPoint.id);
                       if (conn) {
                         const update: Partial<Connection> = {};
                         if (draggingControlPoint.point === 1) {
                           update.controlPoint1 = pos;
                         } else {
                           update.controlPoint2 = pos;
                         }
                         // Update locally for smooth dragging
                         setConnections(prev => prev.map(c => 
                           c.id === draggingControlPoint.id ? { ...c, ...update } : c
                         ));
                       }
                     }
                     
                     if (!draggingConn) return;
                    // Reuse rect computed above
                    // Compute in board coordinates (rect already includes CSS transform)
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                     const dropColId = columnIdAtPoint(x, y);
                     const conn = connections.find(c => c.id === draggingConn.id);
                     if (dropColId && conn) {
                       if (draggingConn.end === 'source' && conn.sourceColumnId !== dropColId) {
                         updateConnection(conn.id, { sourceColumnId: dropColId });
                       } else if (draggingConn.end === 'target' && conn.targetColumnId !== dropColId) {
                         updateConnection(conn.id, { targetColumnId: dropColId });
                       }
                     }
                     setDraggingConn(null);
                     setPointerPos(null);
                   }}
                   onPointerUp={(e) => {
                     // Stop panning
                     if (isPanning) {
                       setIsPanning(false);
                       e.currentTarget.style.cursor = toolbarMode === 'pan' ? 'grab' : '';
                       return;
                     }
                     
                     // Handle control point drag end
                     if (draggingControlPoint) {
                       const conn = connections.find(c => c.id === draggingControlPoint.id);
                       if (conn) {
                         const update: Partial<Connection> = {
                           controlPoint1: conn.controlPoint1,
                           controlPoint2: conn.controlPoint2
                         };
                         updateConnection(conn.id, update);
                       }
                       setDraggingControlPoint(null);
                       return;
                     }
                     
                     if (!draggingConn) return;
                     const el = boardRef.current; if (!el) return;
                     const rect = el.getBoundingClientRect();
                     // Compute in board coordinates (rect already includes CSS transform)
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                     const dropColId = columnIdAtPoint(x, y);
                     const conn = connections.find(c => c.id === draggingConn.id);
                     if (dropColId && conn) {
                       if (draggingConn.end === 'source' && conn.sourceColumnId !== dropColId) {
                         updateConnection(conn.id, { sourceColumnId: dropColId });
                       } else if (draggingConn.end === 'target' && conn.targetColumnId !== dropColId) {
                         updateConnection(conn.id, { targetColumnId: dropColId });
                       }
                     }
                     setDraggingConn(null);
                     setPointerPos(null);
                   }}
                   onClick={(e) => { 
                     if (e.target === e.currentTarget) {
                       // If a shape is selected, deselect it instead of creating a new one
                       if (selectedShapeId) {
                         setSelectedShapeId(null);
                         return;
                       }
                       
                       // Handle shape creation (only if no shape is selected)
                       if (toolbarMode === 'shape' && selectedShapeType) {
                         const el = boardRef.current;
                         if (!el) return;
                         const rect = el.getBoundingClientRect();
                         const x = Math.round(e.clientX - rect.left);
                         const y = Math.round(e.clientY - rect.top);
                         
                         // Create shape with default size
                         const defaultWidth = selectedShapeType === 'square' ? 100 : selectedShapeType === 'circle' ? 100 : selectedShapeType === 'text' ? 200 : 150;
                         const defaultHeight = selectedShapeType === 'square' ? 100 : selectedShapeType === 'circle' ? 100 : selectedShapeType === 'rectangle' ? 80 : selectedShapeType === 'text' ? 50 : 120;
                         
                         // For text type, use transparent fill and stroke
                        const isTextType = selectedShapeType === 'text';
                        
                        const newShape: Partial<Shape> = {
                          type: selectedShapeType,
                          x: Math.round(x - defaultWidth / 2),
                          y: Math.round(y - defaultHeight / 2),
                          width: defaultWidth,
                          height: defaultHeight,
                          fillColor: isTextType ? 'transparent' : (shapeNoFill ? 'transparent' : shapeFillColor),
                          strokeColor: isTextType ? 'transparent' : shapeStrokeColor,
                          strokeWidth: isTextType ? 0 : 2,
                          textContent: isTextType ? '' : undefined,
                          fontSize: isTextType ? textFontSizeDefault : 16,
                          textColor: isTextType ? textColorDefault : '#ffffff',
                          fontFamily: isTextType ? textFontFamilyDefault : undefined,
                          opacity: 1.0,
                          rotation: 0,
                        };
                         
                         // Save to database
                        createShape(newShape).then((savedShape) => {
                          if (savedShape) {
                            setShapes(prev => [...prev, savedShape]);
                            // Auto-select and enter edit mode for text
                            if (savedShape.type === 'text') {
                              setSelectedShapeId(savedShape.id);
                              setEditingTextShapeId(savedShape.id);
                              setEditingTextContent(savedShape.textContent || '');
                            }
                          }
                        });
                        return;
                      }
                       
                       // Clear all selections
                       setSelectedNoteId(null); 
                       setSelectedConnectionId(null);
                       setEditingConnectionEnd(null);
                       setSelectedShapeId(null);
                       // Return to normal mode when clicking away
                       if (toolbarMode === 'connect' && selectedConnectionId) {
                         setToolbarMode('normal');
                         setConnectMode(false);
                         setConnectSource(null);
                       }
                     } 
                   }}
              >
                <svg className={`absolute inset-0 w-full h-full pointer-events-none ${selectedConnectionId ? 'z-50' : 'z-20'}`}>
                  <defs>
                    {/* Create unique markers for each color */}
                    {Array.from(new Set(connections.map(c => c.color || '#f59e0b'))).map(color => [
                        <marker 
                          key={`arrowhead-${color}`}
                          id={`arrowhead-${color.replace('#', '')}`} 
                          viewBox="0 0 10 10"
                          refX="9" 
                          refY="5" 
                          markerWidth="6" 
                          markerHeight="6" 
                          orient="auto"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                        </marker>,
                        <marker 
                          key={`arrowhead-double-${color}`}
                          id={`arrowhead-double-${color.replace('#', '')}`} 
                          viewBox="0 0 10 10"
                          refX="9" 
                          refY="5" 
                          markerWidth="6" 
                          markerHeight="6" 
                          orient="auto"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                        </marker>,
                        <marker 
                          key={`arrowhead-double-start-${color}`}
                          id={`arrowhead-double-start-${color.replace('#', '')}`} 
                          viewBox="0 0 10 10"
                          refX="1" 
                          refY="5" 
                          markerWidth="6" 
                          markerHeight="6" 
                          orient="auto"
                        >
                          <path d="M 10 0 L 0 5 L 10 10 z" fill={color} />
                        </marker>
                    ]).flat()}
                  </defs>
                  {connections.map((c) => {
                    // Use stored anchor sides if available, otherwise auto-calculate
                    const targetRect = getApproxRect(c.targetColumnId);
                    const src = c.sourceAnchorSide 
                      ? getAnchorForSide(c.sourceColumnId, c.sourceAnchorSide)
                      : chooseAnchor(c.sourceColumnId, { x: targetRect.x + targetRect.width / 2, y: targetRect.y + targetRect.height / 2 });
                    const dst = c.targetAnchorSide
                      ? getAnchorForSide(c.targetColumnId, c.targetAnchorSide)
                      : chooseAnchor(c.targetColumnId, { x: src.x, y: src.y });
                    
                    // Get control points (custom or default)
                    const { c1, c2, start, end } = getConnectionControlPoints(c, src, dst);
                    
                    // Create path with custom control points
                    const path = makeBezierPath({ x: src.x, y: src.y }, src.side, { x: dst.x, y: dst.y }, dst.side, c1, c2);
                    
                    // Calculate midpoint using actual control points (so X button moves with curve adjustments)
                    const midpoint = getBezierPoint(start, c1, c2, end, 0.5);
                    const midX = midpoint.x;
                    const midY = midpoint.y;
                    const isSelected = selectedConnectionId === c.id;
                    return (
                      <g key={c.id}>
                        {/* Visual path */}
                        <path 
                          d={path} 
                          stroke={c.color || '#f59e0b'} 
                          strokeWidth={2} 
                          fill="none" 
                          strokeDasharray={c.style === 'dashed' ? '8 4' : c.style === 'dotted' ? '2 2' : undefined}
                          markerEnd={c.arrowType === 'none' ? undefined : (c.arrowType === 'double' ? `url(#arrowhead-double-${(c.color || '#f59e0b').replace('#', '')})` : `url(#arrowhead-${(c.color || '#f59e0b').replace('#', '')})`)} 
                          markerStart={c.arrowType === 'double' ? `url(#arrowhead-double-start-${(c.color || '#f59e0b').replace('#', '')})` : undefined}
                        />
                        {/* Click to select - always available */}
                        <path
                          d={path}
                          stroke="transparent"
                          strokeWidth={16}
                          fill="none"
                          style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedConnectionId(c.id);
                            setToolbarMode('connect');
                            // Don't set connectMode to true - we want to edit, not create
                            // Clear any active connection source when selecting an existing connection
                            setConnectSource(null);
                          }}
                        />
                        {c.label && (
                          <text x={midX} y={midY - 6} fill="#fff" fontSize="12" textAnchor="middle">{c.label}</text>
                        )}
                        {/* Endpoint handles for drag-to-edit (only when selected and NOT in connect mode) */}
                        {!connectMode && isSelected && (
                          <>
                            <circle cx={src.x} cy={src.y} r={6} fill="#1f2937" stroke="#94a3b8" strokeWidth={2}
                              style={{ pointerEvents: 'auto', cursor: 'grab' }}
                              onPointerDown={(e) => { e.stopPropagation(); setSelectedConnectionId(c.id); setDraggingConn({ id: c.id, end: 'source' }); }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                const newSide = cycleAnchorSide(src.side);
                                updateConnection(c.id, { sourceAnchorSide: newSide });
                              }} />
                            <circle cx={dst.x} cy={dst.y} r={6} fill="#1f2937" stroke="#94a3b8" strokeWidth={2}
                              style={{ pointerEvents: 'auto', cursor: 'grab' }}
                              onPointerDown={(e) => { e.stopPropagation(); setSelectedConnectionId(c.id); setDraggingConn({ id: c.id, end: 'target' }); }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                const newSide = cycleAnchorSide(dst.side);
                                updateConnection(c.id, { targetAnchorSide: newSide });
                              }} />
                            
                            {/* Control point handles */}
                            <circle cx={c1.x} cy={c1.y} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={2}
                              style={{ pointerEvents: 'auto', cursor: 'grab' }}
                              onPointerDown={(e) => { e.stopPropagation(); setDraggingControlPoint({ id: c.id, point: 1 }); }} />
                            <circle cx={c2.x} cy={c2.y} r={5} fill="#f59e0b" stroke="#fff" strokeWidth={2}
                              style={{ pointerEvents: 'auto', cursor: 'grab' }}
                              onPointerDown={(e) => { e.stopPropagation(); setDraggingControlPoint({ id: c.id, point: 2 }); }} />
                            
                            {/* Visual guide lines to control points */}
                            <line x1={src.x} y1={src.y} x2={c1.x} y2={c1.y} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 2" opacity={0.5} />
                            <line x1={dst.x} y1={dst.y} x2={c2.x} y2={c2.y} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 2" opacity={0.5} />
                          </>
                        )}
                        {/* Delete control at midpoint (only when selected) */}
                        {isSelected && (
                          <g onClick={(e) => { e.stopPropagation(); deleteConnection(c.id); }} style={{ cursor: 'pointer', pointerEvents: 'auto' }}>
                            <circle cx={midX} cy={midY} r={10} fill="#1f2937" stroke="#f87171" strokeWidth={2} />
                            <text x={midX} y={midY + 4} fill="#f87171" fontSize="12" textAnchor="middle">×</text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                  {/* Live preview while dragging an existing connection end */}
                  {draggingConn && pointerPos && (() => {
                    const conn = connections.find(cc => cc.id === draggingConn.id);
                    if (!conn) return null;
                    if (draggingConn.end === 'source') {
                      const dst = chooseAnchor(conn.targetColumnId, pointerPos);
                      const sideA: AnchorSide = Math.abs(pointerPos.x - dst.x) > Math.abs(pointerPos.y - dst.y)
                        ? (pointerPos.x > dst.x ? 'right' : 'left')
                        : (pointerPos.y > dst.y ? 'bottom' : 'top');
                      const live = makeBezierPath({ x: pointerPos.x, y: pointerPos.y }, sideA, { x: dst.x, y: dst.y }, dst.side);
                      return <path d={live} stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={2} fill="none" />;
                    } else {
                      const src2 = chooseAnchor(conn.sourceColumnId, pointerPos);
                      const sideB: AnchorSide = Math.abs(pointerPos.x - src2.x) > Math.abs(pointerPos.y - src2.y)
                        ? (pointerPos.x > src2.x ? 'right' : 'left')
                        : (pointerPos.y > src2.y ? 'bottom' : 'top');
                      const live = makeBezierPath({ x: src2.x, y: src2.y }, src2.side, { x: pointerPos.x, y: pointerPos.y }, sideB);
                      return <path d={live} stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={2} fill="none" />;
                    }
                  })()}
                  {connectMode && connectSource && pointerPos && (() => {
                    const src = chooseAnchor(connectSource, pointerPos);
                    // Infer a reasonable side for the pointer to shape the curve
                    const sideB: AnchorSide = Math.abs(pointerPos.x - src.x) > Math.abs(pointerPos.y - src.y)
                      ? (pointerPos.x > src.x ? 'right' : 'left')
                      : (pointerPos.y > src.y ? 'bottom' : 'top');
                    const path = makeBezierPath({ x: src.x, y: src.y }, src.side, { x: pointerPos.x, y: pointerPos.y }, sideB);
                    return <path d={path} stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={2} fill="none" />;
                  })()}
                  
                  {/* Anchor points on columns - only visible when a connection is selected */}
                  {selectedConnectionId && !connectMode && columns.map((column) => {
                    const colRect = getApproxRect(column.id);
                    const cx = colRect.x + colRect.width / 2;
                    const cy = colRect.y + colRect.height / 2;
                    
                    const anchors = [
                      { side: 'top' as AnchorSide, x: cx, y: colRect.y },
                      { side: 'right' as AnchorSide, x: colRect.x + colRect.width, y: cy },
                      { side: 'bottom' as AnchorSide, x: cx, y: colRect.y + colRect.height },
                      { side: 'left' as AnchorSide, x: colRect.x, y: cy },
                    ];
                    
                    return (
                      <g key={`anchors-${column.id}`}>
                        {anchors.map((anchor) => {
                          const conn = connections.find(c => c.id === selectedConnectionId);
                          const isSourceAnchor = conn && column.id === conn.sourceColumnId && conn.sourceAnchorSide === anchor.side;
                          const isTargetAnchor = conn && column.id === conn.targetColumnId && conn.targetAnchorSide === anchor.side;
                          const isEditingThis = (isSourceAnchor && editingConnectionEnd === 'source') || (isTargetAnchor && editingConnectionEnd === 'target');
                          
                          return (
                            <g key={`${column.id}-${anchor.side}`}>
                              {/* Invisible larger circle for easier clicking */}
                              <circle
                                cx={anchor.x}
                                cy={anchor.y}
                                r={12}
                                fill="transparent"
                                style={{ 
                                  pointerEvents: 'auto', 
                                  cursor: 'pointer'
                                }}
                                onClick={(e) => {
                              e.stopPropagation();
                              
                              // Snap connection endpoint to this anchor
                              const conn = connections.find(c => c.id === selectedConnectionId);
                              if (conn) {
                                // Check if clicking on the current connection's anchor points
                                if (column.id === conn.sourceColumnId && conn.sourceAnchorSide === anchor.side) {
                                  // Clicked on source anchor - set mode to edit source end
                                  setEditingConnectionEnd('source');
                                  return;
                                } else if (column.id === conn.targetColumnId && conn.targetAnchorSide === anchor.side) {
                                  // Clicked on target anchor - set mode to edit target end
                                  setEditingConnectionEnd('target');
                                  return;
                                }
                                
                                // Clicking a different anchor point - update the connection
                                if (editingConnectionEnd === 'source') {
                                  // User previously clicked source anchor, now moving it
                                  updateConnection(selectedConnectionId, { 
                                    sourceColumnId: column.id,
                                    sourceAnchorSide: anchor.side 
                                  });
                                  setEditingConnectionEnd(null);
                                } else if (editingConnectionEnd === 'target') {
                                  // User previously clicked target anchor, now moving it
                                  updateConnection(selectedConnectionId, { 
                                    targetColumnId: column.id,
                                    targetAnchorSide: anchor.side 
                                  });
                                  setEditingConnectionEnd(null);
                                } else {
                                  // No end selected yet - determine which endpoint to update based on which column was clicked
                                  if (column.id === conn.sourceColumnId) {
                                    // Update source side only
                                    updateConnection(selectedConnectionId, { 
                                      sourceAnchorSide: anchor.side 
                                    });
                                  } else if (column.id === conn.targetColumnId) {
                                    // Update target side only
                                    updateConnection(selectedConnectionId, { 
                                      targetAnchorSide: anchor.side 
                                    });
                                  } else {
                                    // Clicking a different column - decide which endpoint to move based on distance
                                    const sourceRect = getApproxRect(conn.sourceColumnId);
                                    const targetRect = getApproxRect(conn.targetColumnId);
                                    const sourceDist = Math.hypot(anchor.x - (sourceRect.x + sourceRect.width/2), anchor.y - (sourceRect.y + sourceRect.height/2));
                                    const targetDist = Math.hypot(anchor.x - (targetRect.x + targetRect.width/2), anchor.y - (targetRect.y + targetRect.height/2));
                                    
                                    // Move the closer endpoint
                                    if (sourceDist < targetDist) {
                                      updateConnection(selectedConnectionId, { 
                                        sourceColumnId: column.id,
                                        sourceAnchorSide: anchor.side 
                                      });
                                    } else {
                                      updateConnection(selectedConnectionId, { 
                                        targetColumnId: column.id,
                                        targetAnchorSide: anchor.side 
                                      });
                                    }
                                  }
                                }
                              }
                            }}
                          />
                          {/* Visible anchor point */}
                          <circle
                            cx={anchor.x}
                            cy={anchor.y}
                            r={isEditingThis ? 6 : 4}
                            fill={isEditingThis ? "#22c55e" : "#f59e0b"}
                            stroke="#fff"
                            strokeWidth={isEditingThis ? 2 : 1.5}
                            opacity={isEditingThis ? 1 : 0.6}
                            style={{ 
                              pointerEvents: 'none',
                              transition: 'all 0.2s'
                            }}
                            className="hover:opacity-100"
                          />
                        </g>
                          );
                        })}
                      </g>
                    );
                  })}
                </svg>
                {columns.map((column) => {
                  const posX = (column as any).x ?? ((column as any).order || 0) * 320;
                  const posY = (column as any).y ?? 0;
                  const colWidth = (column as any).width || 320;
                  const colHeight = (column as any).height || 260;
                  return (
                    <div 
                      key={column.id} 
                      className={`absolute z-30 transition-opacity duration-200 ${selectedConnectionId ? 'opacity-30 pointer-events-none' : ''}`} 
                      style={{ left: posX, top: posY, width: colWidth, height: colHeight }} 
                      ref={setColumnRef(column.id)}>
                      <ColumnComponent
                        column={column}
                        tasks={tasksByColumn[column.id] || []}
                        onAddTask={handleAddTask}
                        onEditColumn={handleEditColumn}
                        onDeleteColumn={handleDeleteColumn}
                        onEditTask={handleEditTask}
                        isDragging={draggingColumnId === column.id}
                        onDragHandlePointerDown={handleColumnHandlePointerDown(column.id)}
                        isFreeFormMode={true}
                        currentUserId={currentUserId}
                        userRole={userRole}
                        allColumns={columns}
                      />
                      {/* Resize handle */}
                      <div
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50"
                        style={{ background: 'linear-gradient(135deg, transparent 50%, rgba(148, 163, 184, 0.5) 50%)' }}
                        onPointerDown={handleColumnResizeStart(column.id)}
                        title="Resize column"
                      />
                    </div>
                  );
                })}
                {(() => {
                  const getColorHex = (c: string) => {
                    const map: Record<string, string> = {
                      orange: '#fb923c',
                      blue: '#60a5fa',
                      green: '#4ade80',
                      pink: '#f472b6',
                      gray: '#9ca3af',
                      yellow: '#fde047',
                    };
                    return map[c] || '#fde047';
                  };
                  return notes.map((note) => {
                    const st = note.style || {};
                    const textStyle: React.CSSProperties = {
                      color: st.textColor || undefined,
                      fontFamily: st.fontFamily || undefined,
                      fontSize: st.fontSize ? `${st.fontSize}px` : undefined,
                      fontWeight: st.bold ? 700 as React.CSSProperties['fontWeight'] : 400 as React.CSSProperties['fontWeight'],
                      fontStyle: st.italic ? 'italic' : 'normal',
                      textDecoration: st.underline ? 'underline' : 'none',
                    };
                    const isSelected = selectedNoteId === note.id;
                    const noteWidth = (note as any).width || 224;
                    const noteHeight = (note as any).height || 150;
                    return (
                      <div 
                        key={note.id} 
                        className={`absolute z-[2] transition-opacity duration-200 ${selectedConnectionId ? 'opacity-30 pointer-events-none' : ''}`} 
                        style={{ left: note.x || 0, top: note.y || 0, width: noteWidth }} 
                        onClick={(e) => { e.stopPropagation(); setSelectedNoteId(note.id); }}>
                        {/* Pin icon at top center */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <Pin className="w-7 h-7 text-red-600 fill-red-600" style={{ transform: 'rotate(45deg)' }} />
                        </div>
                        <div className={`rounded shadow-lg border ${isSelected ? 'border-orange-400 ring-2 ring-orange-400/50' : 'border-black/20'} text-slate-900`} style={{ width: noteWidth, minHeight: noteHeight, backgroundColor: getColorHex(note.color) }}> 
                          <div className="px-2 py-1 cursor-move bg-black/10 rounded-t flex items-center justify-between" onPointerDown={handleNotePointerDown(note.id)}>
                            <div className="flex-1" />
                            {isSelected && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="text-red-600 hover:text-red-800 hover:bg-red-100/50 rounded p-1 transition-colors"
                                title="Delete note"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="p-3" style={{ minHeight: noteHeight - 32 }}>
                            {editingNoteId === note.id ? (
                              <textarea
                                value={editingNoteText}
                                onChange={(e) => setEditingNoteText(e.target.value)}
                                onBlur={() => { const t = editingNoteText.trim(); updateNote(note.id, { content: t }); setEditingNoteId(null); }}
                                onKeyDown={(e) => { if (e.key === 'Escape') { setEditingNoteId(null); }} }
                                className="w-full bg-transparent outline-none text-sm resize-none"
                                style={{ ...textStyle, minHeight: noteHeight - 56, lineHeight: '1.5' }}
                                autoFocus
                              />
                            ) : (
                              <div className="text-sm whitespace-pre-wrap" style={{ ...textStyle, minHeight: noteHeight - 56, lineHeight: '1.5' }} onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.content || ''); }}>
                                {note.content || 'Click to type...'}
                              </div>
                            )}
                          </div>
                          {/* Resize handle */}
                          <div
                            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50"
                            style={{ background: 'linear-gradient(135deg, transparent 50%, rgba(71, 85, 105, 0.5) 50%)' }}
                            onPointerDown={handleNoteResizeStart(note.id)}
                            title="Resize note"
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
                {/* Render shapes */}
                {shapes.map((shape) => {
                  const isSelected = selectedShapeId === shape.id;
                  const fillColor = shape.fillColor === 'transparent' ? 'none' : shape.fillColor;
                  
                  return (
                    <div 
                      key={shape.id} 
                      className={`absolute z-[1] cursor-move transition-opacity duration-200 ${selectedConnectionId ? 'opacity-30 pointer-events-none' : ''}`}
                      style={{ left: shape.x, top: shape.y, width: shape.width, height: shape.height }}
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedShapeId(shape.id); 
                      }}
                      onPointerDown={(e) => {
                        // For text shapes: don't start drag here so double-click works reliably
                        if (shape.type === 'text') return;
                        // If any text is being edited, do not start dragging any shape
                        if (editingTextShapeId) return;
                        handleShapePointerDown(shape.id)(e);
                      }}
                    >
                      <svg width={shape.width} height={shape.height} className={`overflow-visible ${shape.type === 'text' ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                        {shape.type === 'rectangle' && (
                          <rect
                            x="0"
                            y="0"
                            width={shape.width}
                            height={shape.height}
                            fill={fillColor}
                            stroke={shape.strokeColor}
                            strokeWidth={shape.strokeWidth || 2}
                            className={isSelected ? 'stroke-orange-500' : ''}
                          />
                        )}
                        {shape.type === 'square' && (
                          <rect
                            x="0"
                            y="0"
                            width={shape.width}
                            height={shape.width}
                            fill={fillColor}
                            stroke={shape.strokeColor}
                            strokeWidth={shape.strokeWidth || 2}
                            className={isSelected ? 'stroke-orange-500' : ''}
                          />
                        )}
                        {shape.type === 'circle' && (
                          <circle
                            cx={shape.width / 2}
                            cy={shape.width / 2}
                            r={shape.width / 2 - (shape.strokeWidth || 2)}
                            fill={fillColor}
                            stroke={shape.strokeColor}
                            strokeWidth={shape.strokeWidth || 2}
                            className={isSelected ? 'stroke-orange-500' : ''}
                          />
                        )}
                        {shape.type === 'oval' && (
                          <ellipse
                            cx={shape.width / 2}
                            cy={shape.height / 2}
                            rx={shape.width / 2 - (shape.strokeWidth || 2)}
                            ry={shape.height / 2 - (shape.strokeWidth || 2)}
                            fill={fillColor}
                            stroke={shape.strokeColor}
                            strokeWidth={shape.strokeWidth || 2}
                            className={isSelected ? 'stroke-orange-500' : ''}
                          />
                        )}
                        {shape.type === 'triangle' && (
                          <polygon
                            points={`${shape.width / 2},${(shape.strokeWidth || 2)} ${shape.width - (shape.strokeWidth || 2)},${shape.height - (shape.strokeWidth || 2)} ${(shape.strokeWidth || 2)},${shape.height - (shape.strokeWidth || 2)}`}
                            fill={fillColor}
                            stroke={shape.strokeColor}
                            strokeWidth={shape.strokeWidth || 2}
                            className={isSelected ? 'stroke-orange-500' : ''}
                          />
                        )}
                        {shape.type === 'diamond' && (
                          <polygon
                            points={`${shape.width / 2},${(shape.strokeWidth || 2)} ${shape.width - (shape.strokeWidth || 2)},${shape.height / 2} ${shape.width / 2},${shape.height - (shape.strokeWidth || 2)} ${(shape.strokeWidth || 2)},${shape.height / 2}`}
                            fill={fillColor}
                            stroke={shape.strokeColor}
                            strokeWidth={shape.strokeWidth || 2}
                            className={isSelected ? 'stroke-orange-500' : ''}
                          />
                        )}
                        {shape.type === 'text' && editingTextShapeId !== shape.id && (
                          <text
                            x={shape.width / 2}
                            y={shape.height / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={shape.textColor || '#ffffff'}
                            fontSize={shape.fontSize || 20}
                            fontFamily={shape.fontFamily || 'Inter, system-ui, sans-serif'}
                            fontWeight={shape.fontWeight || 'normal'}
                            className={isSelected ? 'outline-none' : ''}
                            style={{ pointerEvents: 'none' }}
                          >
                            {shape.textContent || 'Text'}
                          </text>
                        )}
                      </svg>
                      {/* Text editing input */}
                      {editingTextShapeId === shape.id && shape.type === 'text' && (
                        <textarea
                          autoFocus
                          value={editingTextContent}
                          onChange={(e) => setEditingTextContent(e.target.value)}
                          onBlur={() => {
                            updateShape(shape.id, { textContent: editingTextContent });
                            setEditingTextShapeId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              updateShape(shape.id, { textContent: editingTextContent });
                              setEditingTextShapeId(null);
                            } else if (e.key === 'Escape') {
                              setEditingTextShapeId(null);
                              setEditingTextContent(shape.textContent || '');
                            }
                          }}
                          className="absolute inset-0 w-full h-full bg-transparent text-center resize-none pointer-events-auto"
                          style={{
                            color: shape.textColor || '#ffffff',
                            fontSize: `${shape.fontSize || 20}px`,
                            fontFamily: shape.fontFamily || 'Inter, system-ui, sans-serif',
                            fontWeight: shape.fontWeight || 'normal',
                            border: '2px solid #f59e0b',
                            borderRadius: '4px',
                            padding: '4px',
                            outline: 'none',
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        />
                      )}
                      {isSelected && (
                        <>
                          {/* Top-center controls: Edit (for text) + Delete */}
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 pointer-events-auto">
                            {shape.type === 'text' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTextShapeId(shape.id);
                                  setEditingTextContent(shape.textContent || '');
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="bg-slate-600 text-white rounded-full p-1 hover:bg-slate-500"
                                title="Edit text"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                deleteShape(shape.id);
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              title="Delete"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          {/* Resize handle */}
                          <div
                            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50 pointer-events-auto"
                            style={{ background: 'linear-gradient(135deg, transparent 50%, rgba(249, 115, 22, 0.7) 50%)' }}
                            onPointerDown={handleShapeResizeStart(shape.id)}
                            title="Resize shape"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Floating Toolbar - Only in free-form mode */}
              <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50">
                <div className="bg-[#1a2332] border border-white/10 rounded-lg shadow-2xl p-2 flex flex-col gap-2 max-h-[80vh] overflow-y-auto">
                  {/* Color palette - shown when in note mode and NO note is selected */}
                  {toolbarMode === 'note' && !selectedNoteId && (
                    <>
                      <div className="flex flex-col gap-2 pb-2 border-b border-white/10">
                        {[
                          { color: '#fb923c', name: 'orange' },
                          { color: '#60a5fa', name: 'blue' },
                          { color: '#4ade80', name: 'green' },
                          { color: '#f472b6', name: 'pink' },
                          { color: '#9ca3af', name: 'gray' },
                          { color: '#fde047', name: 'yellow' }
                        ].map(({ color, name }) => (
                          <button
                            key={color}
                            onClick={() => createNote(name)}
                            className="w-10 h-10 rounded border-2 border-white/20 hover:border-white/50 transition-colors"
                            style={{ backgroundColor: color }}
                            title={`Add ${name} note`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Shape palette - shown when in shape mode (non-text) */}
                  {toolbarMode === 'shape' && selectedShapeType !== 'text' && !selectedShapeId && (
                    <div className="flex flex-col gap-2 pb-2 border-b border-white/10 min-w-[200px]">
                      <div className="text-xs text-slate-400 px-1">Shape Type</div>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { type: 'rectangle' as ShapeType, label: 'Rectangle' },
                          { type: 'square' as ShapeType, label: 'Square' },
                          { type: 'circle' as ShapeType, label: 'Circle' },
                          { type: 'oval' as ShapeType, label: 'Oval' },
                          { type: 'triangle' as ShapeType, label: 'Triangle' },
                          { type: 'diamond' as ShapeType, label: 'Diamond' },
                        ].map(({ type, label }) => (
                          <button
                            key={type}
                            onClick={() => setSelectedShapeType(type)}
                            className={`px-2 py-2 rounded text-xs border ${
                              selectedShapeType === type
                                ? 'bg-orange-500 border-orange-500 text-white'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                            title={label}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      
                      <div className="text-xs text-slate-400 px-1 mt-2">Fill Color</div>
                      <div className="grid grid-cols-4 gap-1">
                        {['#60a5fa', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#6b7280', '#ffffff'].map(color => (
                          <button
                            key={color}
                            onClick={() => {
                              setShapeFillColor(color);
                              setShapeNoFill(false);
                            }}
                            className={`w-10 h-10 rounded border-2 ${
                              shapeFillColor === color && !shapeNoFill ? 'border-orange-500' : 'border-white/20'
                            } hover:border-white/50 transition-colors`}
                            style={{ backgroundColor: color }}
                            title="Fill color"
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setShapeNoFill(!shapeNoFill)}
                        className={`px-2 py-1.5 rounded text-xs border ${
                          shapeNoFill
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        No Fill
                      </button>
                      
                      <div className="text-xs text-slate-400 px-1 mt-2">Border Color</div>
                      <div className="grid grid-cols-4 gap-1">
                        {['#1e293b', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#6b7280', '#ffffff'].map(color => (
                          <button
                            key={color}
                            onClick={() => setShapeStrokeColor(color)}
                            className={`w-10 h-10 rounded border-2 ${
                              shapeStrokeColor === color ? 'border-orange-500' : 'border-white/20'
                            } hover:border-white/50 transition-colors`}
                            style={{ backgroundColor: color }}
                            title="Border color"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Text defaults palette - shown when Text tool is active and nothing selected */}
                  {toolbarMode === 'shape' && selectedShapeType === 'text' && !selectedShapeId && (
                    <div className="flex flex-col gap-2 pb-2 border-b border-white/10 min-w-[220px]">
                      <div className="text-xs text-slate-400 px-1">New Text Defaults</div>
                      
                      <div className="text-xs text-slate-400 px-1 mt-1">Text Color</div>
                      <div className="grid grid-cols-4 gap-1">
                        {['#ffffff', '#000000', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899'].map(color => (
                          <button
                            key={color}
                            onClick={() => setTextColorDefault(color)}
                            className={`w-10 h-10 rounded border-2 ${
                              textColorDefault === color ? 'border-orange-500' : 'border-white/20'
                            } hover:border-white/50 transition-colors`}
                            style={{ backgroundColor: color }}
                            title="Default text color"
                          />
                        ))}
                      </div>

                      <div className="text-xs text-slate-400 px-1 mt-2">Font Size</div>
                      <div className="grid grid-cols-4 gap-1">
                        {[12, 14, 16, 18, 20, 24, 32, 40].map(size => (
                          <button
                            key={size}
                            onClick={() => setTextFontSizeDefault(size)}
                            className={`px-2 py-2 rounded text-xs border ${
                              textFontSizeDefault === size
                                ? 'bg-orange-500 border-orange-500 text-white'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>

                      <div className="text-xs text-slate-400 px-1 mt-2">Font Family</div>
                      <div className="flex flex-col gap-1">
                        {[
                          { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
                          { value: 'Georgia, serif', label: 'Georgia' },
                          { value: 'Courier New, monospace', label: 'Courier' },
                          { value: 'Arial, sans-serif', label: 'Arial' },
                        ].map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setTextFontFamilyDefault(value)}
                            className={`px-2 py-1.5 rounded text-xs border ${
                              textFontFamilyDefault === value
                                ? 'bg-orange-500 border-orange-500 text-white'
                                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                            style={{ fontFamily: value }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shape/Text editing - shown when a shape is selected */}
                  {selectedShapeId && (() => {
                    const shape = shapes.find(s => s.id === selectedShapeId);
                    if (!shape) return null;
                    
                    // Show text formatting options for text shapes
                    if (shape.type === 'text') {
                      return (
                        <div className="flex flex-col gap-2 pb-2 border-b border-white/10 min-w-[200px]">
                          <div className="text-xs text-slate-400 px-1">Edit Text</div>
                          
                          <div className="text-xs text-slate-400 px-1 mt-2">Text Color</div>
                          <div className="grid grid-cols-4 gap-1">
                            {['#ffffff', '#000000', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899'].map(color => (
                              <button
                                key={color}
                                onClick={() => updateShape(shape.id, { textColor: color })}
                                className={`w-10 h-10 rounded border-2 ${
                                  shape.textColor === color ? 'border-orange-500' : 'border-white/20'
                                } hover:border-white/50 transition-colors`}
                                style={{ backgroundColor: color }}
                                title="Text color"
                              />
                            ))}
                          </div>
                          
                          <div className="text-xs text-slate-400 px-1 mt-2">Font Size</div>
                          <div className="grid grid-cols-4 gap-1">
                            {[12, 16, 20, 24, 32, 40, 48, 64].map(size => (
                              <button
                                key={size}
                                onClick={() => updateShape(shape.id, { fontSize: size })}
                                className={`px-2 py-2 rounded text-xs border ${
                                  shape.fontSize === size
                                    ? 'bg-orange-500 border-orange-500 text-white'
                                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                          
                          <div className="text-xs text-slate-400 px-1 mt-2">Font Family</div>
                          <div className="flex flex-col gap-1">
                            {[
                              { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
                              { value: 'Georgia, serif', label: 'Georgia' },
                              { value: 'Courier New, monospace', label: 'Courier' },
                              { value: 'Arial, sans-serif', label: 'Arial' },
                            ].map(({ value, label }) => (
                              <button
                                key={value}
                                onClick={() => updateShape(shape.id, { fontFamily: value })}
                                className={`px-2 py-1.5 rounded text-xs border ${
                                  shape.fontFamily === value
                                    ? 'bg-orange-500 border-orange-500 text-white'
                                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    
                    // Show fill/border options for regular shapes
                    return (
                      <div className="flex flex-col gap-2 pb-2 border-b border-white/10 min-w-[200px]">
                        <div className="text-xs text-slate-400 px-1">Edit Shape</div>
                        
                        <div className="text-xs text-slate-400 px-1 mt-2">Fill Color</div>
                        <div className="grid grid-cols-4 gap-1">
                          {['#60a5fa', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#6b7280', '#ffffff'].map(color => (
                            <button
                              key={color}
                              onClick={() => updateShape(shape.id, { fillColor: color })}
                              className={`w-10 h-10 rounded border-2 ${
                                shape.fillColor === color ? 'border-orange-500' : 'border-white/20'
                              } hover:border-white/50 transition-colors`}
                              style={{ backgroundColor: color }}
                              title="Fill color"
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => updateShape(shape.id, { fillColor: 'transparent' })}
                          className={`px-2 py-1.5 rounded text-xs border ${
                            shape.fillColor === 'transparent'
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          No Fill
                        </button>
                        
                        <div className="text-xs text-slate-400 px-1 mt-2">Border Color</div>
                        <div className="grid grid-cols-4 gap-1">
                          {['#1e293b', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#6b7280', '#ffffff'].map(color => (
                            <button
                              key={color}
                              onClick={() => updateShape(shape.id, { strokeColor: color })}
                              className={`w-10 h-10 rounded border-2 ${
                                shape.strokeColor === color ? 'border-orange-500' : 'border-white/20'
                              } hover:border-white/50 transition-colors`}
                              style={{ backgroundColor: color }}
                              title="Border color"
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Connection styling - shown when a connection is selected */}
                  {selectedConnectionId && (() => {
                    const conn = connections.find(c => c.id === selectedConnectionId);
                    if (!conn) return null;
                    return (
                      <div className="flex flex-col gap-2 pb-2 border-b border-white/10 min-w-[200px]">
                        <div className="text-xs text-slate-400 px-1">Connection Style</div>
                        {/* Arrow colors */}
                        <div className="grid grid-cols-4 gap-1">
                          {['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#ec4899', '#6b7280', '#ffffff'].map(color => (
                            <button
                              key={color}
                              className={`w-10 h-10 rounded border-2 ${
                                conn.color === color ? 'border-orange-500' : 'border-white/20'
                              } hover:border-white/50 transition-colors`}
                              style={{ backgroundColor: color }}
                              onClick={() => updateConnection(conn.id, { color })}
                              title="Arrow color"
                            />
                          ))}
                        </div>
                        {/* Line styles */}
                        <div className="flex flex-col gap-1">
                          <button
                            className={`px-2 py-1.5 rounded text-sm border ${
                              conn.style === 'solid' || !conn.style
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-transparent border-white/10 text-slate-300'
                            }`}
                            onClick={() => updateConnection(conn.id, { style: 'solid' })}
                            title="Solid line"
                          >
                            ——
                          </button>
                          <button
                            className={`px-2 py-1.5 rounded text-sm border ${
                              conn.style === 'dashed'
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-transparent border-white/10 text-slate-300'
                            }`}
                            onClick={() => updateConnection(conn.id, { style: 'dashed' })}
                            title="Dashed line"
                          >
                            - - -
                          </button>
                          <button
                            className={`px-2 py-1.5 rounded text-sm border ${
                              conn.style === 'dotted'
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-transparent border-white/10 text-slate-300'
                            }`}
                            onClick={() => updateConnection(conn.id, { style: 'dotted' })}
                            title="Dotted line"
                          >
                            · · ·
                          </button>
                        </div>
                        {/* Arrow types */}
                        <div className="flex flex-col gap-1">
                          <button
                            className={`px-2 py-1.5 rounded text-sm border ${
                              conn.arrowType === 'single' || !conn.arrowType
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-transparent border-white/10 text-slate-300'
                            }`}
                            onClick={() => updateConnection(conn.id, { arrowType: 'single' })}
                            title="Single arrow"
                          >
                            →
                          </button>
                          <button
                            className={`px-2 py-1.5 rounded text-sm border ${
                              conn.arrowType === 'double'
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-transparent border-white/10 text-slate-300'
                            }`}
                            onClick={() => updateConnection(conn.id, { arrowType: 'double' })}
                            title="Double arrow"
                          >
                            ↔
                          </button>
                          <button
                            className={`px-2 py-1.5 rounded text-sm border ${
                              conn.arrowType === 'none'
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-transparent border-white/10 text-slate-300'
                            }`}
                            onClick={() => updateConnection(conn.id, { arrowType: 'none' })}
                            title="No arrows"
                          >
                            —
                          </button>
                        </div>
                        {/* Connection label */}
                        <input
                          type="text"
                          value={conn.label || ''}
                          onChange={(e) => updateConnection(conn.id, { label: e.target.value })}
                          placeholder="Label..."
                          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm w-full"
                        />
                      </div>
                    );
                  })()}

                  {/* Note styling - shown when a note is selected */}
                  {selectedNoteId && (() => {
                    const n = notes.find(nn => nn.id === selectedNoteId);
                    if (!n) return null;
                    const st = n.style || {};
                    const setStyle = (partial: Partial<NonNullable<Note['style']>>) => {
                      updateNote(n.id, { style: { ...(n.style || {}), ...partial } });
                    };
                    const noteColors = [
                      { name: 'orange', hex: '#fb923c' },
                      { name: 'blue', hex: '#60a5fa' },
                      { name: 'green', hex: '#4ade80' },
                      { name: 'pink', hex: '#f472b6' },
                      { name: 'gray', hex: '#9ca3af' },
                      { name: 'yellow', hex: '#fde047' }
                    ];
                    return (
                      <div className="flex flex-col gap-2 pb-2 border-b border-white/10 min-w-[200px]">
                        <div className="text-xs text-slate-400 px-1">Note Style</div>
                        
                        {/* Font Family */}
                        <select
                          value={st.fontFamily || ''}
                          onChange={(e) => setStyle({ fontFamily: e.target.value || undefined })}
                          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs"
                          title="Font family"
                        >
                          <option className="bg-[#1a2332]" value="">Default</option>
                          <option className="bg-[#1a2332]" value="Inter, system-ui, sans-serif">Inter</option>
                          <option className="bg-[#1a2332]" value="Georgia, serif">Georgia</option>
                          <option className="bg-[#1a2332]" value="'Times New Roman', serif">Times</option>
                          <option className="bg-[#1a2332]" value="'Courier New', monospace">Courier</option>
                          <option className="bg-[#1a2332]" value="Monaco, monospace">Monaco</option>
                        </select>

                        {/* Font Size */}
                        <select
                          value={st.fontSize || 14}
                          onChange={(e) => setStyle({ fontSize: Number(e.target.value) })}
                          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-xs"
                          title="Font size"
                        >
                          {[12,14,16,18,20,24,28].map(sz => (
                            <option key={sz} className="bg-[#1a2332]" value={sz}>{sz}px</option>
                          ))}
                        </select>

                        {/* Text formatting buttons */}
                        <div className="flex flex-col gap-1">
                          <button
                            className={`px-2 py-1.5 rounded text-sm border font-bold ${st.bold ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-slate-300'}`}
                            onClick={() => setStyle({ bold: !st.bold })}
                            title="Bold"
                          >
                            B
                          </button>
                          <button
                            className={`px-2 py-1.5 rounded text-sm border italic ${st.italic ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-slate-300'}`}
                            onClick={() => setStyle({ italic: !st.italic })}
                            title="Italic"
                          >
                            I
                          </button>
                          <button
                            className={`px-2 py-1.5 rounded text-sm border underline ${st.underline ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/10 text-slate-300'}`}
                            onClick={() => setStyle({ underline: !st.underline })}
                            title="Underline"
                          >
                            U
                          </button>
                        </div>

                        {/* Text Color */}
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-300 text-xs">Text Color</span>
                          <input
                            type="color"
                            value={st.textColor || '#111827'}
                            onChange={(e) => setStyle({ textColor: e.target.value })}
                            className="w-full h-10 p-0 border border-white/10 rounded cursor-pointer"
                            title="Text color"
                          />
                        </div>

                        {/* Note Background Colors */}
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-300 text-xs">Note Color</span>
                          <div className="grid grid-cols-3 gap-1">
                            {noteColors.map(({ name, hex }) => (
                              <button key={name}
                                onClick={() => updateNote(n.id, { color: name })}
                                className={`w-full h-10 rounded border-2 ${n.color === name ? 'border-orange-500' : 'border-white/20'}`}
                                style={{ backgroundColor: hex }}
                                title={`Set ${name} note`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Mode buttons */}
                  <div className="flex flex-col gap-2">
                    {/* Normal Mode */}
                    <button
                      onClick={() => {
                        setToolbarMode('normal');
                        setConnectMode(false);
                        setConnectSource(null);
                        setSelectedConnectionId(null);
                        setEditingConnectionEnd(null);
                        setSelectedNoteId(null);
                      }}
                      className={`p-2.5 rounded transition-colors ${
                        toolbarMode === 'normal' 
                          ? 'bg-white/20 text-white border-2 border-orange-500' 
                          : 'text-slate-300 hover:bg-white/10 border-2 border-transparent'
                      }`}
                      title="Normal Mode"
                    >
                      <MousePointer2 className="w-6 h-6" />
                    </button>

                    {/* Pan/Move Board Mode */}
                    <button
                      onClick={() => {
                        const newMode = toolbarMode === 'pan' ? 'normal' : 'pan';
                        setToolbarMode(newMode);
                        setConnectMode(false);
                        setConnectSource(null);
                        setSelectedConnectionId(null);
                        setEditingConnectionEnd(null);
                        setSelectedNoteId(null);
                      }}
                      className={`p-2.5 rounded transition-colors ${
                        toolbarMode === 'pan' 
                          ? 'bg-white/20 text-white border-2 border-orange-500' 
                          : 'text-slate-300 hover:bg-white/10 border-2 border-transparent'
                      }`}
                      title="Pan Board (or hold Ctrl/Cmd + Click)"
                    >
                      <Hand className="w-6 h-6" />
                    </button>

                    {/* Add New Task Button */}
                    <button
                      onClick={() => {
                        // Prompt user to select a column or use first column
                        if (columns.length > 0) {
                          // Use first column by default or could show a selector
                          handleAddTask(columns[0].id);
                        } else {
                          alert('Please create a column first.');
                        }
                      }}
                      className="p-2.5 rounded transition-colors text-slate-300 hover:bg-white/10 border-2 border-transparent"
                      title="Add New Task"
                    >
                      <Plus className="w-6 h-6" />
                    </button>

                    {/* Add Column Button */}
                    <button
                      onClick={() => setIsNewColumnModalOpen(true)}
                      className="p-2.5 rounded transition-colors text-slate-300 hover:bg-white/10 border-2 border-transparent"
                      title="Add Column"
                    >
                      <Layout className="w-6 h-6" />
                    </button>

                    {/* Connect Columns Mode */}
                    <button
                      onClick={() => {
                        const newMode = toolbarMode === 'connect' ? 'normal' : 'connect';
                        setToolbarMode(newMode);
                        setConnectMode(newMode === 'connect');
                        if (newMode !== 'connect') {
                          setConnectSource(null);
                        }
                        setSelectedNoteId(null);
                      }}
                      className={`p-2.5 rounded transition-colors ${
                        toolbarMode === 'connect' 
                          ? 'bg-white/20 text-white border-2 border-orange-500' 
                          : 'text-slate-300 hover:bg-white/10 border-2 border-transparent'
                      }`}
                      title="Connect Columns"
                    >
                      <Link2 className="w-6 h-6" />
                    </button>

                    {/* New Notes Mode */}
                    <button
                      onClick={() => {
                        const newMode = toolbarMode === 'note' ? 'normal' : 'note';
                        setToolbarMode(newMode);
                        setConnectMode(false);
                        setConnectSource(null);
                        setSelectedConnectionId(null);
                      }}
                      className={`p-2.5 rounded transition-colors ${
                        toolbarMode === 'note' 
                          ? 'bg-white/20 text-white border-2 border-orange-500' 
                          : 'text-slate-300 hover:bg-white/10 border-2 border-transparent'
                      }`}
                      title="New Notes"
                    >
                      <StickyNote className="w-6 h-6" />
                    </button>

                    {/* Shapes Mode */}
                    <button
                      onClick={() => {
                        const newMode = toolbarMode === 'shape' && selectedShapeType !== 'text' ? 'normal' : 'shape';
                        setToolbarMode(newMode);
                        setConnectMode(false);
                        setConnectSource(null);
                        setSelectedConnectionId(null);
                        setSelectedNoteId(null);
                        setSelectedShapeId(null);
                        // Default to rectangle shape
                        if (newMode === 'shape') {
                          setSelectedShapeType('rectangle');
                        } else {
                          setSelectedShapeType(null);
                        }
                      }}
                      className={`p-2.5 rounded transition-colors ${
                        toolbarMode === 'shape' && selectedShapeType !== 'text'
                          ? 'bg-white/20 text-white border-2 border-orange-500' 
                          : 'text-slate-300 hover:bg-white/10 border-2 border-transparent'
                      }`}
                      title="Add Shapes"
                    >
                      <Shapes className="w-6 h-6" />
                    </button>

                    {/* Text Mode */}
                    <button
                      onClick={() => {
                        const newMode = toolbarMode === 'shape' && selectedShapeType === 'text' ? 'normal' : 'shape';
                        setToolbarMode(newMode);
                        setConnectMode(false);
                        setConnectSource(null);
                        setSelectedConnectionId(null);
                        setSelectedNoteId(null);
                        setSelectedShapeId(null);
                        if (newMode === 'shape') {
                          setSelectedShapeType('text');
                        } else {
                          setSelectedShapeType(null);
                        }
                      }}
                      className={`p-2.5 rounded transition-colors ${
                        toolbarMode === 'shape' && selectedShapeType === 'text'
                          ? 'bg-white/20 text-white border-2 border-orange-500' 
                          : 'text-slate-300 hover:bg-white/10 border-2 border-transparent'
                      }`}
                      title="Add Text"
                    >
                      <Type className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </DragDropContext>
        )}
      </div>

      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        columnId={newTaskColumnId}
        columnName={newTaskColumnName}
        onSubmit={createTask}
        projectId={projectIdFromQuery}
        boardLabels={labels}
      />

      <ColumnModal
        isOpen={isNewColumnModalOpen}
        onClose={() => setIsNewColumnModalOpen(false)}
        onSubmit={createColumn}
        title="Create New Column"
        columns={columns}
      />

      <ColumnModal
        isOpen={isEditColumnModalOpen}
        onClose={() => {
          setIsEditColumnModalOpen(false);
          setEditingColumn(null);
        }}
        onSubmit={(data) => {
          if (editingColumn) {
            updateColumn(editingColumn.id, data);
          }
        }}
        title="Edit Column"
        columns={columns}
        currentColumnId={editingColumn?.id}
        initialData={editingColumn ? {
          name: editingColumn.name,
          color: editingColumn.color,
          requiresPr: (editingColumn as any).requiresPr || false,
          moveToColumnOnMerge: (editingColumn as any).moveToColumnOnMerge || undefined,
          moveToColumnOnClosed: (editingColumn as any).moveToColumnOnClosed || undefined,
          moveToColumnOnRequestChanges: (editingColumn as any).moveToColumnOnRequestChanges || undefined,
        } : undefined}
      />

      <EditTaskModal
        isOpen={isEditTaskModalOpen}
        onClose={() => {
          setIsEditTaskModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        columns={columns}
        onSubmit={(updates) => {
          if (editingTask) {
            const finalUpdates: Partial<Task> = { ...updates };
            // If status changed but column unchanged, auto-map to corresponding column
            if (
              finalUpdates.status &&
              finalUpdates.status !== editingTask.status &&
              finalUpdates.columnId === editingTask.columnId
            ) {
              const mapped = mapStatusToColumnId(finalUpdates.status as Task['status'], columns);
              if (mapped) {
                finalUpdates.columnId = mapped;
              }
            }
            updateTask(editingTask.id, finalUpdates);
          }
        }}
        onDelete={(taskId) => deleteTask(taskId)}
        projectId={projectIdFromQuery}
        boardLabels={labels}
      />

      <PrLinkModal
        isOpen={isPrModalOpen}
        taskTitle={prModalTask?.title || ''}
        columnName={columns.find(c => c.id === pendingMove?.destination?.droppableId)?.name || ''}
        onClose={async () => {
          setIsPrModalOpen(false);
          // Revert the move if user cancels/close without providing URL
          await revertPendingMove();
        }}
        onSubmit={async (url) => {
          if (!prModalTask || !pendingMove) return;
          
          console.log('Submitting PR URL:', url);
          const response = await fetch('/api/planner/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: prModalTask.id, prUrl: url }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Failed to update PR URL:', response.status, errorData);
            alert(`Failed to add PR URL: ${errorData.error || 'Unknown error'}\n\nTask will remain in its original column.`);
            // Failed: revert the move
            await revertPendingMove();
            setIsPrModalOpen(false);
            return;
          }
          
          console.log('PR URL accepted, completing move');
          setTasks(prev => prev.map(t => (t.id === prModalTask.id ? { ...t, prUrl: url } : t)));
          setIsPrModalOpen(false);
          const saved = pendingMove;
          setPrModalTask(null);
          setPendingMove(null);
          await applyDragMove(saved, true);
          
          // Immediately check if this PR is already merged/closed/has changes requested
          // This will auto-move the task if the PR status warrants it
          console.log('Checking PR status immediately after adding URL');
          await checkMergedPRs();
        }}
      />

      <LabelManagementModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        labels={labels}
        onCreateLabel={createLabel}
        onDeleteLabel={deleteLabel}
      />
    </div>
  );
}

function ColumnModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  initialData,
  columns,
  currentColumnId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; color: string; requiresPr: boolean; moveToColumnOnMerge?: string; moveToColumnOnClosed?: string; moveToColumnOnRequestChanges?: string }) => void;
  title: string;
  initialData?: { name: string; color: string; requiresPr?: boolean; moveToColumnOnMerge?: string; moveToColumnOnClosed?: string; moveToColumnOnRequestChanges?: string };
  columns: Column[];
  currentColumnId?: string;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [color, setColor] = useState(initialData?.color || 'slate');
  const [requiresPr, setRequiresPr] = useState<boolean>(initialData?.requiresPr || false);
  const [moveToColumnOnMerge, setMoveToColumnOnMerge] = useState<string>(initialData?.moveToColumnOnMerge || '');
  const [moveToColumnOnClosed, setMoveToColumnOnClosed] = useState<string>(initialData?.moveToColumnOnClosed || '');
  const [moveToColumnOnRequestChanges, setMoveToColumnOnRequestChanges] = useState<string>(initialData?.moveToColumnOnRequestChanges || '');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setColor(initialData.color);
      setRequiresPr(!!initialData.requiresPr);
      setMoveToColumnOnMerge(initialData.moveToColumnOnMerge || '');
      setMoveToColumnOnClosed(initialData.moveToColumnOnClosed || '');
      setMoveToColumnOnRequestChanges(initialData.moveToColumnOnRequestChanges || '');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      color,
      requiresPr,
      moveToColumnOnMerge: moveToColumnOnMerge || undefined,
      moveToColumnOnClosed: moveToColumnOnClosed || undefined,
      moveToColumnOnRequestChanges: moveToColumnOnRequestChanges || undefined,
    });

    setName('');
    setColor('slate');
    setRequiresPr(false);
    setMoveToColumnOnMerge('');
    setMoveToColumnOnClosed('');
    setMoveToColumnOnRequestChanges('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a2332] border border-white/10 rounded-lg w-full shadow-2xl" style={{ maxWidth: '538px' }}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-xl font-semibold text-white">{title}</h3>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="Enter column name..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Column Color
            </label>
            <div className="grid grid-cols-5 gap-3">
              {COLUMN_COLORS.map((colorOption) => {
                const colorMap: Record<string, string> = {
                  slate: '#64748b',
                  blue: '#3b82f6',
                  green: '#10b981',
                  amber: '#f59e0b',
                  red: '#ef4444',
                  purple: '#a855f7',
                  indigo: '#6366f1',
                  pink: '#ec4899',
                  zinc: '#71717a',
                };
                
                return (
                  <button
                    key={colorOption.value}
                    type="button"
                    onClick={() => setColor(colorOption.value)}
                    className={`flex flex-col items-center gap-2 p-2 rounded-lg transition-all ${
                      color === colorOption.value
                        ? 'bg-white/10 border-2 border-orange-500 ring-2 ring-orange-500/30'
                        : 'border-2 border-transparent hover:bg-white/5'
                    }`}
                    title={colorOption.name}
                  >
                    <div 
                      className="w-8 h-8 rounded-full shadow-lg"
                      style={{ backgroundColor: colorMap[colorOption.value] || '#64748b' }}
                    />
                    <span className="text-xs text-slate-300 font-medium">{colorOption.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Selected: <span className="text-white font-medium">{COLUMN_COLORS.find(c => c.value === color)?.name || 'Slate'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="requiresPr"
              type="checkbox"
              checked={requiresPr}
              onChange={(e) => setRequiresPr(e.target.checked)}
              className="h-4 w-4 text-orange-600 border-white/30 rounded"
            />
            <label htmlFor="requiresPr" className="text-sm text-slate-300">
              This is a Pull Request column (require PR link on move)
            </label>
          </div>

          {requiresPr && (
            <div className="space-y-4 border-t border-white/10 pt-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Auto-move when PR merged
                </label>
                <select
                  value={moveToColumnOnMerge}
                  onChange={(e) => setMoveToColumnOnMerge(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                >
                  <option value="" className="bg-[#1a2332]">-- No auto-move --</option>
                  {columns
                    .filter(col => col.id !== currentColumnId)
                    .map(col => (
                      <option key={col.id} value={col.id} className="bg-[#1a2332]">
                        {col.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Tasks will automatically move when PR is merged
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Auto-move when PR closed (not merged)
                </label>
                <select
                  value={moveToColumnOnClosed}
                  onChange={(e) => setMoveToColumnOnClosed(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                >
                  <option value="" className="bg-[#1a2332]">-- No auto-move --</option>
                  {columns
                    .filter(col => col.id !== currentColumnId)
                    .map(col => (
                      <option key={col.id} value={col.id} className="bg-[#1a2332]">
                        {col.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Tasks will automatically move when PR is closed without merging
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Auto-move when changes requested
                </label>
                <select
                  value={moveToColumnOnRequestChanges}
                  onChange={(e) => setMoveToColumnOnRequestChanges(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                >
                  <option value="" className="bg-[#1a2332]">-- No auto-move --</option>
                  {columns
                    .filter(col => col.id !== currentColumnId)
                    .map(col => (
                      <option key={col.id} value={col.id} className="bg-[#1a2332]">
                        {col.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Tasks will automatically move when PR has requested changes
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-300 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 gh-cta-button px-4 py-2 rounded-lg text-white font-semibold"
            >
              {title.includes('Edit') ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditTaskModal({
  isOpen,
  onClose,
  task,
  columns,
  onSubmit,
  onDelete,
  projectId,
  boardLabels,
}: {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  columns: Column[];
  onSubmit: (updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  projectId: string;
  boardLabels: Label[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [prUrl, setPrUrl] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [status, setStatus] = useState('pending');
  const [columnId, setColumnId] = useState('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [projectUsers, setProjectUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const labelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && projectId) {
      (async () => {
        const res = await fetch(`/api/projects/${projectId}/users`);
        if (res.ok) {
          const data = await res.json();
          setProjectUsers(data.users || []);
        }
      })();
    }
  }, [isOpen, projectId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(event.target as Node)) {
        setShowLabelDropdown(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setSelectedLabels(task.labels || []);
      setPrUrl(task.prUrl || '');
      setAssignees((task as any).assignees || (task.assignee ? [task.assignee] : []));
      setStatus(task.status);
      setColumnId(task.columnId);
      setIsLocked(!!(task as any).isLocked);
      setStartDate((task as any).startDate || '');
      setEndDate((task as any).endDate || '');
    }
  }, [task]);

  const toggleAssignee = (userId: string) => {
    setAssignees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleLabel = (labelId: string) => {
    setSelectedLabels(prev =>
      prev.includes(labelId) ? prev.filter(id => id !== labelId) : [...prev, labelId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const updates: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || undefined,
      labels: selectedLabels,
      prUrl: prUrl.trim() || undefined,
      assignees: assignees.length > 0 ? assignees : undefined,
      status: status as Task['status'],
      columnId,
      isLocked,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    } as any;

    onSubmit(updates);
    onClose();
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a2332] border border-white/10 rounded-lg w-1/2 max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-xl font-semibold text-white">
            Edit Task
          </h3>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="Enter task title..."
              required
            />
          </div>

          {/* Assignment / Lock row */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1" ref={assigneeDropdownRef}>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Assignees
              </label>
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-left focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              >
                {assignees.length === 0 ? (
                  <span className="text-slate-400">Select assignees...</span>
                ) : (
                  <span className="text-white">
                    {assignees.length} user{assignees.length > 1 ? 's' : ''} selected
                  </span>
                )}
              </button>
              {showAssigneeDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a2332] border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {projectUsers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-400">No users in this project</div>
                  ) : (
                    projectUsers.map(user => (
                      <label key={user.id} className="flex items-center px-3 py-2 hover:bg-white/5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={assignees.includes(user.id)}
                          onChange={() => toggleAssignee(user.id)}
                          className="mr-2"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">{user.name}</div>
                          <div className="text-xs text-slate-400">{user.email}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="flex items-end pb-3">
              <label 
                className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors"
                title="Locking task prevents other users who are not the creator or assignees from making edits to task"
              >
                <input type="checkbox" checked={isLocked} onChange={(e) => setIsLocked(e.target.checked)} className="sr-only" />
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg border-2 transition-colors ${
                  isLocked 
                    ? 'bg-orange-500 border-orange-500 text-white' 
                    : 'border-white/30 text-slate-400 hover:border-white/50'
                }`}>
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-sm">Lock task</span>
              </label>
            </div>
          </div>

          {/* Column / Label / Attachments row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Column
              </label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                required
              >
                {columns.map((column) => (
                  <option key={column.id} value={column.id} className="bg-[#1a2332]">
                    {column.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative" ref={labelDropdownRef}>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Labels
              </label>
              <button
                type="button"
                onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-left focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              >
                {selectedLabels.length === 0 ? (
                  <span className="text-slate-400">Select labels...</span>
                ) : (
                  <div className="flex gap-1 flex-wrap">
                    {selectedLabels.map(labelId => {
                      const label = boardLabels.find(l => l.id === labelId);
                      if (!label) return null;
                      const isWhite = label.color === '#ffffff' || label.color.toLowerCase() === '#fff';
                      const textColor = isWhite ? 'text-black' : 'text-white';
                      return (
                        <span
                          key={label.id}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${textColor}`}
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
              {showLabelDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a2332] border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {boardLabels.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-400">No labels available</div>
                  ) : (
                    boardLabels.map(label => {
                      const isWhite = label.color === '#ffffff' || label.color.toLowerCase() === '#fff';
                      const textColor = isWhite ? 'text-black' : 'text-white';
                      return (
                        <label key={label.id} className="flex items-center px-3 py-2 hover:bg-white/5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedLabels.includes(label.id)}
                            onChange={() => toggleLabel(label.id)}
                            className="mr-2"
                          />
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${textColor}`}
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Attachments
              </label>
              <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-slate-400 text-sm">
                Upload files
              </div>
            </div>
          </div>

          {/* Start date / End date row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Start date (optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                End date (optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="Enter task description..."
            />
          </div>

          {/* PR Link */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              PR Link
            </label>
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="https://github.com/owner/repo/pull/123"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="gh-cta-button px-6 py-2 rounded-lg text-white font-semibold"
            >
              Update Task
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-300 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (task && confirm('Delete this task permanently?')) {
                  onDelete(task.id);
                }
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-semibold"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen gh-hero-gradient flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    }>
      <PlannerBoard />
    </Suspense>
  );
}

function PrLinkModal({
  isOpen,
  onClose,
  onSubmit,
  taskTitle,
  columnName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  taskTitle: string;
  columnName: string;
}) {
  const [url, setUrl] = useState('');
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim());
    setUrl('');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a2332] border border-white/10 rounded-lg max-w-md w-full shadow-2xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-xl font-semibold text-white">Add Pull Request Link</h3>
          <p className="text-sm text-slate-300">Moving "{taskTitle}" into "{columnName}" requires a PR URL.</p>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">PR URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setUrl('');
                onClose();
              }}
              className="flex-1 px-4 py-2 text-slate-300 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 gh-cta-button px-4 py-2 rounded-lg text-white font-semibold"
            >
              Add Link & Move
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
