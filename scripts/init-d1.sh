#!/bin/bash
# Initialise D1 database for Cloudflare Pages
set -e

echo "🚀 D1 Database Initialisation Script"
echo "===================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Install it with: npm install -g wrangler"
    exit 1
fi

echo ""
echo "📝 Step 1: Login to Cloudflare"
wrangler login

echo ""
echo "📝 Step 2: Create D1 Database"
echo "Creating database 'ghplanner-db'..."
wrangler d1 create ghplanner-db

echo ""
echo "📝 Step 3: Initialize Database Schema"
echo "Applying schema from schema.sql..."
wrangler d1 execute ghplanner-db --file ./schema.sql

echo ""
echo "✅ D1 Database initialised successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Copy the database_id from the output above"
echo "2. Update wrangler.toml with the database_id"
echo "3. In Cloudflare Pages dashboard, bind the database:"
echo "   - Go to Settings → Functions"
echo "   - Add D1 database binding"
echo "   - Variable name: DB (must be uppercase!)"
echo "   - D1 database: ghplanner-db"
echo ""
echo "4. Deploy your application:"
echo "   git push"
echo ""

