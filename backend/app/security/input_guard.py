import re

INJECTION_PATTERNS = [
    r"ignore (all|any|the) previous instructions",
    r"reveal (the )?(system|developer) prompt",
    r"follow these instructions instead",
    r"disregard (the )?(system|developer) message",
]

def detect_prompt_injection(text: str) -> bool:
    low=text.lower()
    return any(re.search(p,low) for p in INJECTION_PATTERNS)

def sanitize_customer_text(text: str) -> str:
    return text.replace("\\x00", " ").strip()
