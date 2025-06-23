#!/bin/bash

set -e

# === Config ===
FRONTEND_REPO="https://practobz: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@github.com/sujitmanolikar/ui.git"
FRONTEND_DIR="ui"
BUCKET_NAME="helloworld-cdn"
BUILD_DIR="build"

# === Clean old repo ===
echo "🧹 Cleaning old repo (if any)..."
rm -rf $FRONTEND_DIR

# === Clone repo ===
echo "📦 Cloning frontend repo..."
git clone $FRONTEND_REPO $FRONTEND_DIR

# === Build the frontend ===
echo "⚙️ Building frontend..."
cd $FRONTEND_DIR
npm install
npm run build
cd ..

# === Upload build to GCS ===
echo "☁️ Uploading build to GCS bucket: $BUCKET_NAME"
gsutil -m rsync -r -d "${FRONTEND_DIR}/${BUILD_DIR}" "gs://${BUCKET_NAME}"

echo "✅ Frontend deployed successfully to GCS (CDN)"
