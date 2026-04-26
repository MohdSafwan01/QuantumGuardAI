"""
QuantumGuard AI — Scanner Engine
AST-based vulnerability scanner for JS/TS and Python files.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

from app.scanner import scanner

# Load env from monorepo root
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

app = FastAPI(
    title="QuantumGuard Scanner Engine",
    description="AST-based quantum vulnerability scanner for JS/TS and Python",
    version="0.2.0",
)

# CORS — allow API server to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ──


class FileScanRequest(BaseModel):
    content: str
    file_path: str
    language: str  # "javascript", "typescript", or "python"


class BulkScanRequest(BaseModel):
    files: list[FileScanRequest] = []


class VulnerabilityResult(BaseModel):
    file: str
    line: int
    vulnerability_type: str
    pattern_matched: str
    severity: str
    confidence: str
    description: str
    quantum_safe_replacement: str = ""
    nist_reference: str = ""


class FileScanResponse(BaseModel):
    file_path: str
    language: str
    vulnerabilities: list[VulnerabilityResult] = []
    vulnerability_count: int = 0
    was_flagged: bool = False


class BulkScanResponse(BaseModel):
    results: list[FileScanResponse] = []
    total_files: int = 0
    total_vulnerabilities: int = 0
    max_severity: str = "NONE"


# ── Endpoints ──


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "quantumguard-scanner-engine", "version": "0.2.0"}


@app.post("/scan/file", response_model=FileScanResponse)
async def scan_single_file(req: FileScanRequest):
    """Scan a single file and return detected vulnerabilities."""
    if not req.content.strip():
        return FileScanResponse(
            file_path=req.file_path,
            language=req.language,
            vulnerabilities=[],
            vulnerability_count=0,
            was_flagged=False,
        )

    if req.language not in ("javascript", "typescript", "python"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {req.language}. Use 'javascript', 'typescript', or 'python'.",
        )

    vulns = scanner.scan_file(req.content, req.file_path, req.language)

    return FileScanResponse(
        file_path=req.file_path,
        language=req.language,
        vulnerabilities=[VulnerabilityResult(**v) for v in vulns],
        vulnerability_count=len(vulns),
        was_flagged=len(vulns) > 0,
    )


@app.post("/scan/bulk", response_model=BulkScanResponse)
async def scan_bulk(req: BulkScanRequest):
    """Scan multiple files at once."""
    results = []
    total_vulns = 0
    severity_order = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "NONE": 0}
    max_sev = "NONE"

    for file_req in req.files:
        if file_req.language not in ("javascript", "typescript", "python"):
            continue

        vulns = scanner.scan_file(file_req.content, file_req.file_path, file_req.language)
        total_vulns += len(vulns)

        # Track max severity
        for v in vulns:
            if severity_order.get(v["severity"], 0) > severity_order.get(max_sev, 0):
                max_sev = v["severity"]

        results.append(
            FileScanResponse(
                file_path=file_req.file_path,
                language=file_req.language,
                vulnerabilities=[VulnerabilityResult(**v) for v in vulns],
                vulnerability_count=len(vulns),
                was_flagged=len(vulns) > 0,
            )
        )

    return BulkScanResponse(
        results=results,
        total_files=len(results),
        total_vulnerabilities=total_vulns,
        max_severity=max_sev,
    )


# Legacy endpoint — backwards compatible
@app.post("/scan")
async def scan_code(payload: dict):
    """Legacy scan endpoint. Use /scan/file or /scan/bulk instead."""
    files = payload.get("files", [])
    if not files:
        return {"message": "No files provided", "files_received": 0}

    all_vulns = []
    for f in files:
        vulns = scanner.scan_file(
            f.get("content", ""),
            f.get("filename", f.get("file_path", "unknown")),
            f.get("language", "javascript"),
        )
        all_vulns.extend(vulns)

    return {
        "files_received": len(files),
        "vulnerabilities": all_vulns,
        "total_vulnerabilities": len(all_vulns),
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("SCANNER_ENGINE_PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
