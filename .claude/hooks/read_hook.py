#!/usr/bin/env python3
"""Block Claude from reading sensitive files."""
import json
import re
import sys
from pathlib import Path

# Patterns to block.
BLOCKED_PATTERNS = [
    r"\.env(\..*)?$",
    r"(^|/)docs/combat/(special_types|source)\.md$",
]

COMPILED = [re.compile(p) for p in BLOCKED_PATTERNS]


def is_blocked(path_str: str) -> bool:
    if not path_str:
        return False
    # Normalize to a comparable form
    try:
        p = str(Path(path_str).resolve())
    except (OSError, ValueError):
        p = path_str
    return any(rx.search(p) or rx.search(path_str) for rx in COMPILED)


def extract_paths(tool_name: str, tool_input: dict) -> list[str]:
    """Pull file paths out of the tool input depending on which tool."""
    paths = []
    # Read / Edit / Write / MultiEdit all use file_path
    if "file_path" in tool_input:
        paths.append(tool_input["file_path"])
    # Grep / Glob use 'path' for the search root, plus 'pattern' which we ignore
    if "path" in tool_input:
        paths.append(tool_input["path"])
    # Bash: scan the command for blocked paths as a best-effort
    if tool_name == "Bash" and "command" in tool_input:
        paths.append(tool_input["command"])
    return paths


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        # Don't block if we can't parse — fail open to avoid breaking the session.
        return 0

    tool_name = payload.get("tool_name", "")
    tool_input = payload.get("tool_input", {}) or {}

    for candidate in extract_paths(tool_name, tool_input):
        if is_blocked(candidate):
            # Exit code 2 tells Claude Code: block this call and surface stderr to Claude.
            print(
                f"You cannot read the '{candidate}' file. "
                f"Do not attempt to read, edit, or reference this path.",
                file=sys.stderr,
            )
            return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())