import re

def redact_pii(text: str) -> str:
    text=re.sub(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", "[EMAIL]", text)
    text=re.sub(r"\\b(?:\\+?91[- ]?)?[6-9]\\d{9}\\b", "[PHONE]", text)
    text=re.sub(r"\\b(?:\\d[ -]*?){13,19}\\b", "[CARD]", text)
    return text
