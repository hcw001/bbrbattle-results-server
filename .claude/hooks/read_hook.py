#!/usr/bin/env python3
import json, re, sys
from pathlib import Path

BLOCKED = [re.compile(p) for p in [
    r"\.env(\..*)?$",
    r"(^|/)docs/combat/(special_types|source)\.md$",
]]

COMPILED = [re.compile(p) for p in BLOCKED_PATTERNS]
def is_blocked(s: str) -> bool:
    try:
        resolved = str(Path(s).resolve())
    except (OSError, ValueError):
        resolved = s
    return any(rx.search(s) or rx.search(resolved) for rx in BLOCKED)

def candidates(name, inp):
    yield from filter(None, [inp.get("file_path"), inp.get("path")])
    if name == "Bash":
        yield inp.get("command", "")

def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0

    tool_name = payload.get("tool_name", "")
    tool_input = payload.get("tool_input") or {}

    for path in candidates(tool_name, tool_input):
        if is_blocked(path):
            print(f"You cannot read '{path}'. Do not attempt to read, edit, or reference this path.", file=sys.stderr)
            return 2

    return 0

if __name__ == "__main__":
    sys.exit(main())