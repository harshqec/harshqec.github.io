#!/bin/bash

echo "==========================================="
echo " Booting up the Modern Q-Matrix Web App..."
echo "==========================================="

# Detect the script directory and the root website directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( dirname "$DIR" )"

# Function to free up a port if it's in use
cleanup_port() {
  local port=$1
  local pid=$(lsof -t -i:$port)
  if [ -n "$pid" ]; then
    echo "⚠️  Port $port is in use (PID: $pid). Cleaning up..."
    kill -9 $pid 2>/dev/null
    sleep 1
  fi
}

# Cleanup ports 5000 (API) and 8000 (Website) before starting
cleanup_port 5000
cleanup_port 8000

# Start the Python Flask Backend Server (Math Engine)
echo "[1/2] Starting Python Math API Backend (Port 5000) 🐍"
cd "$DIR/api"
source venv/bin/activate
python3 app.py &
API_PID=$!

# Wait lightly for Backend to warm up
sleep 2 

# Start a Static Server for the whole Portfolio (Port 8000)
# This fixes the "blank sandbox" issue caused by browser security on file://
echo "[2/2] Starting Static Portfolio Server (Port 8000) 🌐"
cd "$ROOT_DIR"
python3 -m http.server 8000 &
STATIC_PID=$!

function cleanup {
  echo ""
  echo "Shutting down servers..."
  kill $API_PID $STATIC_PID 2>/dev/null
  exit
}

# Trap Ctrl+C to clean up background processes
trap cleanup SIGINT SIGTERM

echo ""
echo "✅ SUCCESS: All systems live!"
echo "-------------------------------------------"
echo "👉 MATH API:  http://127.0.0.1:5000"
echo "👉 WEBSITE:   http://localhost:8000"
echo "-------------------------------------------"
echo "🚀 Opening your website now..."

# Give the servers a moment to bind, then open the browser
(sleep 1.5 && xdg-open "http://localhost:8000") &

# Wait for both processes
wait $API_PID $STATIC_PID
