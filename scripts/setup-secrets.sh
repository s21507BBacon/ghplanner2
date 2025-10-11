#!/bin/bash
# Script to generate required secrets for deployment
# Usage: ./scripts/setup-secrets.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}GitHub Planner - Secret Generation${NC}"
echo "======================================"
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is required but not installed"
    exit 1
fi

# Generate secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

echo -e "${GREEN}Generated Secrets:${NC}"
echo ""
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo "JWT_SECRET=$JWT_SECRET"
echo ""

# Ask if user wants to create .env file
read -p "Create/update .env file? [y/N]: " CREATE_ENV
if [[ "$CREATE_ENV" =~ ^[Yy]$ ]]; then
    
    # Check if .env exists
    if [ -f .env ]; then
        echo -e "${YELLOW}Warning: .env file already exists${NC}"
        read -p "Backup existing .env? [Y/n]: " BACKUP
        if [[ ! "$BACKUP" =~ ^[Nn]$ ]]; then
            cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
            echo "Backed up existing .env"
        fi
    fi
    
    # Get MongoDB URI
    echo ""
    echo "Enter your MongoDB Atlas connection string:"
    echo "Format: mongodb+srv://username:password@cluster.mongodb.net/database"
    read -p "MONGODB_URI: " MONGODB_URI
    
    # Get domain
    read -p "Production domain (e.g., https://yourdomain.com): " NEXTAUTH_URL
    
    # Get GitHub token
    echo ""
    echo "Get GitHub token from: https://github.com/settings/tokens"
    echo "Required scopes: repo, read:user, user:email"
    read -p "GITHUB_TOKEN: " GITHUB_TOKEN
    
    # Ask about email
    read -p "Configure email settings? [y/N]: " CONFIGURE_EMAIL
    
    # Create .env file
    cat > .env << EOF
# MongoDB Atlas Configuration
MONGODB_URI=$MONGODB_URI

# NextAuth Configuration
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=$NEXTAUTH_URL

# GitHub Integration
GITHUB_TOKEN=$GITHUB_TOKEN

# JWT Configuration
JWT_SECRET=$JWT_SECRET

# Application Configuration
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
EOF

    if [[ "$CONFIGURE_EMAIL" =~ ^[Yy]$ ]]; then
        read -p "SMTP Host (e.g., smtp.gmail.com): " SMTP_HOST
        read -p "SMTP Port (e.g., 587): " SMTP_PORT
        read -p "SMTP User: " SMTP_USER
        read -p "SMTP Password: " SMTP_PASS
        read -p "SMTP From Address: " SMTP_FROM
        
        cat >> .env << EOF

# Email Configuration
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_FROM=$SMTP_FROM
EOF
    fi
    
    echo ""
    echo -e "${GREEN}.env file created successfully!${NC}"
fi

# Generate GitLab CI/CD instructions
echo ""
echo -e "${GREEN}GitLab CI/CD Variables:${NC}"
echo "Add these in Settings > CI/CD > Variables"
echo ""
echo "| Variable | Value | Protected | Masked |"
echo "|----------|-------|-----------|--------|"
echo "| MONGODB_URI | (your value) | ✓ | ✓ |"
echo "| NEXTAUTH_SECRET | $NEXTAUTH_SECRET | ✓ | ✓ |"
echo "| NEXTAUTH_URL | (your domain) | ✗ | ✗ |"
echo "| GITHUB_TOKEN | (your token) | ✓ | ✓ |"
echo "| JWT_SECRET | $JWT_SECRET | ✓ | ✓ |"
echo ""

# Ask about deployment method
echo ""
read -p "Will you deploy via SSH? [y/N]: " SSH_DEPLOY
if [[ "$SSH_DEPLOY" =~ ^[Yy]$ ]]; then
    echo ""
    echo "Additional variables needed:"
    echo "| SERVER_IP | (your server IP) | ✗ | ✗ |"
    echo "| SERVER_USER | (SSH username) | ✗ | ✗ |"
    echo "| SSH_PRIVATE_KEY | (your SSH key) | ✓ | ✓ |"
    echo ""
    echo "Generate SSH key with:"
    echo "  ssh-keygen -t ed25519 -C 'gitlab-deployment'"
    echo "Then add public key to server:"
    echo "  ssh-copy-id user@server-ip"
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure GitLab CI/CD variables"
echo "2. Set up MongoDB Atlas (see QUICKSTART.md)"
echo "3. Configure Cloudflare (see DEPLOYMENT.md)"
echo "4. Push to GitLab and deploy"

