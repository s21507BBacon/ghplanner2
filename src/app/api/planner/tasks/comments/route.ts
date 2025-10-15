import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { DbHelpers, dateToTimestamp } from '@/lib/db';
import { postPRComment } from '@/lib/github';

interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json(
      { error: 'Missing required parameter: taskId' },
      { status: 400 }
    );
  }

  try {
    const db = getDatabase();
    const helpers = new DbHelpers(db);
    const comments = await helpers.findMany<any>('task_comments', { task_id: taskId }, 'created_at ASC');

    // Get user names for each comment
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const user = await helpers.findOne<any>('users', { id: comment.user_id });
        return {
          id: comment.id,
          author: user?.name || 'Unknown User',
          authorId: comment.user_id,
          content: comment.content,
          imageUrl: comment.image_url,
          createdAt: new Date(comment.created_at * 1000).toISOString(),
          updatedAt: new Date(comment.created_at * 1000).toISOString(),
        };
      })
    );

    return NextResponse.json({
      comments: commentsWithAuthors,
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { taskId, author, authorId, content, imageUrl } = body;

    if (!taskId || !authorId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, authorId, content' },
        { status: 400 }
      );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content must be a non-empty string' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);
    const now = new Date();

    const comment: any = {
      id: crypto.randomUUID(),
      task_id: taskId,
      user_id: authorId,
      content: content.trim(),
      created_at: dateToTimestamp(now),
    };

    if (imageUrl) {
      comment.image_url = imageUrl;
    }

    await helpers.insert('task_comments', comment);

    // Try to sync comment to GitHub PR if task has a PR URL
    let githubSyncStatus = null;
    try {
      const task = await helpers.findOne<any>('tasks', { id: taskId });
      if (task?.pr_url) {
        // Get user's GitHub token
        const user = await helpers.findOne<any>('users', { id: authorId });
        const githubToken = user?.github_access_token;

        if (githubToken) {
          const githubComment = `**${author}** commented on task:\n\n${content.trim()}`;
          const result = await postPRComment(task.pr_url, githubComment, githubToken);
          
          if (result.success) {
            console.log(`[COMMENT] Successfully synced comment to GitHub PR: ${task.pr_url}`);
            githubSyncStatus = { success: true, commentId: result.commentId };
          } else {
            console.warn(`[COMMENT] Failed to sync to GitHub PR: ${result.error}`);
            githubSyncStatus = { success: false, error: result.error };
          }
        } else {
          console.log('[COMMENT] User has not connected GitHub account, skipping PR sync');
          githubSyncStatus = { success: false, error: 'GitHub account not connected' };
        }
      }
    } catch (syncError) {
      console.error('[COMMENT] Error syncing to GitHub:', syncError);
      githubSyncStatus = { success: false, error: 'Sync error' };
    }

    return NextResponse.json({
      id: comment.id,
      author: author || 'Unknown User',
      authorId: comment.user_id,
      content: comment.content,
      imageUrl: comment.image_url,
      createdAt: new Date(comment.created_at * 1000).toISOString(),
      updatedAt: new Date(comment.created_at * 1000).toISOString(),
      githubSync: githubSyncStatus,
    }, { status: 201 });

  } catch (error) {
    console.error('Database error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, content } = body;

    if (!id || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: id, content' },
        { status: 400 }
      );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content must be a non-empty string' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const existing = await helpers.findOne<any>('task_comments', { id });
    if (!existing) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    await helpers.update('task_comments', { id }, { content: content.trim(), updated_at: dateToTimestamp(new Date()) });
    const updated = await helpers.findOne<any>('task_comments', { id });
    return NextResponse.json({
      id: updated!.id,
      author: updated!.author,
      content: updated!.content,
      created_at: new Date(updated!.created_at * 1000).toISOString(),
      updated_at: new Date(updated!.updated_at * 1000).toISOString(),
    });

  } catch (error) {
    console.error('Database error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'Missing required parameter: id' },
      { status: 400 }
    );
  }

  try {
    const db = getDatabase();
    const helpers = new DbHelpers(db);

    const exists = await helpers.findOne('task_comments', { id });
    if (!exists) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    await helpers.delete('task_comments', { id });
    return NextResponse.json(
      { message: 'Comment deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}