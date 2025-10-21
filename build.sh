#!/bin/bash
set -e

echo "Building Next.js application..."
# Set env vars to bypass database connection during build
BUILDING=true BUILDING_FOR_CLOUDFLARE=true npm run build

echo "Checking and applying database schema..."
# Check if DATABASE_URL is set and schema needs to be applied
if [ -n "$DATABASE_URL" ]; then
  echo "Database URL found, checking schema..."

  # Check if we can connect to the database and if the users table exists
  if psql "$DATABASE_URL" -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'users' LIMIT 1;" -q 2>/dev/null | grep -q "1"; then
    echo "✓ Database schema appears to be already applied"
  else
    echo "Database schema not found, applying..."

    # Check if psql is available
    if command -v psql &> /dev/null; then
      echo "Applying database schema..."
      psql "$DATABASE_URL" -f database/schema.sql
      echo "✓ Database schema applied successfully"
    else
      echo "Warning: psql not found. Please ensure database schema is applied manually."
      echo "You can run: psql \$DATABASE_URL -f database/schema.sql"
    fi
  fi
else
  echo "Warning: DATABASE_URL not set. Skipping database schema check."
  echo "Set DATABASE_URL environment variable if you want automatic schema application."
fi

echo "Converting build for Cloudflare Pages..."
# Now run OpenNext build to convert for Cloudflare using local installation
# Use node to run the local CLI directly to ensure wrangler is available
node ./node_modules/@opennextjs/cloudflare/dist/cli/index.js build

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

echo "Copying _next assets to root level..."
if [ -d ".open-next/assets/_next" ]; then
  cp -r .open-next/assets/_next .open-next/_next
  echo "_next assets copied to root successfully"
else
  echo "Warning: .open-next/assets/_next directory not found"
fi

echo "Copying public folder assets..."
if [ -d "public" ]; then
  # Copy all public files to the root of .open-next for direct access
  echo "Copying public files to .open-next root..."
  for item in public/*; do
    # Skip the custom_static directory as it's handled separately
    if [ "$(basename "$item")" != "custom_static" ]; then
      if [ -f "$item" ]; then
        cp "$item" .open-next/
        echo "Copied $(basename "$item")"
      fi
    fi
  done
  
  # Also copy to assets folder for compatibility
  echo "Copying public files to .open-next/assets..."
  for item in public/*; do
    if [ "$(basename "$item")" != "custom_static" ]; then
      if [ -f "$item" ]; then
        cp "$item" .open-next/assets/
      fi
    fi
  done
  echo "Public assets copied successfully"
else
  echo "Warning: public directory not found"
fi

echo "Copying custom static assets..."
if [ -d "public/custom_static" ]; then
  mkdir -p .open-next/custom_static
  cp -r public/custom_static/* .open-next/custom_static/
  echo "Custom static assets copied successfully"
else
  echo "Warning: public/custom_static directory not found"
fi

echo "Creating routing configuration..."
cat > .open-next/_routes.json << 'EOF'
{
  "version": 1,
  "include": ["/*"],
  "exclude": [
    "/_next/static/*",
    "/assets/*",
    "/custom_static/*",
    "/favicon.ico",
    "/favicon-*.png",
    "/logo.png",
    "/mcpeak-bacon-logo.png",
    "/apple-touch-icon.png",
    "/android-chrome-*.png",
    "/site.webmanifest",
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

/custom_static/*
  Cache-Control: public, max-age=31536000, immutable

# Public image files
/*.png
  Cache-Control: public, max-age=31536000, immutable

/*.ico
  Cache-Control: public, max-age=31536000, immutable

/site.webmanifest
  Cache-Control: public, max-age=31536000, immutable
EOF

echo "Build complete!"

