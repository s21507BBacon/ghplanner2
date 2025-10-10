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
  if (!url) {
    console.log('parsePRUrl: URL is empty or null');
    return null;
  }

  // Trim whitespace
  const originalUrl = url;
  url = url.trim();
  console.log('parsePRUrl: Original URL:', originalUrl, 'Trimmed URL:', url);

  // Handle scheme-less URLs
  let normalizedUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    normalizedUrl = `https://${url}`;
    console.log('parsePRUrl: Added scheme, normalized to:', normalizedUrl);
  }

  try {
    const urlObj = new URL(normalizedUrl);
    console.log('parsePRUrl: Parsed URL object:', {
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      href: urlObj.href
    });

    // Only accept github.com URLs (and www.github.com)
    const hostname = urlObj.hostname.toLowerCase();
    if (hostname !== 'github.com' && hostname !== 'www.github.com') {
      console.error('parsePRUrl: Invalid hostname:', hostname);
      return null;
    }

    // Expected format: /owner/repo/pull/number
    // Also accepts trailing slashes and additional paths like /files, /commits, etc.
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    console.log('parsePRUrl: Path parts:', pathParts);

    // Need at least: owner, repo, pull, number
    if (pathParts.length < 4) {
      console.error('parsePRUrl: Not enough path parts. Expected at least 4, got:', pathParts.length);
      return null;
    }

    // Check if 'pull' is at the correct position
    if (pathParts[2] !== 'pull') {
      console.error('parsePRUrl: Third path segment is not "pull", got:', pathParts[2]);
      return null;
    }

    const owner = pathParts[0];
    const repo = pathParts[1];
    const number = parseInt(pathParts[3], 10);

    console.log('parsePRUrl: Extracted values:', { owner, repo, number });

    if (!owner || !repo || isNaN(number) || number <= 0) {
      console.error('parsePRUrl: Invalid extracted values:', { owner, repo, number });
      return null;
    }

    console.log('parsePRUrl: SUCCESS! Returning:', { owner, repo, number });
    return { owner, repo, number };
  } catch (error) {
    console.error('parsePRUrl: Failed to parse PR URL:', url, error);
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

export interface PRStatusResult {
  merged: boolean;
  closed: boolean;
  approved: boolean;
  changesRequested: boolean;
  state: 'open' | 'closed';
  error?: string;
}

export async function checkPRStatus(prUrl: string, githubToken?: string): Promise<PRStatusResult> {
  const parsed = parsePRUrl(prUrl);
  if (!parsed) {
    return { merged: false, closed: false, approved: false, changesRequested: false, state: 'open', error: 'Invalid PR URL' };
  }

  try {
    // Fetch PR details
    const prApiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.number}`;
    const prResponse = await fetch(prApiUrl, {
      headers: getGitHubHeaders(githubToken),
    });

    if (!prResponse.ok) {
      console.error(`Failed to fetch PR: ${prResponse.status}`);
      return { merged: false, closed: false, approved: false, changesRequested: false, state: 'open', error: `HTTP ${prResponse.status}` };
    }

    const prData: GitHubPR = await prResponse.json();
    
    // Fetch PR reviews
    const reviewsApiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.number}/reviews`;
    const reviewsResponse = await fetch(reviewsApiUrl, {
      headers: getGitHubHeaders(githubToken),
    });

    let approved = false;
    let changesRequested = false;

    if (reviewsResponse.ok) {
      const reviews: GitHubReview[] = await reviewsResponse.json();
      const reviewsByUser = getReviewSummaryByUser(reviews);
      
      // Check for approval and requested changes in latest reviews
      for (const review of Object.values(reviewsByUser)) {
        if (review.state === 'APPROVED') {
          approved = true;
        }
        if (review.state === 'CHANGES_REQUESTED') {
          changesRequested = true;
        }
      }
    }

    return {
      merged: prData.merged,
      closed: prData.state === 'closed',
      approved,
      changesRequested,
      state: prData.state,
    };
  } catch (error) {
    console.error('Error checking PR status:', error);
    return { merged: false, closed: false, approved: false, changesRequested: false, state: 'open', error: 'Failed to check PR status' };
  }
}

// Keep old function for backward compatibility
export async function checkPRMergeStatus(prUrl: string, githubToken?: string): Promise<{ merged: boolean; error?: string }> {
  const result = await checkPRStatus(prUrl, githubToken);
  return { merged: result.merged, error: result.error };
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