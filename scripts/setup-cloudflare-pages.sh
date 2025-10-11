#!/bin/bash
# Quick setup script for Cloudflare Pages deployment

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Cloudflare Pages Deployment Setup${NC}"
echo "===================================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}Error: npm is not installed${NC}"
    exit 1
fi

# Step 1: Install dependencies
echo -e "${BLUE}Step 1: Installing @cloudflare/next-on-pages...${NC}"
npm install --save-dev @cloudflare/next-on-pages

# Step 2: Update package.json scripts
echo -e "${BLUE}Step 2: Updating package.json scripts...${NC}"

# Check if pages:build already exists
if grep -q '"pages:build"' package.json; then
    echo "Scripts already configured!"
else
    echo -e "${YELLOW}Please manually add these scripts to package.json:${NC}"
    echo ""
    cat << 'EOF'
"pages:build": "npx @cloudflare/next-on-pages",
"pages:deploy": "npm run pages:build && wrangler pages deploy .vercel/output/static",
"pages:watch": "npx @cloudflare/next-on-pages --watch",
"pages:dev": "npx wrangler pages dev .vercel/output/static --compatibility-flag=nodejs_compat"
EOF
    echo ""
fi

# Step 3: Test build
echo -e "${BLUE}Step 3: Testing build...${NC}"
npm run pages:build || {
    echo -e "${YELLOW}Build failed. This is normal if scripts aren't added yet.${NC}"
    echo "Add the scripts above to package.json and run: npm run pages:build"
}

echo ""
echo -e "${GREEN}Setup Complete!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Go to https://dash.cloudflare.com"
echo "2. Pages → Create application → Connect to GitLab"
echo "3. Select your githubplanner repository"
echo "4. Build settings:"
echo "   - Build command: npm run pages:build"
echo "   - Build output: .vercel/output/static"
echo "5. Add environment variables (MONGODB_URI, etc.)"
echo "6. Deploy!"
echo ""
echo -e "${BLUE}Or deploy via CLI:${NC}"
echo "npm install -g wrangler"
echo "wrangler login"
echo "wrangler pages deploy .vercel/output/static --project-name=githubplanner"
echo ""
echo -e "${GREEN}See CLOUDFLARE_PAGES_DEPLOYMENT.md for full guide${NC}"

