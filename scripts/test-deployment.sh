#!/bin/bash
# Script to test deployment after it's complete
# Usage: ./scripts/test-deployment.sh <url>

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

URL=${1:-http://localhost:3000}

echo -e "${GREEN}Testing deployment at: $URL${NC}"
echo ""

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$URL/api/health" || echo "500")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    exit 1
fi

echo ""

# Test main page
echo "Testing main page..."
MAIN_RESPONSE=$(curl -s -w "\n%{http_code}" "$URL/" || echo "500")
HTTP_CODE=$(echo "$MAIN_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
    echo -e "${GREEN}✓ Main page accessible${NC}"
else
    echo -e "${RED}✗ Main page not accessible (HTTP $HTTP_CODE)${NC}"
    exit 1
fi

echo ""

# Test static assets
echo "Testing static assets..."
STATIC_RESPONSE=$(curl -s -w "\n%{http_code}" "$URL/_next/static/" || echo "500")
HTTP_CODE=$(echo "$STATIC_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "404" ]; then
    echo -e "${GREEN}✓ Static assets endpoint reachable${NC}"
else
    echo -e "${YELLOW}⚠ Static assets may not be properly configured (HTTP $HTTP_CODE)${NC}"
fi

echo ""

# Test API routes
echo "Testing API routes..."
API_RESPONSE=$(curl -s -w "\n%{http_code}" "$URL/api/projects" || echo "500")
HTTP_CODE=$(echo "$API_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "401" ] || [ "$HTTP_CODE" == "403" ]; then
    echo -e "${GREEN}✓ API routes working${NC}"
else
    echo -e "${YELLOW}⚠ API routes may have issues (HTTP $HTTP_CODE)${NC}"
fi

echo ""
echo -e "${GREEN}Deployment test complete!${NC}"
echo ""
echo "Manual checks:"
echo "1. Visit $URL in a browser"
echo "2. Try signing up"
echo "3. Check logs: docker logs -f githubplanner"
echo "4. Monitor MongoDB Atlas connections"
echo ""
echo "Cloudflare checks:"
echo "1. Verify DNS is pointing correctly"
echo "2. Check SSL/TLS settings (Full or Full Strict)"
echo "3. Review cache settings"
echo "4. Test from different locations"

