import re


_whitespace_re = re.compile(r"\s+")
_non_word_re = re.compile(r"[^a-z0-9\s\-]")


def normalize_text(value: str) -> str:
    lowered = value.lower().strip()
    cleaned = _non_word_re.sub(" ", lowered)
    return _whitespace_re.sub(" ", cleaned).strip()


def tokenize(value: str) -> list[str]:
    normalized = normalize_text(value)
    if not normalized:
        return []
    return [token for token in normalized.split(" ") if token]
