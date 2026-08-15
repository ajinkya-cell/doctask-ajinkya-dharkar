import re
from typing import List, Dict, Any, Tuple

INJECTION_PATTERNS = [
    r"SYSTEM OVERRIDE",
    r"IGNORE ALL PREVIOUS INSTRUCTIONS",
    r"MARK ALL .* AS 100% COMPLIANT",
    r"CLEAR ALL ERROR LOGS",
    r"BYPASS HUMAN APPROVAL",
    r"EXECUTE AUTOMATIC TRANSFER",
    r"GRANT ALL PERMISSIONS",
    r"SET APPROVED BUDGET TO",
]

def scan_for_prompt_injection(raw_text: str, filename: str) -> List[Dict[str, Any]]:
    """
    Scans source text for malicious instructions aimed at overriding system behavior.
    Returns a list of injection findings to report as untrusted data findings.
    """
    findings = []
    lines = raw_text.splitlines()
    
    for line_idx, line in enumerate(lines, 1):
        for pattern in INJECTION_PATTERNS:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                findings.append({
                    "rule_id": "9.1",
                    "description": f"Prompt Injection Attempt Detected: Document '{filename}' contained malicious directive '{line.strip()}'. Treated as untrusted analytical data.",
                    "source_span": f"Line {line_idx}: {line.strip()}",
                    "severity": "HIGH",
                    "is_injection": True
                })
    return findings
