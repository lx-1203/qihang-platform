#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "======================================================="
echo "    QiHang Platform - One-Click Launcher"
echo "    Frontend (5173) + Backend (3001)"
echo "======================================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js not found. Please install Node.js first."
  exit 1
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "[WARN] backend/.env not found, copying from backend/.env.example..."
  if [ -f "$BACKEND_DIR/.env.example" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  else
    echo "[ERROR] backend/.env.example not found."
    exit 1
  fi
fi

if command -v lsof >/dev/null 2>&1 && lsof -i tcp:5173 >/dev/null 2>&1; then
  echo "[ERROR] Port 5173 is already in use."
  echo "        Stop the existing process or free ws://localhost:5173 before starting."
  exit 1
fi

echo "[1/4] Installing backend dependencies..."
(cd "$BACKEND_DIR" && npm install --silent)
echo "      Done."
echo

echo "[2/4] Installing frontend dependencies..."
(cd "$FRONTEND_DIR" && npm install --silent)
echo "      Done."
echo

echo "[3/5] Initializing database schema..."
(cd "$BACKEND_DIR" && npm run init-db)
echo "      Done."
echo

echo "[4/5] Starting backend server..."
(cd "$BACKEND_DIR" && npm run dev) &
BACKEND_PID=$!

echo "[5/5] Starting frontend server..."
(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!
echo

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

backend_ok=0
frontend_ok=0

for _ in $(seq 1 60); do
  if curl -fsS "http://localhost:3001/api/health" >/dev/null 2>&1; then
    backend_ok=1
  fi

  if curl -fsS "http://localhost:5173" >/dev/null 2>&1; then
    frontend_ok=1
  fi

  if [ "$backend_ok" -eq 1 ] && [ "$frontend_ok" -eq 1 ]; then
    echo "======================================================="
    echo "  Startup complete"
    echo "  Frontend: http://localhost:5173"
    echo "  Backend:  http://localhost:3001"
    echo "  Health:   http://localhost:3001/api/health"
    echo "======================================================="
    echo
    wait "$BACKEND_PID" "$FRONTEND_PID"
    exit 0
  fi

  sleep 1
done

echo "[ERROR] Startup health check timed out."
[ "$backend_ok" -eq 1 ] || echo "        Backend health endpoint did not become ready: http://localhost:3001/api/health"
[ "$frontend_ok" -eq 1 ] || echo "        Frontend dev server did not become ready on http://localhost:5173"
echo "        If you see \"WebSocket connection to ws://localhost:5173 failed\", Vite did not start successfully."
exit 1
