#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
VERSION="$(node -p "JSON.parse(require('fs').readFileSync('$ROOT/module.json','utf8')).version")"
rm -rf "$DIST"
mkdir -p "$DIST"
# Flat Foundry module archive: excludes editable source/tests and standalone books.
(
 cd "$ROOT"
 zip -qr "$DIST/cold-storage-v${VERSION}.zip" module.json cold-storage.mjs book.mjs continuity.mjs continuity-rules.mjs system-bridge.mjs emblems.mjs checks.mjs journal-theme.mjs scenes.mjs content-src styles templates lang assets README.md START-HERE.md CHANGELOG.md docs publishing
)
python3 - "$DIST/cold-storage-v${VERSION}.zip" <<'PY'
import sys,zipfile,json
with zipfile.ZipFile(sys.argv[1]) as z:
    assert 'module.json' in z.namelist()
    assert 'cold-storage/module.json' not in z.namelist()
    assert z.testzip() is None
    m=json.loads(z.read('module.json'))
    for p in m['esmodules']+m['styles']+[x['path'] for x in m['languages']]:assert p in z.namelist(),p
    import re
    for src in [n for n in z.namelist() if n.endswith('.mjs')]:
        for dep in re.findall(r"from '\./([^']+)'",z.read(src).decode()):assert dep in z.namelist(),(src,dep)
PY
cp "$ROOT/module.json" "$DIST/module.json"
# Repository snapshot includes editable manuscript, compiled books, scripts and tests.
(
 cd "$ROOT"
 zip -qr "$DIST/altered-carbon-cold-storage-repo-v${VERSION}.zip" . -x '.git/*' 'dist/*' 'node_modules/*' '__pycache__/*' '*/__pycache__/*'
)
(
 cd "$DIST"
 sha256sum "cold-storage-v${VERSION}.zip" module.json "altered-carbon-cold-storage-repo-v${VERSION}.zip" > SHA256SUMS.txt
)
printf 'Built Cold Storage %s in %s\n' "$VERSION" "$DIST"
