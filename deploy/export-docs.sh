#!/usr/bin/env bash
# Copy all project documentation into one folder, plus a .zip of it, ready to download.
#
#   deploy/export-docs.sh [target-dir]      default: /root/bayt-al-ghaf-docs
#
# Run by deploy/deploy.sh after each deployment. The folder keeps the repository layout
# (README.md + docs/) so relative links keep working.
set -euo pipefail

src=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
target=$(realpath -m "${1:-/root/bayt-al-ghaf-docs}")
marker=.bayt-al-ghaf-docs

case $target in /|/root|/home|/opt|/etc|/usr|/tmp|/var) echo "refusing to export into $target" >&2; exit 1 ;; esac
# Only ever replace a folder this script created.
if [[ -e $target && ! -f $target/$marker ]]; then
  echo "$target exists and was not created by this script; choose another folder" >&2
  exit 1
fi

staging=$(mktemp -d "$target.tmp.XXXXXX")
trap 'rm -rf -- "$staging"' EXIT
cp "$src/README.md" "$staging/"
cp -r "$src/docs" "$staging/docs"
{
  echo "Bayt Al Ghaf documentation export"
  echo "Revision: $(cat "$src/REVISION" 2>/dev/null || git -C "$src" rev-parse HEAD 2>/dev/null || echo unknown)"
  echo "Exported: $(date -Iseconds)"
  echo
  echo "Start with README.md, then docs/integration/external-agent-integration.md."
} > "$staging/EXPORT-INFO.txt"
touch "$staging/$marker"
chmod -R u=rwX,go=rX "$staging"
rm -rf -- "$target"
mv "$staging" "$target"
trap - EXIT

# python3 rather than zip(1), which is not installed everywhere.
python3 - "$target" "$marker" <<'PY'
import os, sys, zipfile
root, marker = sys.argv[1], sys.argv[2]
name, out = os.path.basename(root), root + ".zip"
with zipfile.ZipFile(out + ".tmp", "w", zipfile.ZIP_DEFLATED) as z:
    for d, dirs, files in os.walk(root):
        dirs.sort()
        for f in sorted(files):
            if f != marker:
                p = os.path.join(d, f)
                z.write(p, os.path.join(name, os.path.relpath(p, root)))
os.replace(out + ".tmp", out)
PY

echo "documentation: $target"
echo "zip:           $target.zip"
