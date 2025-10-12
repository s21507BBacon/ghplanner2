import { NextRequest, NextResponse } from 'next/server';
import {
  parsePRUrl,
  formatPRResponse,
  getGitHubHeaders,
  getErrorMessage,
  type GitHubPR,
  type GitHubReview,
  type GitHubFile,
  type GitHubCombinedStatus,
  type GitHubCheckRun,
} from '@/lib/github';


const GITHUB_API_BASE = 'https://api.github.com';

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
    const { error, hint } = getErrorMessage(400);
    return NextResponse.json({ error, hint }, { status: 400 });
  }

  const { owner, repo, number } = parsed;
  const token = process.env.GITHUB_TOKEN;
  const headers = getGitHubHeaders(token);

  try {
    // Fetch PR data, reviews, files, status, and check runs in parallel
    const [prResponse, reviewsResponse, filesResponse, statusResponse, checksResponse] = await Promise.all([
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${number}`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${number}/reviews`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${number}/files`, {
        headers,
        cache: 'no-store',
      }),
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${parsed.owner}:${parsed.repo}:${number}/status`, {
        headers,
        cache: 'no-store',
      }).catch(() => null), // Status endpoint might not exist for some PRs
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${parsed.owner}:${parsed.repo}:${number}/check-runs`, {
        headers,
        cache: 'no-store',
      }).catch(() => null), // Check runs might not exist
    ]);

    // Handle PR response errors
    if (!prResponse.ok) {
      const { error, hint } = getErrorMessage(prResponse.status);
      return NextResponse.json({ error, hint }, { status: prResponse.status });
    }

    const pr: GitHubPR = await prResponse.json();

    // Fetch reviews
    let reviews: GitHubReview[] = [];
    if (reviewsResponse.ok) {
      reviews = await reviewsResponse.json();
    }

    // Fetch files
    let files: GitHubFile[] = [];
    if (filesResponse.ok) {
      files = await filesResponse.json();
    }

    // Fetch combined status using the head SHA
    let combinedStatus: GitHubCombinedStatus = {
      state: 'pending',
      total_count: 0,
      statuses: [],
    };

    try {
      const statusResp = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${pr.head.sha}/status`, {
        headers,
        cache: 'no-store',
      });
      if (statusResp.ok) {
        combinedStatus = await statusResp.json();
      }
    } catch (error) {
      console.warn('Failed to fetch combined status:', error);
    }

    // Fetch check runs using the head SHA
    let checkRuns: GitHubCheckRun[] = [];
    try {
      const checksResp = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${pr.head.sha}/check-runs`, {
        headers,
        cache: 'no-store',
      });
      if (checksResp.ok) {
        const checksData = await checksResp.json();
        checkRuns = checksData.check_runs || [];
      }
    } catch (error) {
      console.warn('Failed to fetch check runs:', error);
    }

    // Format and return the response
    const formattedResponse = formatPRResponse(pr, reviews, files, combinedStatus, checkRuns);

    return NextResponse.json(formattedResponse, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('GitHub API error:', error);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        {
          error: 'Network error',
          hint: 'Unable to connect to GitHub API. Check your internet connection.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        hint: 'An unexpected error occurred while fetching PR data.',
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}