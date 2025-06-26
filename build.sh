# build.sh
#!/usr/bin/env bash
set -e
mkdir -p netlify/functions

# loop through each subfolder in backend/
for dir in backend/*/ ; do
  fname=$(basename "$dir")         # auth, error, graph...
  go build \
    -trimpath -ldflags="-s -w" \
    -o netlify/functions/$fname \
    $dir/*.go
done
