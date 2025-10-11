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

# Copy _routes.json to output directory for static asset routing
if [ -f "_routes.json" ]; then
    echo "Copying _routes.json to .open-next/"
    cp _routes.json .open-next/_routes.json
else
    echo "Warning: _routes.json not found"
fi

# Move assets from assets/ subdirectory to root for proper serving
if [ -d ".open-next/assets/_next" ]; then
    echo "Moving _next assets to root level..."
    # Create _next directory at root if it doesn't exist
    mkdir -p .open-next/_next
    # Move static assets
    if [ -d ".open-next/assets/_next/static" ]; then
        cp -r .open-next/assets/_next/static .open-next/_next/
        echo "Copied _next/static to root level"
    fi
fi

# Ensure static assets are in place
if [ -d ".open-next/_next/static" ]; then
    echo "Static assets found at correct location"
    ls -la .open-next/_next/static/ | head -10
else
    echo "Warning: No _next/static directory found at root"
fi

echo "Worker structure fixed!"
ls -la .open-next/

