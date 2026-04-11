#!/bin/bash
set -euo pipefail

if [[ ! -f .next/BUILD_ID ]]; then
  echo "Missing prebuilt Next.js artifacts (.next/BUILD_ID)." >&2
  echo "Run npm run bundle:eb or npm run build before deploying to Elastic Beanstalk." >&2
  exit 1
fi

echo "Using prebuilt Next.js artifacts from the deploy bundle."
