// GitHub API utility functions

export interface ParsedPRUrl {
  owner: string;
  repo: string;
  number: number;
}

export interface GitHubPR {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  draft: boolean;
  merged: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  user: {
    login: string;
    avatar_url: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  html_url: string;
}

export interface GitHubFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  patch?: string;
}

export interface GitHubReview {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  body: string;
  state: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
  submitted_at: string;
}

export interface GitHubCheckRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  html_url: string;
  details_url?: string;
  started_at?: string;
  completed_at?: string;
}

export interface GitHubCombinedStatus {
  state: 'pending' | 'success' | 'failure' | 'error';
  total_count: number;
  statuses: Array<{
    id: number;
    state: 'pending' | 'success' | 'failure' | 'error';
    description: string;
    target_url?: string;
    context: string;
    created_at: string;
    updated_at: string;
  }>;
}

export function parsePRUrl(url: string): ParsedPRUrl | null {
  if (!url) return null;

  // Handle scheme-less URLs
  let normalizedUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    normalizedUrl = `https://${url}`;
  }

  try {
    const urlObj = new URL(normalizedUrl);

    // Only accept github.com URLs
    if (urlObj.hostname !== 'github.com') {
      return null;
    }

    // Expected format: /owner/repo/pull/number
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    if (pathParts.length < 4 || pathParts[2] !== 'pull') {
      return null;
    }

    const owner = pathParts[0];
    const repo = pathParts[1];
    const number = parseInt(pathParts[3], 10);

    if (!owner || !repo || isNaN(number) || number <= 0) {
      return null;
    }

    return { owner, repo, number };
  } catch {
    return null;
  }
}

export function getReviewSummaryByUser(reviews: GitHubReview[]): Record<string, GitHubReview> {
  const reviewsByUser: Record<string, GitHubReview> = {};

  // Sort reviews by submission time (newest first)
  const sortedReviews = [...reviews].sort((a, b) =>
    new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );

  // Keep only the latest review per user
  for (const review of sortedReviews) {
    const username = review.user.login;
    if (!reviewsByUser[username]) {
      reviewsByUser[username] = review;
    }
  }

  return reviewsByUser;
}

export function formatPRResponse(
  pr: GitHubPR,
  reviews: GitHubReview[],
  files: GitHubFile[],
  combinedStatus: GitHubCombinedStatus,
  checkRuns: GitHubCheckRun[]
) {
  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    draft: pr.draft,
    merged: pr.merged,
    mergeable: pr.mergeable,
    mergeable_state: pr.mergeable_state,
    author: {
      login: pr.user.login,
      avatar_url: pr.user.avatar_url,
    },
    branch: {
      head: pr.head.ref,
      base: pr.base.ref,
      head_sha: pr.head.sha,
      base_sha: pr.base.sha,
    },
    dates: {
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      closed_at: pr.closed_at,
      merged_at: pr.merged_at,
    },
    stats: {
      commits: pr.commits,
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: pr.changed_files,
    },
    reviews: {
      summary: getReviewSummaryByUser(reviews),
      all: reviews,
    },
    files: files.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      blob_url: file.blob_url,
    })),
    ci: {
      combined_status: combinedStatus,
      check_runs: checkRuns,
    },
    html_url: pr.html_url,
  };
}

export function getGitHubHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'GitHub-Planner/1.0',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function getErrorMessage(status: number, message?: string): { error: string; hint?: string } {
  switch (status) {
    case 400:
      return {
        error: 'Invalid request format',
        hint: 'Check that the PR URL is correctly formatted: https://github.com/owner/repo/pull/number'
      };
    case 401:
      return {
        error: 'Authentication required',
        hint: 'Provide a valid GITHUB_TOKEN environment variable with appropriate scopes'
      };
    case 403:
      return {
        error: 'Access forbidden',
        hint: 'The repository may be private, require SSO, or your token lacks necessary scopes (repo, read:org)'
      };
    case 404:
      return {
        error: 'Pull request not found',
        hint: 'Verify the repository exists and the PR number is correct'
      };
    case 422:
      return {
        error: 'Unprocessable entity',
        hint: 'The PR URL format is invalid or the repository/PR does not exist'
      };
    default:
      return {
        error: message || 'GitHub API error',
        hint: 'Check GitHub status page or try again later'
      };
  }
}