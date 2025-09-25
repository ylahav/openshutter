#!/bin/bash

# === Configuration ===
REMOTE_USER="root"           # Replace with your server's SSH username
REMOTE_HOST="147.182.216.253"          # Replace with your server's IP or domain
REMOTE_PATH="/var/www/yairl.com"       # Replace with the path on your server
APP_NAME="yairlCom"                   # Name for PM2 process

echo "🚀 Building Next.js app locally with PNPM..."
pnpm install
pnpm build

echo "📦 Syncing standalone build to server..."
rsync -av --delete .next/standalone/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/
rsync -av public/ $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/public/
rsync package.json $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/
rsync pnpm-lock.yaml $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/

echo "🔧 Installing dependencies and restarting app on server..."
ssh $REMOTE_USER@$REMOTE_HOST << EOF
  cd $REMOTE_PATH
  pnpm install --prod
  pm2 restart $APP_NAME || pm2 start pnpm --name "$APP_NAME" -- start
  pm2 save
EOF

echo "✅ Deployment complete!"
