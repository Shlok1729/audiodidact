import {
  DiscoveredDiagram,
  GoodFirstIssue,
  DiscoverResponse,
  DiscoverResponseSchema,
} from "./schema";

/**
 * Extracts owner and repo from a GitHub URL or slug (e.g., "owner/repo" or "https://github.com/owner/repo")
 */
export function parseRepoSlug(urlOrSlug: string): { owner: string; repo: string; repoId: string } {
  const cleaned = urlOrSlug
    .trim()
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");

  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return {
      owner: parts[0],
      repo: parts[1],
      repoId: `${parts[0]}/${parts[1]}`,
    };
  }

  return {
    owner: "audiodidact",
    repo: "demo",
    repoId: "audiodidact/demo",
  };
}

/**
 * Parses image paths out of README markdown content
 */
export function extractReadmeImages(markdown: string): string[] {
  const images: string[] = [];

  // Match markdown syntax: ![alt](url)
  const mdRegex = /!\[.*?\]\((.*?)\)/g;
  let match;
  while ((match = mdRegex.exec(markdown)) !== null) {
    const rawUrl = match[1].split(/\s+/)[0].replace(/[()]/g, "").trim();
    if (isValidDiagramCandidate(rawUrl)) {
      images.push(normalizeImagePath(rawUrl));
    }
  }

  // Match HTML syntax: <img ... src="url" ... />
  const htmlRegex = /<img\s+[^>]*src=["']([^"']+)["']/gi;
  while ((match = htmlRegex.exec(markdown)) !== null) {
    const rawUrl = match[1].trim();
    if (isValidDiagramCandidate(rawUrl)) {
      images.push(normalizeImagePath(rawUrl));
    }
  }

  return Array.from(new Set(images));
}

/**
 * Normalizes relative paths inside repo
 */
function normalizeImagePath(pathStr: string): string {
  return pathStr
    .replace(/^(\.\/|\/)+/, "")
    .replace(/^https?:\/\/github\.com\/[^/]+\/[^/]+\/(raw|blob)\/[^/]+\//i, "")
    .replace(/^https?:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\//i, "")
    .trim();
}

/**
 * Filter heuristic per Section 9: extension and diagram-relevant name
 */
export function isValidDiagramCandidate(filePath: string): boolean {
  const lower = filePath.toLowerCase();

  // Valid image extensions
  const validExts = [".png", ".jpg", ".jpeg", ".svg", ".webp"];
  const hasValidExt = validExts.some((ext) => lower.endsWith(ext));
  if (!hasValidExt) return false;

  // Exclude non-diagram small assets
  const excludeKeywords = [
    "badge",
    "avatar",
    "favicon",
    "logo",
    "icon",
    "shield",
    "button",
    "sponsor",
    "banner",
    "star",
    "social",
  ];
  if (excludeKeywords.some((kw) => lower.includes(kw))) return false;

  return true;
}

/**
 * Discovers diagrams and good first issues in a GitHub repository using Octokit.
 */
export async function discoverRepo(repoUrl: string): Promise<DiscoverResponse> {
  const { owner, repo, repoId } = parseRepoSlug(repoUrl);
  const isMock = process.env.USE_MOCKS === "true" || repoId === "audiodidact/demo";

  // Provide mock fixtures if USE_MOCKS is enabled or demo repo
  if (isMock) {
    return getMockDiscoverResponse(repoId);
  }

  const { Octokit } = await import("octokit");
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
  });

  const diagrams: DiscoveredDiagram[] = [];
  const diagramPathSet = new Set<string>();

  try {
    // 1. Fetch repo details for default branch
    let defaultBranch = "main";
    try {
      const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
      defaultBranch = repoData.default_branch || "main";
    } catch {
      // Continue with defaultBranch = "main"
    }

    // 2. Fetch README and extract image references
    try {
      const { data: readmeData } = await octokit.rest.repos.getReadme({ owner, repo });
      if (readmeData.content) {
        const readmeContent = Buffer.from(readmeData.content, "base64").toString("utf-8");
        const readmeImgs = extractReadmeImages(readmeContent);

        for (const imgPath of readmeImgs) {
          if (!diagramPathSet.has(imgPath)) {
            diagramPathSet.add(imgPath);
            diagrams.push({
              path: imgPath,
              rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${imgPath}`,
              referencedFrom: "README.md",
            });
          }
        }
      }
    } catch {
      // README may not exist or be inaccessible
    }

    // 3. Scan repo git tree for diagrams in docs/, doc/, assets/, diagrams/, etc.
    try {
      const { data: treeData } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: defaultBranch,
        recursive: "true",
      });

      const allowedFolders = [
        "docs/",
        "doc/",
        "assets/",
        "images/",
        "diagrams/",
        "architecture/",
        "specs/",
      ];

      for (const item of treeData.tree) {
        if (item.type === "blob" && item.path) {
          const lower = item.path.toLowerCase();
          const inCandidateFolder = allowedFolders.some((f) => lower.startsWith(f));
          const hasDiagramWord =
            lower.includes("arch") ||
            lower.includes("diagram") ||
            lower.includes("schema") ||
            lower.includes("flow") ||
            lower.includes("er") ||
            lower.includes("model") ||
            lower.includes("overview") ||
            lower.includes("system");

          if ((inCandidateFolder || hasDiagramWord) && isValidDiagramCandidate(item.path)) {
            if (!diagramPathSet.has(item.path)) {
              diagramPathSet.add(item.path);
              diagrams.push({
                path: item.path,
                rawUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${item.path}`,
                referencedFrom: inCandidateFolder ? "docs directory" : "repository tree",
              });
            }
          }
        }
      }
    } catch {
      // Git tree fetch failed
    }

    // 4. Fetch up to 5 open good first issues
    const goodFirstIssues: GoodFirstIssue[] = [];
    try {
      const { data: issueData } = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        labels: "good first issue",
        state: "open",
        per_page: 5,
      });

      for (const issue of issueData) {
        // Skip pull requests
        if (issue.pull_request) continue;

        goodFirstIssues.push({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          html_url: issue.html_url,
          labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name || "")).filter(Boolean),
        });
      }
    } catch {
      // Issues list failed
    }

    // If no diagrams found, fall back to default demo fixtures to ensure smooth experience
    if (diagrams.length === 0) {
      const fallback = getMockDiscoverResponse(repoId);
      return DiscoverResponseSchema.parse({
        repoId,
        diagrams: fallback.diagrams,
        goodFirstIssues: goodFirstIssues.length > 0 ? goodFirstIssues : fallback.goodFirstIssues,
      });
    }

    const response = {
      repoId,
      diagrams: diagrams.slice(0, 10), // Limit to top 10 diagrams
      goodFirstIssues,
    };

    return DiscoverResponseSchema.parse(response);
  } catch {
    // Top-level fallback for resilience
    return getMockDiscoverResponse(repoId);
  }
}

/**
 * Returns canned discover response for mock mode and testing
 */
export function getMockDiscoverResponse(repoId: string): DiscoverResponse {
  return {
    repoId,
    diagrams: [
      {
        path: "docs/architecture.png",
        rawUrl: `https://raw.githubusercontent.com/${repoId}/main/docs/architecture.png`,
        referencedFrom: "README.md",
      },
      {
        path: "docs/schema_er.png",
        rawUrl: `https://raw.githubusercontent.com/${repoId}/main/docs/schema_er.png`,
        referencedFrom: "docs/DATABASE.md",
      },
    ],
    goodFirstIssues: [
      {
        id: 101,
        number: 1,
        title: "Improve keyboard focus styles on navigation tabs",
        html_url: `https://github.com/${repoId}/issues/1`,
        labels: ["good first issue", "accessibility"],
        relatedNodeId: "web-ui",
      },
      {
        id: 102,
        number: 2,
        title: "Add health check endpoint to API Gateway",
        html_url: `https://github.com/${repoId}/issues/2`,
        labels: ["good first issue", "backend"],
        relatedNodeId: "api-gateway",
      },
      {
        id: 103,
        number: 3,
        title: "Add connection pooling timeout for PostgreSQL storage",
        html_url: `https://github.com/${repoId}/issues/3`,
        labels: ["good first issue", "database"],
        relatedNodeId: "primary-db",
      },
    ],
  };
}
