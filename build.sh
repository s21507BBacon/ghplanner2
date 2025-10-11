#!/bin/bash
set -e

echo "Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

echo "Building Next.js application..."
# Set env vars to bypass MongoDB connection during build
BUILDING=true BUILDING_FOR_CLOUDFLARE=true npm run build

echo "Converting build for Cloudflare Pages..."
# Now run OpenNext build to convert for Cloudflare
npm run pages:build

echo "Build complete!"

