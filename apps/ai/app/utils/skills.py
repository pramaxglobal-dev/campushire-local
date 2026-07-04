from app.utils.text import normalize_text


_aliases: dict[str, str] = {
    "javascript": "js",
    "typescript": "ts",
    "nodejs": "node",
    "node.js": "node",
    "reactjs": "react",
}


def normalize_skill_name(value: str) -> str:
    normalized = normalize_text(value).replace(" ", "")
    if normalized in _aliases:
        return _aliases[normalized]
    return normalized


def are_skills_equal(left: str, right: str) -> bool:
    return normalize_skill_name(left) == normalize_skill_name(right)
