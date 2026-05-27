#!/usr/bin/env bash
# Build the middle report: merge markdown docs into a single DOCX
# with PlantUML diagrams rendered as embedded PNG images.
#
# Usage: bash scripts/build-report-middle.sh
#
# Prerequisites (auto-downloaded if missing):
#   - pandoc (must be installed manually)
#   - java (for plantuml.jar)
#   - graphviz / dot (for plantuml rendering)

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="$REPO_ROOT/.cache/plantuml"
OUTPUT_DIR="$REPO_ROOT/docs/report/final"
OUTPUT_FILE="$OUTPUT_DIR/report.docx"
MEDIA_DIR="$OUTPUT_DIR/media"

# Load shared tool versions / URLs / checksums
# shellcheck source=plantuml-tools.conf
source "$SCRIPT_DIR/plantuml-tools.conf"

PLANTUML_JAR="$CACHE_DIR/plantuml-$PLANTUML_VERSION.jar"
DIAGRAM_LUA="$CACHE_DIR/diagram-$DIAGRAM_LUA_VERSION.lua"

# ── Helpers ───────────────────────────────────────────────────────────
info()  { printf '\033[1;34m[info]\033[0m  %s\n' "$*"; }
error() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; }

check_command() {
    if ! command -v "$1" &>/dev/null; then
        error "$1 is required but not installed."
        exit 1
    fi
}

# Download a file with SHA-256 verification and atomic rename.
# Usage: download_verified <url> <dest_path> <expected_sha256> <label>
download_verified() {
    local url="$1" dest="$2" expected_sha="$3" label="$4"
    if [[ -f "$dest" ]]; then
        return
    fi
    info "Downloading $label ..."
    mkdir -p "$(dirname "$dest")"
    local tmp="$dest.tmp.$$"
    curl -fSL "$url" -o "$tmp"
    local actual_sha
    actual_sha="$(sha256sum "$tmp" | awk '{print $1}')"
    if [[ "$actual_sha" != "$expected_sha" ]]; then
        rm -f "$tmp"
        error "Checksum mismatch for $label!"
        error "  expected: $expected_sha"
        error "  got:      $actual_sha"
        exit 1
    fi
    mv "$tmp" "$dest"
    info "Verified & cached → $dest"
}

# ── Preflight checks ─────────────────────────────────────────────────
check_command pandoc
check_command java
check_command dot

download_verified "$PLANTUML_JAR_URL" "$PLANTUML_JAR" \
    "$PLANTUML_JAR_SHA256" "plantuml-$PLANTUML_VERSION.jar"
download_verified "$DIAGRAM_LUA_URL" "$DIAGRAM_LUA" \
    "$DIAGRAM_LUA_SHA256" "diagram.lua v$DIAGRAM_LUA_VERSION"

# ── Collect input files (natural sort) ────────────────────────────────
INPUT_FILES=()
INPUT_FILES+=("$REPO_ROOT/docs/overview.md")
INPUT_FILES+=("$REPO_ROOT/docs/firmware.md")
INPUT_FILES+=("$REPO_ROOT/docs/usecases/analyze.md")

# Sort UC-*.md by filename (natural order: UC-01, UC-02, ... UC-12)
while IFS= read -r f; do
    INPUT_FILES+=("$f")
done < <(find "$REPO_ROOT/docs/usecases" -name 'UC-*.md' | sort)

info "Input files (${#INPUT_FILES[@]}):"
for f in "${INPUT_FILES[@]}"; do
    printf '  %s\n' "${f#"$REPO_ROOT/"}"
done

# ── Build ─────────────────────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR" "$MEDIA_DIR"

# Create a wrapper script so diagram.lua can invoke plantuml as a single
# executable (pandoc.pipe requires a real command, not "java -jar ...").
PLANTUML_WRAPPER="$CACHE_DIR/plantuml"
cat > "$PLANTUML_WRAPPER" <<WRAPPER
#!/usr/bin/env bash
exec java -jar "$PLANTUML_JAR" "\$@"
WRAPPER
chmod +x "$PLANTUML_WRAPPER"

info "Building report → $OUTPUT_FILE"

PLANTUML_BIN="$PLANTUML_WRAPPER" \
pandoc "${INPUT_FILES[@]}" \
    -o "$OUTPUT_FILE" \
    --lua-filter="$DIAGRAM_LUA" \
    --lua-filter="$REPO_ROOT/docs/br.lua" \
    --extract-media="$MEDIA_DIR" \
    --resource-path="$REPO_ROOT/docs" \
	--reference-doc="$REPO_ROOT/docs/original.docx" \
    -s

info "Done! Report generated at: ${OUTPUT_FILE#"$REPO_ROOT/"}"
