#!/bin/bash
set -e

echo "Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

echo "Building for Cloudflare Pages..."
# Set BUILDING env var to bypass MongoDB connection during build
BUILDING=true npm run pages:build

echo "Build complete!"

