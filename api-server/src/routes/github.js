// QuantumGuard AI — GitHub Routes
// POST /api/github/fetch — fetch repo contents from GitHub API

const express = require("express");
const axios = require("axios");
const router = express.Router();

// File extensions we care about
const ALLOWED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".py"]);

// Directories to exclude
const EXCLUDED_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "__pycache__",
  ".pytest_cache",
  "vendor",
  ".next",
  ".venv",
  "venv",
  "env",
  ".tox",
  "coverage",
  ".nyc_output",
];

const MAX_FILE_SIZE = 500000; // 500KB per file

/**
 * Parse a GitHub URL to extract owner and repo name.
 * Handles:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo/tree/main
 *   github.com/owner/repo
 */
function parseGitHubUrl(url) {
  try {
    // Normalize: strip trailing slashes and .git suffix
    let cleaned = url.trim().replace(/\/+$/, "").replace(/\.git$/, "");

    // Add protocol if missing
    if (!cleaned.startsWith("http")) {
      cleaned = "https://" + cleaned;
    }

    const parsed = new URL(cleaned);
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (parts.length < 2) {
      return null;
    }

    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

/**
 * Get file extension from path
 */
function getExtension(filePath) {
  const dot = filePath.lastIndexOf(".");
  return dot === -1 ? "" : filePath.slice(dot).toLowerCase();
}

/**
 * Detect language from file extension
 */
function detectLanguage(filePath) {
  const ext = getExtension(filePath);
  if (ext === ".py") return "python";
  if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) return "javascript";
  return "unknown";
}

/**
 * Check if a file path is in an excluded directory
 */
function isExcluded(filePath) {
  const parts = filePath.split("/");
  return parts.some((part) => EXCLUDED_DIRS.includes(part));
}

// ── POST /api/github/fetch ──
router.post("/fetch", async (req, res) => {
  try {
    const { repoUrl, token } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: "repoUrl is required" });
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return res.status(400).json({
        error: "Invalid GitHub URL. Expected format: https://github.com/owner/repo",
      });
    }

    const { owner, repo } = parsed;
    const authToken = token || process.env.GITHUB_TOKEN;

    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "QuantumGuard-Scanner",
    };

    if (authToken) {
      headers.Authorization = `token ${authToken}`;
    }

    // Step 1: Get the default branch
    let defaultBranch = "main";
    try {
      const repoInfo = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}`,
        { headers }
      );
      defaultBranch = repoInfo.data.default_branch || "main";
    } catch (err) {
      if (err.response?.status === 404) {
        return res.status(404).json({
          error: `Repository not found: ${owner}/${repo}. Is it private? Add a GitHub token.`,
        });
      }
      if (err.response?.status === 403 || err.response?.status === 429) {
        return res.status(429).json({
          error: "GitHub API rate limit exceeded. Add a GitHub Personal Access Token to increase your limit.",
        });
      }
      throw err;
    }

    // Step 2: Fetch the full file tree
    let tree;
    try {
      const treeRes = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        { headers }
      );
      tree = treeRes.data.tree || [];
    } catch (err) {
      if (err.response?.status === 409) {
        return res.status(400).json({
          error: "Repository is empty — no commits found.",
        });
      }
      throw err;
    }

    // Step 3: Filter tree — keep only relevant code files
    const relevantFiles = tree.filter((item) => {
      if (item.type !== "blob") return false;
      if (isExcluded(item.path)) return false;
      if (!ALLOWED_EXTENSIONS.has(getExtension(item.path))) return false;
      if (item.size && item.size > MAX_FILE_SIZE) return false;
      return true;
    });

    if (relevantFiles.length === 0) {
      return res.status(200).json({
        files: [],
        message: "No scannable files found (supports .js, .jsx, .ts, .tsx, .py)",
        repo: `${owner}/${repo}`,
        totalFilesInRepo: tree.length,
      });
    }

    // Step 4: Fetch content for each relevant file (with concurrency limit)
    const BATCH_SIZE = 10;
    const files = [];

    for (let i = 0; i < relevantFiles.length; i += BATCH_SIZE) {
      const batch = relevantFiles.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const contentRes = await axios.get(
              `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`,
              { headers }
            );

            // Decode base64 content
            const content = Buffer.from(
              contentRes.data.content,
              "base64"
            ).toString("utf-8");

            return {
              path: item.path,
              content,
              language: detectLanguage(item.path),
              size: item.size || content.length,
            };
          } catch {
            return null;
          }
        })
      );

      for (const result of batchResults) {
        if (result.status === "fulfilled" && result.value) {
          files.push(result.value);
        }
      }
    }

    res.json({
      files,
      repo: `${owner}/${repo}`,
      totalFilesInRepo: tree.length,
      relevantFilesFound: relevantFiles.length,
      filesFetched: files.length,
    });
  } catch (err) {
    console.error("GitHub fetch error:", err.message);

    if (err.response?.status === 403 || err.response?.status === 429) {
      return res.status(429).json({
        error: "GitHub API rate limit exceeded. Add a Personal Access Token.",
      });
    }

    res.status(500).json({
      error: "Failed to fetch repository",
      detail: err.message,
    });
  }
});

module.exports = router;
