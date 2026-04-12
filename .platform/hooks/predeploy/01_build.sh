#!/bin/bash
set -euo pipefail

cd /var/app/staging

if [[ -f .next/BUILD_ID ]]; then
  echo "Existing Next.js production build found. Skipping predeploy build."
  exit 0
fi

echo "No Next.js production build found. Running predeploy build..."
npm run build
