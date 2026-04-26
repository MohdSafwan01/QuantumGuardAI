"""
Pydantic models for scanner request/response schemas.
"""

from pydantic import BaseModel


class FilePayload(BaseModel):
    filename: str
    content: str
    language: str  # "javascript", "typescript", or "python"


class ScanRequest(BaseModel):
    repo_url: str | None = None
    files: list[FilePayload] = []


class Vulnerability(BaseModel):
    file: str
    line: int
    pattern: str
    severity: str  # "critical", "high", "medium", "low"
    description: str


class ScanResponse(BaseModel):
    scan_id: str
    vulnerabilities: list[Vulnerability] = []
    files_scanned: int = 0
    status: str = "completed"
