import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
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

    const db = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    // Get all columns with PR tracking enabled
    const columns = await db
      .collection('columns')
      .find({ 
        boardId,
        requiresPr: true
      })
      .toArray();

    if (columns.length === 0) {
      return NextResponse.json({ movedTasks: [], statusUpdates: [], syncedStatuses: [] });
    }

    const columnIds = columns.map(c => c._id?.toString() || c.id);
    
    // Get all tasks in those columns that have PR URLs
    const tasks = await db
      .collection<Task>('tasks')
      .find({
        boardId,
        columnId: { $in: columnIds },
        prUrl: { $exists: true, $ne: null }
      })
      .toArray();

    const movedTasks: Array<{ taskId: string; fromColumn: string; toColumn: string; reason: string }> = [];
    const statusUpdates: Array<{ taskId: string; oldStatus: string; newStatus: string }> = [];
    const githubToken = process.env.GITHUB_TOKEN;

    for (const task of tasks) {
      if (!task.prUrl) continue;

      const column = columns.find(c => (c._id?.toString() || c.id) === task.columnId);
      if (!column) continue;

      // Check PR status comprehensively
      const prStatus = await checkPRStatus(task.prUrl, githubToken);
      
      if (prStatus.error) {
        console.log(`Skipping task ${task.id}: ${prStatus.error}`);
        continue;
      }

      let newColumnId: string | null = null;
      let newStatus: string | null = null;
      let moveReason = '';

      // Priority 1: Handle merged PRs
      if (prStatus.merged) {
        const moveToColumn = (column as any).moveToColumnOnMerge;
        if (moveToColumn) {
          newColumnId = moveToColumn;
          moveReason = 'PR merged';
        }
        newStatus = 'merged';
      }
      // Priority 2: Handle closed (but not merged) PRs
      else if (prStatus.closed && !prStatus.merged) {
        const moveToColumn = (column as any).moveToColumnOnClosed;
        if (moveToColumn) {
          newColumnId = moveToColumn;
          moveReason = 'PR closed without merging';
        }
      }
      // Priority 3: Handle requested changes
      else if (prStatus.changesRequested) {
        const moveToColumn = (column as any).moveToColumnOnRequestChanges;
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
      const updates: any = { updatedAt: new Date() };
      let hasUpdates = false;

      if (newColumnId && newColumnId !== task.columnId) {
        updates.columnId = newColumnId;
        hasUpdates = true;
        movedTasks.push({
          taskId: task._id?.toString() || task.id,
          fromColumn: task.columnId,
          toColumn: newColumnId,
          reason: moveReason
        });
      }

      if (newStatus && newStatus !== task.status) {
        updates.status = newStatus;
        hasUpdates = true;
        statusUpdates.push({
          taskId: task._id?.toString() || task.id,
          oldStatus: task.status,
          newStatus
        });
      }

      if (hasUpdates) {
        await db
          .collection<Task>('tasks')
          .updateOne(
            { _id: new ObjectId(task._id?.toString() || task.id) },
            { $set: updates }
          );

        console.log(`Updated task ${task.id}: ${JSON.stringify(updates)}`);
      }
    }

    // Sync task statuses with column names for non-PR columns
    const allColumns = await db.collection('columns').find({ boardId }).toArray();
    const allTasks = await db.collection<Task>('tasks').find({ boardId }).toArray();
    const syncedStatuses: Array<{ taskId: string; columnName: string; newStatus: string }> = [];

    for (const task of allTasks) {
      const taskColumn = allColumns.find(c => (c._id?.toString() || c.id) === task.columnId);
      if (!taskColumn) continue;

      // For PR columns, status should be "pending" unless it's been updated by PR checks above
      const isPrColumn = !!(taskColumn as any).requiresPr;
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
        await db
          .collection<Task>('tasks')
          .updateOne(
            { _id: new ObjectId(task._id?.toString() || task.id) },
            { $set: { status: expectedStatus, updatedAt: new Date() } }
          );

        syncedStatuses.push({
          taskId: task._id?.toString() || task.id,
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

