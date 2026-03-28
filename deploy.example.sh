#!/usr/bin/env bash
# deploy.sh — Droplo 部署腳本
#
# 使用方式：
#   1. 複製此範本：cp deploy.example.sh deploy.sh
#   2. 修改下方的 FIREBASE_PROJECT 和 HOSTING_SITE
#   3. chmod +x deploy.sh
#   4. ./deploy.sh [target]
#
# 範例：
#   ./deploy.sh              # 部署全部
#   ./deploy.sh hosting      # 只部署 Hosting
#   ./deploy.sh functions    # 只部署 Cloud Functions
#   ./deploy.sh rules        # 部署 Firestore + Storage 規則

set -euo pipefail

# ============================================================
# 👇 修改這裡：填入你的 Firebase 專案 ID 和 Hosting site 名稱
# ============================================================
FIREBASE_PROJECT="your-project-id"
HOSTING_SITE="your-hosting-site-name"
# ============================================================

# 確認 firebase CLI 存在
if ! command -v firebase &> /dev/null; then
  echo "Error: firebase CLI not found. Install: npm install -g firebase-tools"
  exit 1
fi

# 設定專案與 hosting target
firebase use "$FIREBASE_PROJECT"
firebase target:apply hosting app "$HOSTING_SITE"

# 建置前端
echo "Building frontend..."
npm run build

# 部署
TARGET="${1:-all}"

case "$TARGET" in
  all)
    echo "Deploying everything..."
    firebase deploy
    ;;
  hosting)
    echo "Deploying hosting only..."
    firebase deploy --only hosting
    ;;
  functions)
    echo "Deploying functions only..."
    firebase deploy --only functions
    ;;
  rules)
    echo "Deploying firestore + storage rules..."
    firebase deploy --only firestore,storage
    ;;
  *)
    echo "Deploying: $TARGET"
    firebase deploy --only "$TARGET"
    ;;
esac

echo "Done!"
