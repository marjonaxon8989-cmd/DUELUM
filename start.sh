#!/bin/sh
# Starts a local web server on http://localhost:8000 using whatever is installed.
# Works with any Python 3.x, Python 2.x, Node (npx), PHP or Ruby — no specific version needed.
cd "$(dirname "$0")"
PORT="${1:-8000}"
echo "1v1 Duel -> http://localhost:$PORT   (Ctrl+C to stop)"
if command -v python3 >/dev/null 2>&1; then exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  if python -c 'import sys; sys.exit(0 if sys.version_info[0]>=3 else 1)'; then exec python -m http.server "$PORT"
  else exec python -m SimpleHTTPServer "$PORT"; fi
elif command -v npx >/dev/null 2>&1; then exec npx --yes serve -l "$PORT" .
elif command -v php >/dev/null 2>&1; then exec php -S "localhost:$PORT"
elif command -v ruby >/dev/null 2>&1; then exec ruby -run -e httpd . -p "$PORT"
else
  echo "Python, Node, PHP yoki Ruby topilmadi. index.html faylini brauzerda to'g'ridan-to'g'ri ochishingiz mumkin."
  exit 1
fi
