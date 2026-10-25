#!/usr/bin/env bash
# Copy the RAG / GraphRAG corpus (rag-corpus/) into one folder, plus a .zip of it,
# ready to download and ingest.
#
#   deploy/export-rag.sh [target-dir]      default: /root/bayt-al-ghaf-rag
#
# Run by deploy/deploy.sh after each deployment. Regenerate the corpus itself with
# `npm run rag:build` (and commit it) before exporting.
set -euo pipefail

src=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/rag-corpus
target=$(realpath -m "${1:-/root/bayt-al-ghaf-rag}")
marker=.bayt-al-ghaf-rag

[[ -f $src/manifest.json ]] || { echo "no corpus in $src; run npm run rag:build first" >&2; exit 1; }
case $target in /|/root|/home|/opt|/etc|/usr|/tmp|/var) echo "refusing to export into $target" >&2; exit 1 ;; esac
# Only ever replace a folder this script created.
if [[ -e $target && ! -f $target/$marker ]]; then
  echo "$target exists and was not created by this script; choose another folder" >&2
  exit 1
fi

staging=$(mktemp -d "$target.tmp.XXXXXX")
trap 'rm -rf -- "$staging"' EXIT
cp -r "$src/." "$staging/"
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

echo "RAG corpus: $target"
echo "zip:        $target.zip"
