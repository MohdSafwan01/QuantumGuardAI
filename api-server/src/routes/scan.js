// QuantumGuard AI — Scan Routes
// POST /api/scan    — trigger a scan
// GET  /api/scan/:id — get scan results

const express = require("express");
const axios = require("axios");
const supabase = require("../config/supabase");
const groq = require("../config/groq");
const router = express.Router();

const SCANNER_URL = process.env.SCANNER_ENGINE_URL || '';
const SEVERITY_ORDER = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };

// ──────────────────────────────────────────────
// POST /api/scan — trigger a scan
// ──────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const { sourceType, sourceLabel, files, userId } = req.body;

    // Validate input
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "No files provided for scanning" });
    }

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    // Detect primary language
    const langCounts = {};
    for (const f of files) {
      const lang = f.language || "javascript";
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    }
    const languages = Object.keys(langCounts);
    const primaryLanguage =
      languages.length > 1
        ? "mixed"
        : languages[0] || "javascript";

    // Step 1: Create scan record with status 'scanning'
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .insert({
        user_id: userId,
        source_type: sourceType || "snippet",
        source_label: sourceLabel || "Code scan",
        language: primaryLanguage,
        status: "scanning",
        total_files_scanned: 0,
        total_vulnerabilities: 0,
      })
      .select()
      .single();

    if (scanError) {
      console.error("Failed to create scan:", scanError);
      return res.status(500).json({ error: "Failed to create scan record", detail: scanError.message });
    }

    const scanId = scan.id;

    // Return scanId immediately — process in background
    res.json({ scanId, status: "scanning", message: "Scan started" });

    // ── Background processing ──
    processScan(scanId, files, userId).catch((err) => {
      console.error(`Scan ${scanId} failed:`, err.message);
      // Update scan status to error
      if (supabase) {
        supabase
          .from("scans")
          .update({ status: "error" })
          .eq("id", scanId)
          .then(() => {});
      }
    });
  } catch (err) {
    console.error("Scan creation error:", err.message);
    res.status(500).json({ error: "Failed to start scan", detail: err.message });
  }
});

// ──────────────────────────────────────────────
// Background scan processing
// ──────────────────────────────────────────────
async function processScan(scanId, files, userId) {
  let totalVulns = 0;
  let maxSeverity = "NONE";
  const allVulnerabilities = [];

  // Step 2: Scan each file via scanner-engine
  for (const file of files) {
    let scanResult;

    try {
      const response = await axios.post(`${SCANNER_URL}/scan/file`, {
        content: file.content,
        file_path: file.path,
        language: file.language || "javascript",
      });
      scanResult = response.data;
    } catch (err) {
      console.error(`Scanner error for ${file.path}:`, err.message);
      scanResult = {
        file_path: file.path,
        language: file.language,
        vulnerabilities: [],
        vulnerability_count: 0,
        was_flagged: false,
      };
    }

    // Save scan_file record
    if (supabase) {
      await supabase.from("scan_files").insert({
        scan_id: scanId,
        file_path: file.path,
        language: file.language || "javascript",
        was_flagged: scanResult.was_flagged,
        vulnerability_count: scanResult.vulnerability_count,
      });
    }

    // Collect vulnerabilities
    if (scanResult.vulnerabilities && scanResult.vulnerabilities.length > 0) {
      for (const vuln of scanResult.vulnerabilities) {
        totalVulns++;

        // Track max severity
        if ((SEVERITY_ORDER[vuln.severity] || 0) > (SEVERITY_ORDER[maxSeverity] || 0)) {
          maxSeverity = vuln.severity;
        }

        // Get code context (3 lines around the vulnerability)
        const lines = file.content.split("\n");
        const lineIdx = (vuln.line || 1) - 1;
        const contextStart = Math.max(0, lineIdx - 1);
        const contextEnd = Math.min(lines.length, lineIdx + 2);
        const codeContext = lines.slice(contextStart, contextEnd).join("\n");

        // Step 3: Call Groq AI for fix suggestion
        let aiFixSuggestion = null;
        try {
          aiFixSuggestion = await getAIFixSuggestion(
            file.path,
            vuln.line,
            vuln.vulnerability_type,
            vuln.pattern_matched,
            codeContext
          );
        } catch (aiErr) {
          console.error("AI suggestion error:", aiErr.message);
        }

        allVulnerabilities.push({
          scan_id: scanId,
          file_path: vuln.file || file.path,
          line_number: vuln.line,
          vulnerability_type: vuln.vulnerability_type,
          pattern_matched: vuln.pattern_matched,
          severity: vuln.severity,
          confidence: vuln.confidence || "MEDIUM",
          description: vuln.description,
          ai_fix_suggestion: aiFixSuggestion ? JSON.stringify(aiFixSuggestion) : null,
          nist_reference: vuln.nist_reference || "",
          quantum_safe_replacement: vuln.quantum_safe_replacement || "",
        });
      }
    }
  }

  // Step 4: Batch insert all vulnerabilities
  if (supabase && allVulnerabilities.length > 0) {
    // Insert in batches of 50
    for (let i = 0; i < allVulnerabilities.length; i += 50) {
      const batch = allVulnerabilities.slice(i, i + 50);
      const { error } = await supabase.from("vulnerabilities").insert(batch);
      if (error) {
        console.error("Failed to insert vulnerabilities batch:", error.message);
      }
    }
  }

  // Step 5: Update scan record to complete
  if (supabase) {
    await supabase
      .from("scans")
      .update({
        status: "complete",
        total_files_scanned: files.length,
        total_vulnerabilities: totalVulns,
        max_severity: maxSeverity,
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanId);
  }

  console.log(
    `✅ Scan ${scanId} complete: ${files.length} files, ${totalVulns} vulnerabilities, max severity: ${maxSeverity}`
  );
}

// ──────────────────────────────────────────────
// Groq AI fix suggestion
// ──────────────────────────────────────────────
async function getAIFixSuggestion(filePath, lineNumber, vulnerabilityType, patternMatched, codeContext) {
  if (!groq) {
    return null;
  }

  const prompt = `You are a quantum-safe cryptography expert.
A vulnerability was detected in ${filePath} at line ${lineNumber}.

Vulnerability: ${vulnerabilityType}
Pattern found: ${patternMatched}
Code context:
${codeContext}

Provide a fix recommendation in this exact JSON format:
{
  "fix_summary": "one sentence explaining the fix",
  "code_before": "the vulnerable code snippet",
  "code_after": "the quantum-safe replacement code",
  "explanation": "2-3 sentences explaining why this is safer",
  "migration_effort": "LOW|MEDIUM|HIGH",
  "nist_standard": "the specific NIST PQC standard reference"
}
Return ONLY valid JSON. No markdown, no explanation outside JSON.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) return null;

    // Parse JSON — handle cases where model wraps in markdown code blocks
    let jsonStr = responseText;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Groq parse error:", err.message);
    return null;
  }
}

// ──────────────────────────────────────────────
// GET /api/scan/:id — get scan results
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
      return res.status(404).json({ error: "Scan not found" });
    }

    // Fetch vulnerabilities
    const { data: vulnerabilities } = await supabase
      .from("vulnerabilities")
      .select("*")
      .eq("scan_id", id)
      .order("severity", { ascending: true });

    // Sort: CRITICAL first, then HIGH, MEDIUM, LOW
    const sortedVulns = (vulnerabilities || []).sort((a, b) => {
      return (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0);
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
      },
    });
  } catch (err) {
    console.error("Scan fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch scan results", detail: err.message });
  }
});

module.exports = router;
