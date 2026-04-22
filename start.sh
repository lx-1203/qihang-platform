#!/bin/bash

echo "======================================================="
echo "    QiHang Platform - One-Click Launcher"
echo "    Frontend (5173) + Backend (3001)"
echo "======================================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Please install Node.js first."
    exit 1
fi

# Check backend .env
if [ ! -f "backend/.env" ]; then
    echo "[WARN] backend/.env not found, copying from .env.example..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        # Auto-generate JWT secrets
        JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
        JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/请替换为随机密钥/$JWT_SECRET/" backend/.env
            sed -i '' "s/请替换为另一个随机密钥/$JWT_REFRESH_SECRET/" backend/.env
        else
            sed -i "s/请替换为随机密钥/$JWT_SECRET/" backend/.env
            sed -i "s/请替换为另一个随机密钥/$JWT_REFRESH_SECRET/" backend/.env
        fi
        echo "[INFO] backend/.env created with auto-generated JWT secrets."
        echo "[INFO] Please edit DB_PASSWORD in backend/.env before continuing."
        echo ""
    else
        echo "[ERROR] .env.example not found. Please create backend/.env manually."
        exit 1
    fi
fi

# Install backend deps
echo "[1/4] Installing backend dependencies..."
cd backend && npm install --silent
if [ $? -ne 0 ]; then
    echo "[ERROR] Backend install failed."
    cd ..
    exit 1
fi
cd ..
echo "      Done."
echo ""

# Install frontend deps
echo "[2/4] Installing frontend dependencies..."
cd frontend && npm install --silent
if [ $? -ne 0 ]; then
    echo "[ERROR] Frontend install failed."
    cd ..
    exit 1
fi
cd ..
echo "      Done."
echo ""

# Start backend in background
echo "[3/4] Starting backend server (port 3001)..."
cd backend
node server.js &
BACKEND_PID=$!
cd ..
echo "      Backend started (PID: $BACKEND_PID)."
echo ""

# Wait for backend
sleep 2

# Start frontend
echo "[4/4] Starting frontend server (port 5173)..."
cd frontend
npx vite --open &
FRONTEND_PID=$!
cd ..
echo "      Frontend started (PID: $FRONTEND_PID)."
echo ""

echo "======================================================="
echo "  All services started!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3001"
echo "  Admin:    admin@qihang.com / admin123"
echo "======================================================="
echo ""
echo "Press Ctrl+C to stop all services."

# Trap Ctrl+C to kill both processes
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for both processes
wait
