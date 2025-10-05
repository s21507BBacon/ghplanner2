'use client';

import { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, ExternalLink, Calendar, User, X, Edit3 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Task, Board, type Column, STATUS_COLORS, getColumnColorClasses, COLUMN_COLORS } from '@/lib/types';

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function TaskCard({
  task,
  onUpdate,
  onEdit,
  isDragging = false
}: {
  task: Task;
  onUpdate: (task: Task) => void;
  onEdit: (task: Task) => void;
  isDragging?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const completedItems = task.checklist?.filter(item => item.completed).length || 0;
  const totalItems = task.checklist?.length || 0;
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const handleCardClick = () => {
    window.location.href = `/task/${task.id}`;
  };

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={handleCardClick}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-slate-900 flex-1 text-sm leading-tight">
            {task.title}
          </h4>
          <button
            className="text-slate-400 hover:text-slate-600 ml-2"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            title="Edit task"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {task.description && (
          <p className="text-xs text-slate-600 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={task.status} />
          {task.labels?.map((label, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
            >
              {label}
            </span>
          ))}
        </div>

        {totalItems > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Progress</span>
              <span>{completedItems}/{totalItems}</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div
                className="bg-green-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            {task.assignee && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="font-mono">{task.assignee}</span>
              </div>
            )}
            {task.prUrl && (
              <a
                href={task.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                <span>PR</span>
              </a>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Column({
  column,
  tasks,
  onAddTask,
  onEditColumn,
  onDeleteColumn,
  onEditTask,
}: {
  column: Column;
  tasks: Task[];
  onAddTask: (columnId: string) => void;
  onEditColumn: (column: Column) => void;
  onDeleteColumn: (columnId: string) => void;
  onEditTask: (task: Task) => void;
}) {
  const colors = getColumnColorClasses(column.color);

  return (
    <div className={`flex flex-col h-full min-w-80 ${colors.bg} ${colors.border} border rounded-lg`}>
      <div className={`${colors.header} ${colors.text} p-4 rounded-t-lg border-b ${colors.border} sticky top-0 z-10`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{column.name}</h3>
            <span className={`inline-flex items-center justify-center w-5 h-5 text-xs font-medium ${colors.text} bg-white rounded-full`}>
              {tasks.length}
            </span>
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

      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-96">
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-3 min-h-32 ${
                snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''
              }`}
            >
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </div>
                  <p className="text-sm">No tasks yet</p>
                  <p className="text-xs">Click + to add a task</p>
                </div>
              ) : (
                tasks.map((task, index) => (
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
                        />
                      </div>
                    )}
                  </Draggable>
                ))
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
}: {
  isOpen: boolean;
  onClose: () => void;
  columnId: string;
  columnName: string;
  onSubmit: (task: Partial<Task>) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [labels, setLabels] = useState('');
  const [prUrl, setPrUrl] = useState('');
  const [assignee, setAssignee] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      columnId,
      labels: labels
        .split(',')
        .map(l => l.trim())
        .filter(Boolean),
      prUrl: prUrl.trim() || undefined,
      assignee: assignee.trim() || undefined,
    });

    setTitle('');
    setDescription('');
    setLabels('');
    setPrUrl('');
    setAssignee('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Add Task to {columnName}
          </h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task title..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Labels (comma-separated)
            </label>
            <input
              type="text"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="bug, feature, urgent..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              PR URL
            </label>
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://github.com/owner/repo/pull/123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assignee
            </label>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="username"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlannerBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskColumnId, setNewTaskColumnId] = useState('');
  const [newTaskColumnName, setNewTaskColumnName] = useState('');

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

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (selectedBoard) {
      fetchTasks();
      fetchColumns();
    }
  }, [selectedBoard]);

  const fetchBoards = async () => {
    try {
      const response = await fetch('/api/planner/boards');
      const data = await response.json();
      setBoards(data.boards || []);

      if (data.boards?.length > 0) {
        setSelectedBoard(data.boards[0].id);
      } else {
        // Create a default board
        await createBoard('My Project');
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
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      setBoards([data]);
      setSelectedBoard(data.id);
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  };

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
      const response = await fetch(`/api/planner/tasks?boardId=${selectedBoard}`);
      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: Partial<Task>) => {
    try {
      const response = await fetch('/api/planner/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, boardId: selectedBoard }),
      });
      const data = await response.json();
      setTasks(prev => [data, ...prev]);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const createColumn = async (columnData: { name: string; color: string; requiresPr: boolean }) => {
    try {
      const response = await fetch('/api/planner/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...columnData, boardId: selectedBoard }),
      });
      const data = await response.json();
      setColumns(prev => [...prev, data]);
    } catch (error) {
      console.error('Failed to create column:', error);
    }
  };

  const updateColumn = async (columnId: string, updates: { name?: string; color?: string; requiresPr?: boolean }) => {
    try {
      const response = await fetch('/api/planner/columns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: columnId, ...updates }),
      });
      const data = await response.json();
      setColumns(prev => prev.map(col => col.id === columnId ? data : col));
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
      const response = await fetch('/api/planner/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, ...updates }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const updatedTask = await response.json();
      setTasks(prev => prev.map(t => (t.id === taskId ? updatedTask : t)));
    } catch (error) {
      console.error('Failed to update task:', error);
      // Re-sync from server if update failed
      fetchTasks();
    }
  };

  // Patch on server without touching local state (used for DnD persistence)
  const patchTaskSilently = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch('/api/planner/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, ...updates }),
      });
      if (!response.ok) {
        console.warn('Silent patch failed', response.status);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Silent patch error', e);
      return false;
    }
  };

  const applyDragMove = async (result: DropResult, persist: boolean = true) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const moving = tasks.find(t => t.id === draggableId);
    if (!moving) return;

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;
    const sameColumn = sourceColId === destColId;

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
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const moving = tasks.find(t => t.id === draggableId);
    if (!moving) return;
    const sameColumn = destination.droppableId === source.droppableId;

    // If destination column requires PR and task has none, open modal and only move locally (no persist yet)
    if (!sameColumn) {
      const destCol = columns.find(c => c.id === destination.droppableId);
      const requiresPr = !!(destCol as any)?.requiresPr;
      if (requiresPr && !moving.prUrl) {
        await applyDragMove(result, false);
        setPrModalTask(moving);
        setPendingMove(result);
        setIsPrModalOpen(true);
        return;
      }
    }

    // Otherwise, apply move and persist immediately
    await applyDragMove(result, true);
  };

  const tasksByColumn = columns.reduce((acc, column) => {
    acc[column.id] = tasks.filter(t => t.columnId === column.id).sort((a, b) => (a.order || 0) - (b.order || 0));
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 bg-white border-b border-slate-200 z-10">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Project Planner</h1>
              {selectedBoard && (
                <p className="text-slate-600 mt-1">
                  Board: {boards.find(b => b.id === selectedBoard)?.name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedBoard}
                onChange={(e) => setSelectedBoard(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {boards.map(board => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsNewColumnModalOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                New Column
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                New Board
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading tasks...</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 overflow-x-auto pb-6">
              {columns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  tasks={tasksByColumn[column.id] || []}
                  onAddTask={handleAddTask}
                  onEditColumn={handleEditColumn}
                  onDeleteColumn={handleDeleteColumn}
                  onEditTask={handleEditTask}
                />
              ))}
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
      />

      <ColumnModal
        isOpen={isNewColumnModalOpen}
        onClose={() => setIsNewColumnModalOpen(false)}
        onSubmit={createColumn}
        title="Create New Column"
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
        initialData={editingColumn ? {
          name: editingColumn.name,
          color: editingColumn.color,
          requiresPr: (editingColumn as any).requiresPr || false,
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
          const ok = await patchTaskSilently(prModalTask.id, { prUrl: url });
          if (!ok) {
            alert('Invalid PR URL. Task will remain in its original column.');
            // Invalid: revert the move as well
            await revertPendingMove();
            setIsPrModalOpen(false);
            return;
          }
          setTasks(prev => prev.map(t => (t.id === prModalTask.id ? { ...t, prUrl: url } : t)));
          setIsPrModalOpen(false);
          const saved = pendingMove;
          setPrModalTask(null);
          setPendingMove(null);
          await applyDragMove(saved, true);
        }}
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
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; color: string; requiresPr: boolean }) => void;
  title: string;
  initialData?: { name: string; color: string; requiresPr?: boolean };
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [color, setColor] = useState(initialData?.color || 'slate');
  const [requiresPr, setRequiresPr] = useState<boolean>(initialData?.requiresPr || false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setColor(initialData.color);
      setRequiresPr(!!initialData.requiresPr);
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      color,
      requiresPr,
    });

    setName('');
    setColor('slate');
    setRequiresPr(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter column name..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Color
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COLUMN_COLORS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    color === colorOption.value
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-slate-200 hover:border-slate-300'
                  } ${colorOption.bg}`}
                >
                  <div className="text-xs font-medium text-center">{colorOption.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="requiresPr"
              type="checkbox"
              checked={requiresPr}
              onChange={(e) => setRequiresPr(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-slate-300 rounded"
            />
            <label htmlFor="requiresPr" className="text-sm text-slate-700">
              This is a Pull Request column (require PR link on move)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
}: {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  columns: Column[];
  onSubmit: (updates: Partial<Task>) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [labels, setLabels] = useState('');
  const [prUrl, setPrUrl] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('pending');
  const [columnId, setColumnId] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setLabels(task.labels?.join(', ') || '');
      setPrUrl(task.prUrl || '');
      setAssignee(task.assignee || '');
      setStatus(task.status);
      setColumnId(task.columnId);
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const updates: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || undefined,
      labels: labels
        .split(',')
        .map(l => l.trim())
        .filter(Boolean),
      prUrl: prUrl.trim() || undefined,
      assignee: assignee.trim() || undefined,
      status: status as Task['status'],
      columnId,
    };

    onSubmit(updates);
    onClose();
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">
            Edit Task
          </h3>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task title..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Column *
            </label>
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter task description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Labels (comma-separated)
            </label>
            <input
              type="text"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="bug, feature, urgent..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              PR URL
            </label>
            <input
              type="text"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://github.com/owner/repo/pull/123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assignee
            </label>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="username"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update Task
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return <PlannerBoard />;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Add Pull Request Link</h3>
          <p className="text-sm text-slate-600">Moving "{taskTitle}" into "{columnName}" requires a PR URL.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">PR URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/123"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Link & Move
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
