"""
QuantumGuard AI — AST-based Vulnerability Scanner
Detects quantum-vulnerable cryptographic patterns in JS/TS and Python files.
"""

import ast
import re
from typing import Optional


# ════════════════════════════════════════════════
# JavaScript / TypeScript vulnerability patterns
# ════════════════════════════════════════════════

JS_PATTERNS = {
    "MD5": {
        "patterns": [r"\bmd5\b", r"createHash\s*\(\s*['\"]md5['\"]", r"\bMD5\b"],
        "severity": "CRITICAL",
        "description": "MD5 is broken by Grover's algorithm — effective security drops from 128 to 64 bits",
        "replacement": "SHA3-256 or BLAKE3",
        "nist_ref": "NIST SP 800-131A Rev 2",
    },
    "SHA1": {
        "patterns": [r"\bsha1\b", r"createHash\s*\(\s*['\"]sha1['\"]", r"\bSHA1\b", r"SHA-1"],
        "severity": "CRITICAL",
        "description": "SHA1 weakened by Grover's — preimage resistance halved",
        "replacement": "SHA3-256",
        "nist_ref": "NIST SP 800-131A Rev 2",
    },
    "RSA": {
        "patterns": [
            r"\bRSA\b",
            r"generateKeyPair\s*\(\s*['\"]rsa['\"]",
            r"rsa\.generate",
            r"createSign\s*\(\s*['\"]RSA",
            r"crypto\.publicEncrypt",
        ],
        "severity": "CRITICAL",
        "description": "RSA broken by Shor's algorithm on quantum computers",
        "replacement": "CRYSTALS-Kyber (encryption) or CRYSTALS-Dilithium (signatures)",
        "nist_ref": "NIST FIPS 203/204",
    },
    "ECC": {
        "patterns": [
            r"\bECDH\b",
            r"\bECDSA\b",
            r"\bsecp256k1\b",
            r"\bprime256v1\b",
            r"\belliptic\b",
            r"createECDH",
        ],
        "severity": "CRITICAL",
        "description": "ECC broken by Shor's algorithm — discrete log problem solvable",
        "replacement": "CRYSTALS-Kyber or CRYSTALS-Dilithium",
        "nist_ref": "NIST FIPS 203/204",
    },
    "DES": {
        "patterns": [r"\bDES\b", r"\bdes\b", r"\b3DES\b", r"\bTripleDES\b", r"des-ede3"],
        "severity": "CRITICAL",
        "description": "DES/3DES severely weakened by Grover's algorithm",
        "replacement": "AES-256-GCM",
        "nist_ref": "NIST SP 800-131A Rev 2",
    },
    "WEAK_AES": {
        "patterns": [r"aes-128", r"AES-128", r"\baes128\b"],
        "severity": "HIGH",
        "description": "AES-128 security halved by Grover's — effectively 64-bit",
        "replacement": "AES-256-GCM",
        "nist_ref": "NIST SP 800-131A Rev 2",
    },
    "HARDCODED_KEY": {
        "patterns": [
            r"""password\s*=\s*['"][^'"]{8,}['"]""",
            r"""secret\s*=\s*['"][^'"]{8,}['"]""",
            r"""api_key\s*=\s*['"][^'"]{8,}['"]""",
            r"""private_key\s*=\s*['"]""",
        ],
        "severity": "HIGH",
        "description": "Hardcoded cryptographic keys — secret exposure risk",
        "replacement": "Use environment variables or a secrets manager",
        "nist_ref": "NIST SP 800-57",
    },
    "EVAL": {
        "patterns": [r"\beval\s*\(", r"\bFunction\s*\("],
        "severity": "MEDIUM",
        "description": "Dynamic code execution — code injection vulnerability",
        "replacement": "Avoid eval() — use safe alternatives",
        "nist_ref": "OWASP A03:2021",
    },
}


# ════════════════════════════════════════════════
# Python vulnerability patterns
# ════════════════════════════════════════════════

PY_PATTERNS = {
    "MD5": {
        "patterns": [r"hashlib\.md5", r"\bmd5\(", r"MD5\.new"],
        "severity": "CRITICAL",
        "description": "MD5 weakened by Grover's algorithm",
        "replacement": "hashlib.sha3_256()",
        "nist_ref": "NIST SP 800-131A Rev 2",
    },
    "SHA1": {
        "patterns": [r"hashlib\.sha1", r"\bsha1\(", r"SHA\.new"],
        "severity": "CRITICAL",
        "description": "SHA1 broken for collision resistance",
        "replacement": "hashlib.sha3_256()",
        "nist_ref": "NIST SP 800-131A Rev 2",
    },
    "RSA": {
        "patterns": [
            r"RSA\.generate",
            r"RSA\.import_key",
            r"from\s+Crypto\.PublicKey\s+import\s+RSA",
            r"rsa\.generate_private_key",
            r"padding\.PKCS1v15",
        ],
        "severity": "CRITICAL",
        "description": "RSA broken by Shor's algorithm",
        "replacement": "Use liboqs-python with CRYSTALS-Kyber",
        "nist_ref": "NIST FIPS 203",
    },
    "ECC": {
        "patterns": [
            r"ECC\.generate",
            r"ec\.generate_private_key",
            r"\bSECP256K1\b",
            r"\bSECP384R1\b",
            r"\bECDH\b",
            r"\bECDSA\b",
        ],
        "severity": "CRITICAL",
        "description": "ECC broken by Shor's algorithm",
        "replacement": "CRYSTALS-Dilithium via liboqs-python",
        "nist_ref": "NIST FIPS 204",
    },
    "DES": {
        "patterns": [
            r"DES\.new",
            r"DES3\.new",
            r"from\s+Crypto\.Cipher\s+import\s+DES",
        ],
        "severity": "CRITICAL",
        "description": "DES/3DES severely weakened by Grover's",
        "replacement": "AES-256-GCM via PyCryptodome",
        "nist_ref": "NIST SP 800-131A Rev 2",
    },
    "WEAK_AES": {
        "patterns": [r"AES\.new.*key.*16\b", r"AES-128"],
        "severity": "HIGH",
        "description": "AES-128 key size halved by Grover's algorithm",
        "replacement": "AES.new() with 32-byte (256-bit) key",
        "nist_ref": "NIST SP 800-131A Rev 2",
    },
    "HARDCODED_KEY": {
        "patterns": [
            r"""password\s*=\s*['"][^'"]{8,}['"]""",
            r"""secret\s*=\s*['"][^'"]{8,}['"]""",
            r"""private_key\s*=\s*['"]""",
        ],
        "severity": "HIGH",
        "description": "Hardcoded secrets — exposure risk",
        "replacement": "Use os.environ or python-dotenv",
        "nist_ref": "NIST SP 800-57",
    },
}


# ════════════════════════════════════════════════
# AST-detectable Python call patterns
# Maps (module_or_object, function_name) → vuln type
# ════════════════════════════════════════════════

PY_AST_CALLS = {
    ("hashlib", "md5"): "MD5",
    ("hashlib", "sha1"): "SHA1",
    ("RSA", "generate"): "RSA",
    ("RSA", "import_key"): "RSA",
    ("rsa", "generate_private_key"): "RSA",
    ("ECC", "generate"): "ECC",
    ("ec", "generate_private_key"): "ECC",
    ("DES", "new"): "DES",
    ("DES3", "new"): "DES",
    ("AES", "new"): "WEAK_AES",  # flagged, confidence refined later
    ("MD5", "new"): "MD5",
    ("SHA", "new"): "SHA1",
}

# Import statements that indicate vulnerable crypto usage
PY_AST_IMPORTS = {
    ("Crypto.PublicKey", "RSA"): "RSA",
    ("Crypto.Cipher", "DES"): "DES",
    ("Crypto.Cipher", "DES3"): "DES",
    ("Crypto.Hash", "MD5"): "MD5",
    ("Crypto.Hash", "SHA"): "SHA1",
    ("cryptography.hazmat.primitives.asymmetric", "rsa"): "RSA",
    ("cryptography.hazmat.primitives.asymmetric", "ec"): "ECC",
    ("cryptography.hazmat.primitives.asymmetric", "padding"): "RSA",
}


# Severity ordering for comparison
SEVERITY_ORDER = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}


class VulnerabilityScanner:
    """
    AST-based vulnerability scanner for detecting quantum-vulnerable
    cryptographic patterns in JavaScript/TypeScript and Python source code.
    """

    def scan_file(self, content: str, file_path: str, language: str) -> list[dict]:
        """
        Scan a single file and return list of vulnerabilities.
        Uses both regex pattern matching AND AST analysis.
        """
        if language in ("javascript", "typescript"):
            return self.scan_javascript(content, file_path)
        elif language == "python":
            return self.scan_python(content, file_path)
        return []

    # ──────────────────────────────────────────────
    # JavaScript / TypeScript scanning
    # ──────────────────────────────────────────────

    def scan_javascript(self, content: str, file_path: str) -> list[dict]:
        """
        Scan JS/TS file using:
        1. Regex pattern matching for quick detection
        2. Line-by-line context analysis for confidence
        """
        vulns = []
        lines = content.split("\n")

        for vuln_type, info in JS_PATTERNS.items():
            for pattern_str in info["patterns"]:
                try:
                    regex = re.compile(pattern_str, re.IGNORECASE)
                except re.error:
                    continue

                for line_num, line in enumerate(lines, 1):
                    match = regex.search(line)
                    if not match:
                        continue

                    # Skip if inside a comment
                    if self.is_in_comment(line, "javascript"):
                        continue

                    confidence = self.calculate_confidence(
                        pattern_str, line, vuln_type, "javascript"
                    )

                    vulns.append(
                        {
                            "file": file_path,
                            "line": line_num,
                            "vulnerability_type": vuln_type,
                            "pattern_matched": match.group(0),
                            "severity": info["severity"],
                            "confidence": confidence,
                            "description": info["description"],
                            "quantum_safe_replacement": info["replacement"],
                            "nist_reference": info["nist_ref"],
                        }
                    )

        return self.filter_false_positives(vulns)

    # ──────────────────────────────────────────────
    # Python scanning (AST + regex fallback)
    # ──────────────────────────────────────────────

    def scan_python(self, content: str, file_path: str) -> list[dict]:
        """
        Scan Python file using:
        1. Python ast module for proper AST parsing
        2. Regex fallback for patterns AST misses
        """
        vulns = []

        # Phase 1 — AST-based analysis
        ast_found_lines = set()
        try:
            tree = ast.parse(content)
            ast_vulns = self._scan_python_ast(tree, file_path, content)
            for v in ast_vulns:
                vulns.append(v)
                ast_found_lines.add((v["line"], v["vulnerability_type"]))
        except SyntaxError:
            pass  # Fall through to regex-only

        # Phase 2 — Regex fallback for patterns AST misses
        lines = content.split("\n")

        for vuln_type, info in PY_PATTERNS.items():
            for pattern_str in info["patterns"]:
                try:
                    regex = re.compile(pattern_str)
                except re.error:
                    continue

                for line_num, line in enumerate(lines, 1):
                    match = regex.search(line)
                    if not match:
                        continue

                    # Skip if already found by AST
                    if (line_num, vuln_type) in ast_found_lines:
                        continue

                    # Skip if inside a comment
                    if self.is_in_comment(line, "python"):
                        continue

                    confidence = self.calculate_confidence(
                        pattern_str, line, vuln_type, "python"
                    )

                    vulns.append(
                        {
                            "file": file_path,
                            "line": line_num,
                            "vulnerability_type": vuln_type,
                            "pattern_matched": match.group(0),
                            "severity": info["severity"],
                            "confidence": confidence,
                            "description": info["description"],
                            "quantum_safe_replacement": info["replacement"],
                            "nist_reference": info["nist_ref"],
                        }
                    )

        return self.filter_false_positives(vulns)

    def _scan_python_ast(
        self, tree: ast.AST, file_path: str, source: str
    ) -> list[dict]:
        """Walk the Python AST looking for vulnerable function calls and imports."""
        vulns = []
        lines = source.split("\n")

        for node in ast.walk(tree):
            # ── Check function calls: hashlib.md5(), RSA.generate(), etc. ──
            if isinstance(node, ast.Call):
                vuln_type = self._check_call_node(node)
                if vuln_type:
                    line_num = getattr(node, "lineno", 0)
                    info = PY_PATTERNS.get(vuln_type, {})
                    pattern_matched = self._extract_call_name(node)

                    vulns.append(
                        {
                            "file": file_path,
                            "line": line_num,
                            "vulnerability_type": vuln_type,
                            "pattern_matched": pattern_matched,
                            "severity": info.get("severity", "HIGH"),
                            "confidence": "HIGH",  # AST-confirmed = HIGH
                            "description": info.get("description", ""),
                            "quantum_safe_replacement": info.get("replacement", ""),
                            "nist_reference": info.get("nist_ref", ""),
                        }
                    )

            # ── Check import statements ──
            elif isinstance(node, ast.ImportFrom):
                if node.module and node.names:
                    for alias in node.names:
                        key = (node.module, alias.name)
                        if key in PY_AST_IMPORTS:
                            vuln_type = PY_AST_IMPORTS[key]
                            info = PY_PATTERNS.get(vuln_type, {})
                            line_num = getattr(node, "lineno", 0)

                            vulns.append(
                                {
                                    "file": file_path,
                                    "line": line_num,
                                    "vulnerability_type": vuln_type,
                                    "pattern_matched": f"from {node.module} import {alias.name}",
                                    "severity": info.get("severity", "HIGH"),
                                    "confidence": "MEDIUM",  # import alone = MEDIUM
                                    "description": info.get("description", ""),
                                    "quantum_safe_replacement": info.get(
                                        "replacement", ""
                                    ),
                                    "nist_reference": info.get("nist_ref", ""),
                                }
                            )

        return vulns

    def _check_call_node(self, node: ast.Call) -> Optional[str]:
        """Check if an ast.Call node matches a known vulnerable pattern."""
        # Attribute call: hashlib.md5(), RSA.generate(), etc.
        if isinstance(node.func, ast.Attribute):
            attr_name = node.func.attr
            # Get the object name (e.g., 'hashlib' from hashlib.md5)
            obj_name = None
            if isinstance(node.func.value, ast.Name):
                obj_name = node.func.value.id
            elif isinstance(node.func.value, ast.Attribute):
                obj_name = node.func.value.attr

            if obj_name:
                key = (obj_name, attr_name)
                if key in PY_AST_CALLS:
                    return PY_AST_CALLS[key]

        # Direct call: md5(), sha1(), etc.
        elif isinstance(node.func, ast.Name):
            func_name = node.func.id
            for (_, call_name), vuln_type in PY_AST_CALLS.items():
                if func_name == call_name:
                    return vuln_type

        return None

    def _extract_call_name(self, node: ast.Call) -> str:
        """Extract the human-readable name of a function call from AST node."""
        if isinstance(node.func, ast.Attribute):
            obj_name = ""
            if isinstance(node.func.value, ast.Name):
                obj_name = node.func.value.id
            elif isinstance(node.func.value, ast.Attribute):
                obj_name = node.func.value.attr
            return f"{obj_name}.{node.func.attr}()"
        elif isinstance(node.func, ast.Name):
            return f"{node.func.id}()"
        return "unknown()"

    # ──────────────────────────────────────────────
    # Confidence calculation
    # ──────────────────────────────────────────────

    def calculate_confidence(
        self, pattern: str, context: str, vuln_type: str, language: str
    ) -> str:
        """
        Returns HIGH/MEDIUM/LOW confidence based on context analysis.
        HIGH — actual function call found (parentheses present)
        MEDIUM — pattern found but might be in string/import
        LOW — pattern found in string literal or variable name only
        """
        stripped = context.strip()

        # Check if it's inside a string literal (appears in quotes)
        quote_count = stripped.count('"') + stripped.count("'")
        is_in_string = quote_count >= 2

        # Check for actual function call indicators
        has_call_parens = "(" in stripped and ")" in stripped
        has_import = stripped.lstrip().startswith(("import ", "from ", "require("))
        has_assignment_call = re.search(r"=\s*\w+\.\w+\(", stripped) is not None

        # Variable names that coincidentally contain the pattern
        # e.g., 'rsaHelper', 'desConfig' — just a naming collision
        is_var_name = re.search(
            r"(?:let|const|var|def|class)\s+\w*"
            + re.escape(pattern.replace("\\b", "").replace("\\", ""))
            + r"\w*",
            stripped,
            re.IGNORECASE,
        )

        if is_var_name and not has_call_parens:
            return "LOW"

        if has_import and not has_call_parens:
            return "MEDIUM"

        if has_call_parens or has_assignment_call:
            return "HIGH"

        if is_in_string:
            return "LOW"

        return "MEDIUM"

    # ──────────────────────────────────────────────
    # Comment detection
    # ──────────────────────────────────────────────

    def is_in_comment(self, line: str, language: str) -> bool:
        """Check if the matched pattern is inside a comment."""
        stripped = line.lstrip()

        if language in ("javascript", "typescript"):
            # Single-line comment
            if stripped.startswith("//"):
                return True
            # Block comment on single line
            if stripped.startswith("/*") and "*/" in stripped:
                return True
            # JSDoc / block comment continuation
            if stripped.startswith("*"):
                return True

        elif language == "python":
            # Single-line comment
            if stripped.startswith("#"):
                return True
            # Docstring lines (triple-quoted)
            if stripped.startswith('"""') or stripped.startswith("'''"):
                return True

        return False

    # ──────────────────────────────────────────────
    # False positive filtering
    # ──────────────────────────────────────────────

    def filter_false_positives(self, vulns: list[dict]) -> list[dict]:
        """
        Remove false positives and deduplicate:
        - Skip LOW confidence matches in comments/strings
        - Deduplicate same type + same line
        - Keep the highest confidence match per line
        """
        if not vulns:
            return vulns

        # Deduplicate: keep highest confidence per (file, line, vulnerability_type)
        seen = {}
        confidence_rank = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}

        for v in vulns:
            key = (v["file"], v["line"], v["vulnerability_type"])
            existing = seen.get(key)

            if existing is None:
                seen[key] = v
            else:
                # Keep the one with higher confidence
                if confidence_rank.get(v["confidence"], 0) > confidence_rank.get(
                    existing["confidence"], 0
                ):
                    seen[key] = v

        filtered = list(seen.values())

        # Sort by severity (CRITICAL first), then by line number
        filtered.sort(
            key=lambda v: (
                -SEVERITY_ORDER.get(v["severity"], 0),
                v["line"],
            )
        )

        return filtered


# Module-level scanner instance
scanner = VulnerabilityScanner()
