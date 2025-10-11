#!/bin/bash
set -e

echo "Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

echo "Building for Cloudflare Pages..."
npm run pages:build

echo "Build complete!"

