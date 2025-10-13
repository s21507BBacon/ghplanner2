import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp, timestampToDate, boolToInt, intToBool, parseJsonField, stringifyJsonField } from '@/lib/db';
import { Task } from '@/lib/types';
import { checkPRStatus } from '@/lib/github';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { boardId } = body;

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID is required' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    // Get the board to determine enterprise and project context
    const board = await helpers.findOne<any>('boards', { id: boardId });
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Get all columns with PR tracking enabled
    const columns = await helpers.execute<any>(
      'SELECT * FROM columns WHERE board_id = ? AND requires_pr = 1',
      boardId
    );

    if (columns.length === 0) {
      return NextResponse.json({ movedTasks: [], statusUpdates: [], syncedStatuses: [] });
    }

    const columnIds = columns.map((c: any) => c.id);

    // Get all tasks in those columns that have PR URLs
    const tasks = columnIds.length > 0
      ? await helpers.execute<any>(
          `SELECT * FROM tasks WHERE board_id = ? AND column_id IN (${columnIds.map(() => '?').join(',')}) AND pr_url IS NOT NULL`,
          boardId, ...columnIds
        )
      : [];

    const movedTasks: Array<{ taskId: string; fromColumn: string; toColumn: string; reason: string }> = [];
    const statusUpdates: Array<{ taskId: string; oldStatus: string; newStatus: string }> = [];

    for (const task of tasks) {
      if (!task.pr_url) continue;

      const column = columns.find((c: any) => c.id === task.column_id);
      if (!column) continue;

      // Check PR status comprehensively using context-aware token resolution
      const prStatus = await checkPRStatus(task.pr_url, undefined, board.enterprise_id, board.project_id, helpers);
      
      if (prStatus.error) {
        console.log(`Skipping task ${task.id}: ${prStatus.error}`);
        continue;
      }

      let newColumnId: string | null = null;
      let newStatus: string | null = null;
      let moveReason = '';

      // Priority 1: Handle merged PRs
      if (prStatus.merged) {
        const moveToColumn = (column as any).move_to_column_on_merge;
        if (moveToColumn) {
          newColumnId = moveToColumn;
          moveReason = 'PR merged';
        }
        newStatus = 'merged';
      }
      // Priority 2: Handle closed (but not merged) PRs
      else if (prStatus.closed && !prStatus.merged) {
        const moveToColumn = (column as any).move_to_column_on_closed;
        if (moveToColumn) {
          newColumnId = moveToColumn;
          moveReason = 'PR closed without merging';
        }
      }
      // Priority 3: Handle requested changes
      else if (prStatus.changesRequested) {
        const moveToColumn = (column as any).move_to_column_on_request_changes;
        if (moveToColumn) {
          newColumnId = moveToColumn;
          moveReason = 'Changes requested on PR';
        }
        newStatus = 'changes_requested';
      }
      // Priority 4: Handle approved (but not merged) - update status only, don't move
      else if (prStatus.approved && !prStatus.merged && prStatus.state === 'open') {
        newStatus = 'approved';
      }

      // Update task if needed
      const updates: any = { updated_at: dateToTimestamp(new Date()) };
      let hasUpdates = false;

      if (newColumnId && newColumnId !== task.column_id) {
        updates.column_id = newColumnId;
        hasUpdates = true;
        movedTasks.push({
          taskId: task.id,
          fromColumn: task.column_id,
          toColumn: newColumnId,
          reason: moveReason
        });
      }

      if (newStatus && newStatus !== task.status) {
        updates.status = newStatus;
        hasUpdates = true;
        statusUpdates.push({
          taskId: task.id,
          oldStatus: task.status,
          newStatus
        });
      }

      if (hasUpdates) {
        await helpers.update('tasks', { id: task.id }, updates);
        console.log(`Updated task ${task.id}: ${JSON.stringify(updates)}`);
      }
    }

    // Sync task statuses with column names for non-PR columns
    const allColumns = await helpers.findMany<any>('columns', { board_id: boardId });
    const allTasks = await helpers.findMany<any>('tasks', { board_id: boardId });
    const syncedStatuses: Array<{ taskId: string; columnName: string; newStatus: string }> = [];

    for (const task of allTasks) {
      const taskColumn = allColumns.find((c: any) => c.id === task.column_id);
      if (!taskColumn) continue;

      // For PR columns, status should be "pending" unless it's been updated by PR checks above
      const isPrColumn = !!(taskColumn as any).requires_pr;
      let expectedStatus: string;

      if (isPrColumn) {
        // Only sync to "pending" if task doesn't have a PR-specific status
        if (!['approved', 'merged', 'changes_requested'].includes(task.status)) {
          expectedStatus = 'pending';
        } else {
          continue; // Keep PR-specific statuses
        }
      } else {
        // Sync status with column name for non-PR columns
        expectedStatus = taskColumn.name.toLowerCase().replace(/\s+/g, '_');
        
        // Map common column names to valid statuses
        const statusMap: Record<string, string> = {
          'backlog': 'pending',
          'to_do': 'pending',
          'todo': 'pending',
          'in_progress': 'in_progress',
          'doing': 'in_progress',
          'review': 'in_progress',
          'done': 'completed',
          'complete': 'completed',
          'completed': 'completed',
          'blocked': 'blocked',
          'blockers': 'blocked'
        };

        expectedStatus = statusMap[expectedStatus] || task.status; // Keep current if no match
      }

      if (expectedStatus && expectedStatus !== task.status && ['pending', 'in_progress', 'completed', 'blocked', 'approved', 'merged', 'changes_requested'].includes(expectedStatus)) {
        await helpers.update('tasks', 
          { id: task.id }, 
          { status: expectedStatus, updated_at: dateToTimestamp(new Date()) }
        );

        syncedStatuses.push({
          taskId: task.id,
          columnName: taskColumn.name,
          newStatus: expectedStatus
        });
      }
    }

    return NextResponse.json({
      movedTasks,
      statusUpdates,
      syncedStatuses,
      checked: tasks.length
    });

  } catch (error) {
    console.error('Error checking PRs:', error);
    return NextResponse.json(
      { error: 'Failed to check PRs' },
      { status: 500 }
    );
  }
}

