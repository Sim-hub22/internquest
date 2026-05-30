import re
import zlib
from pathlib import Path


SOURCE = Path("docs/modelling-diagrams-plantuml.md")
OUT = Path("docs/modelling-diagrams-plantuml-preview.md")

ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"


def encode6bit(value: int) -> str:
    if 0 <= value < 64:
        return ALPHABET[value]
    raise ValueError(value)


def append3bytes(b1: int, b2: int, b3: int) -> str:
    c1 = b1 >> 2
    c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
    c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
    c4 = b3 & 0x3F
    return "".join(encode6bit(c) for c in (c1, c2, c3, c4))


def plantuml_encode(text: str) -> str:
    compressed = zlib.compress(text.encode("utf-8"), 9)[2:-4]
    result = []
    for i in range(0, len(compressed), 3):
        chunk = compressed[i : i + 3]
        if len(chunk) == 3:
            result.append(append3bytes(chunk[0], chunk[1], chunk[2]))
        elif len(chunk) == 2:
            result.append(append3bytes(chunk[0], chunk[1], 0))
        else:
            result.append(append3bytes(chunk[0], 0, 0))
    return "".join(result)


def main() -> None:
    source = SOURCE.read_text(encoding="utf-8")
    lines = source.splitlines()

    output = [
        "# InternQuest PlantUML Diagram Previews",
        "",
        "This file uses the original PlantUML codes from `modelling-diagrams-plantuml.md`.",
        "Each preview is rendered through the public PlantUML server URL.",
        "",
    ]

    current_section = ""
    current_title = ""
    in_code = False
    code_lines = []

    for line in lines:
        if line.startswith("## "):
            current_section = line
            output.append(line)
            output.append("")
            continue

        if line.startswith("### "):
            current_title = line
            continue

        if line.strip() == "```plantuml":
            in_code = True
            code_lines = []
            continue

        if in_code and line.strip() == "```":
            in_code = False
            code = "\n".join(code_lines)
            encoded = plantuml_encode(code)
            url = f"https://www.plantuml.com/plantuml/svg/{encoded}"
            output.append(current_title)
            output.append("")
            output.append(f"![{current_title.replace('#', '').strip()}]({url})")
            output.append("")
            output.append("```plantuml")
            output.extend(code_lines)
            output.append("```")
            output.append("")
            continue

        if in_code:
            code_lines.append(line)

    OUT.write_text("\n".join(output), encoding="utf-8")


if __name__ == "__main__":
    main()
