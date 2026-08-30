#!/bin/sh

# exit immediately if a command exits with a non-zero status
set -e

echo "🪔 Starting PunyaVerse All-in-One Container..."

# 1. Start MongoDB locally
echo "⚙️ Launching MongoDB..."
mkdir -p /data/db /var/log/mongodb
mongod --fork --logpath /var/log/mongodb/mongod.log --dbpath /data/db --bind_ip 127.0.0.1

# Wait for MongoDB to boot up
echo "⏳ Waiting for MongoDB to initialize..."
until mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1 || mongo --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; do
    sleep 1
done
echo "✅ MongoDB is online!"

# 2. Start FastAPI Backend in the background
echo "⚙️ Launching FastAPI Backend (Uvicorn)..."
export MONGO_URL="mongodb://127.0.0.1:27017"
export DB_NAME="${DB_NAME:-punyaverse}"
export JWT_SECRET="${JWT_SECRET:-super-secret-key-for-production-change-me}"
export EMERGENT_LLM_KEY="${EMERGENT_LLM_KEY:-}"
export RESEND_API_KEY="${RESEND_API_KEY:-}"
export RAZORPAY_KEY_ID="${RAZORPAY_KEY_ID:-}"
export RAZORPAY_KEY_SECRET="${RAZORPAY_KEY_SECRET:-}"
export STRIPE_API_KEY="${STRIPE_API_KEY:-}"
export SUPERADMIN_PASSWORD="${SUPERADMIN_PASSWORD:-ChangeMe!123}"

cd /app/backend
# Start Uvicorn in the background and pipe logs
python -m uvicorn server:app --host 127.0.0.1 --port 8000 > /var/log/uvicorn.log 2>&1 &

# Wait for FastAPI backend to initialize
echo "⏳ Waiting for PunyaVerse API to become ready..."
until wget -qO- http://127.0.0.1:8000/api/ >/dev/null 2>&1 || curl -s http://127.0.0.1:8000/api/ >/dev/null 2>&1; do
    sleep 1
done
echo "✅ PunyaVerse API is online and fully seeded!"

# 3. Start Nginx in the foreground
echo "⚙️ Launching Nginx Reverse Proxy..."
echo "🕉️ PunyaVerse is now fully live on port 80!"
exec nginx -g "daemon off;"
