#!/bin/bash

# Setup Cron Job for Webhook Renewal
# This creates a daily cron job to auto-renew expiring webhooks

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LOG_DIR="$SCRIPT_DIR/logs"

# Create logs directory
mkdir -p "$LOG_DIR"

# Create the cron job command
CRON_CMD="0 3 * * * cd $SCRIPT_DIR && node renew-webhooks.js >> $LOG_DIR/webhook-renewal.log 2>&1"

echo "🔧 Setting up webhook auto-renewal cron job..."
echo ""
echo "Cron job: $CRON_CMD"
echo ""
echo "This will run daily at 3:00 AM"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "renew-webhooks.js"; then
  echo "⚠️  Cron job already exists!"
  echo ""
  echo "Current cron jobs:"
  crontab -l | grep "renew-webhooks.js"
  echo ""
  read -p "Replace existing cron job? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
  fi
  
  # Remove old cron job
  crontab -l | grep -v "renew-webhooks.js" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -

echo "✅ Cron job installed!"
echo ""
echo "To verify:"
echo "  crontab -l | grep webhook"
echo ""
echo "To view logs:"
echo "  tail -f $LOG_DIR/webhook-renewal.log"
echo ""
echo "To remove:"
echo "  crontab -e"
echo "  (delete the renew-webhooks.js line)"
