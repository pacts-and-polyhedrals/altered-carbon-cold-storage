#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
VERSION="1.0.0"
rm -rf "$DIST"
mkdir -p "$DIST"

# Foundry install ZIP: module files are at archive root, not inside a wrapper directory.
(
  cd "$ROOT"
  zip -qr "$DIST/cold-storage-v${VERSION}.zip" . \
    -x '.git/*' 'dist/*' 'node_modules/*' 'tests/*' 'scripts/*' 'docs/*' '.github/*' \
       'README.md' 'START-HERE.md' 'CHANGELOG.md' 'package.json' '.gitignore' '.editorconfig' '.nvmrc'
)

# Reject the common packaging error immediately.
if unzip -Z1 "$DIST/cold-storage-v${VERSION}.zip" | grep -q '^cold-storage/module.json$'; then
  echo 'ERROR: release ZIP contains an unwanted cold-storage/ wrapper directory.' >&2
  exit 1
fi
if ! unzip -Z1 "$DIST/cold-storage-v${VERSION}.zip" | grep -qx 'module.json'; then
  echo 'ERROR: module.json is not at ZIP root.' >&2
  exit 1
fi

# Full repository snapshot.
(
  cd "$ROOT"
  zip -qr "$DIST/altered-carbon-cold-storage-repo-v${VERSION}.zip" . \
    -x '.git/*' 'dist/*' 'node_modules/*'
)

(
  cd "$DIST"
  sha256sum "cold-storage-v${VERSION}.zip" "altered-carbon-cold-storage-repo-v${VERSION}.zip" > SHA256SUMS.txt
)

echo "Built Cold Storage ${VERSION} release assets in $DIST"
