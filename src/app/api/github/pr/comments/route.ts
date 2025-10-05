import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { parsePRUrl } from '@/lib/github';

interface Comment {
  _id?: string;
  prUrl: string;
  author: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'Missing required parameter: url' },
      { status: 400 }
    );
  }

  const parsed = parsePRUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid PR URL format' },
      { status: 400 }
    );
  }

  try {
    const db = await connectToDatabase();
    const comments = await db
      .collection<Comment>('comments')
      .find({ prUrl: url })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({
      comments: comments.map(comment => ({
        id: comment._id?.toString(),
        author: comment.author,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      })),
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
    const body = await request.json();
    const { url, author, content } = body;

    if (!url || !author || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: url, author, content' },
        { status: 400 }
      );
    }

    const parsed = parsePRUrl(url);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid PR URL format' },
        { status: 400 }
      );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content must be a non-empty string' },
        { status: 400 }
      );
    }

    if (typeof author !== 'string' || author.trim().length === 0) {
      return NextResponse.json(
        { error: 'Author must be a non-empty string' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const now = new Date();

    const comment: Comment = {
      prUrl: url,
      author: author.trim(),
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection<Comment>('comments').insertOne(comment);

    return NextResponse.json({
      id: result.insertedId.toString(),
      author: comment.author,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
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

    const db = await connectToDatabase();
    const { ObjectId } = await import('mongodb');

    const result = await db
      .collection<Comment>('comments')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            content: content.trim(),
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

    if (!result) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: result._id?.toString(),
      author: result.author,
      content: result.content,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
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
    const db = await connectToDatabase();
    const { ObjectId } = await import('mongodb');

    const result = await db
      .collection<Comment>('comments')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

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