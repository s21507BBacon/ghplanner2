#!/bin/bash
set -e

echo "Building Next.js application..."
# Set env vars to bypass database connection during build
BUILDING=true BUILDING_FOR_CLOUDFLARE=true npm run build

echo "Converting build for Cloudflare Pages..."
# Now run OpenNext build to convert for Cloudflare
npx --yes @opennextjs/cloudflare@latest build

echo "Fixing worker structure for Cloudflare Pages..."
chmod +x fix-worker.sh
./fix-worker.sh

echo "Renaming worker.js to _worker.js for Cloudflare Pages..."
if [ -f ".open-next/worker.js" ]; then
  mv .open-next/worker.js .open-next/_worker.js
  echo "Worker file renamed successfully"
else
  echo "Warning: worker.js not found"
fi

echo "Creating routing configuration..."
cat > .open-next/_routes.json << 'EOF'
{
  "version": 1,
  "include": ["/*"],
  "exclude": [
    "/_next/static/*",
    "/_next/image*",
    "/assets/*",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml"
  ]
}
EOF

echo "Creating headers configuration..."
cat > .open-next/_headers << 'EOF'
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

/assets/*
  Cache-Control: public, max-age=31536000, immutable
EOF

echo "Build complete!"

