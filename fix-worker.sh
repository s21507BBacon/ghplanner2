#!/bin/bash
set -e

echo "Fixing OpenNext output for Cloudflare Pages..."

# Check if .open-next directory exists
if [ ! -d ".open-next" ]; then
    echo "Error: .open-next directory not found"
    exit 1
fi

# Check if worker.js exists
if [ -f ".open-next/worker.js" ]; then
    echo "Found worker.js, renaming to _worker.js"
    mv .open-next/worker.js .open-next/_worker.js
fi

# Ensure static assets are in place
if [ -d ".open-next/assets" ]; then
    echo "Static assets found"
else
    echo "Warning: No assets directory found"
fi

echo "Worker structure fixed!"
ls -la .open-next/

