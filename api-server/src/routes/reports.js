// QuantumGuard AI — Report Routes
// GET /api/reports      — list all scans for a user
// GET /api/reports/:id  — full report for a specific scan

const express = require("express");
const supabase = require("../config/supabase");
const router = express.Router();

const SEVERITY_ORDER = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };

// ──────────────────────────────────────────────
// GET /api/reports — list all scan summaries for a user
// ──────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId query parameter is required" });
    }

    // Fetch all scans for user (newest first), no vulnerability details
    const { data: scans, error } = await supabase
      .from("scans")
      .select("id, source_type, source_label, language, status, total_files_scanned, total_vulnerabilities, max_severity, created_at, completed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Reports list error:", error.message);
      return res.status(500).json({ error: "Failed to fetch reports", detail: error.message });
    }

    res.json({
      reports: scans || [],
      total: (scans || []).length,
    });
  } catch (err) {
    console.error("Reports error:", err.message);
    res.status(500).json({ error: "Failed to fetch reports", detail: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /api/reports/:id — full report with vulnerabilities
// ──────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    const { id } = req.params;

    // Fetch scan record
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .select("*")
      .eq("id", id)
      .single();

    if (scanError || !scan) {
      return res.status(404).json({ error: "Report not found" });
    }

    // Fetch all vulnerabilities for this scan
    const { data: vulnerabilities } = await supabase
      .from("vulnerabilities")
      .select("*")
      .eq("scan_id", id);

    // Sort vulnerabilities: CRITICAL first, then HIGH, MEDIUM, LOW
    const sortedVulns = (vulnerabilities || []).sort((a, b) => {
      const severityDiff = (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0);
      if (severityDiff !== 0) return severityDiff;
      return (a.line_number || 0) - (b.line_number || 0);
    });

    // Parse AI suggestions from JSON strings
    for (const v of sortedVulns) {
      if (v.ai_fix_suggestion && typeof v.ai_fix_suggestion === "string") {
        try {
          v.ai_fix_suggestion = JSON.parse(v.ai_fix_suggestion);
        } catch {
          // Keep as string if parsing fails
        }
      }
    }

    // Fetch scan files summary
    const { data: scanFiles } = await supabase
      .from("scan_files")
      .select("*")
      .eq("scan_id", id);

    // Build severity breakdown
    const severityBreakdown = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    for (const v of sortedVulns) {
      if (severityBreakdown[v.severity] !== undefined) {
        severityBreakdown[v.severity]++;
      }
    }

    // Group vulnerabilities by file
    const vulnsByFile = {};
    for (const v of sortedVulns) {
      if (!vulnsByFile[v.file_path]) {
        vulnsByFile[v.file_path] = [];
      }
      vulnsByFile[v.file_path].push(v);
    }

    res.json({
      scan,
      vulnerabilities: sortedVulns,
      scanFiles: scanFiles || [],
      summary: {
        totalFiles: scan.total_files_scanned,
        totalVulnerabilities: scan.total_vulnerabilities,
        maxSeverity: scan.max_severity,
        status: scan.status,
        flaggedFiles: (scanFiles || []).filter((f) => f.was_flagged).length,
        cleanFiles: (scanFiles || []).filter((f) => !f.was_flagged).length,
        severityBreakdown,
      },
      vulnsByFile,
    });
  } catch (err) {
    console.error("Report fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch report", detail: err.message });
  }
});

module.exports = router;
