#!/bin/bash

# Fix Database Schema Issues
# Fixes: 
# 1. conversations.role column missing
# 2. agentic_activities.metadata column missing

echo "🔧 Fixing database schema..."
echo ""

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  SUPABASE_DB_URL environment variable not set"
    echo ""
    echo "Please run the SQL files manually in Supabase SQL Editor:"
    echo "1. db_setup/fix-conversations-table.sql"
    echo "2. db_setup/add-metadata-to-activities.sql"
    echo ""
    exit 1
fi

echo "📝 Fixing conversations table (role column)..."
psql "$SUPABASE_DB_URL" -f db_setup/fix-conversations-table.sql

if [ $? -eq 0 ]; then
    echo "✅ Conversations table fixed!"
else
    echo "❌ Failed to fix conversations table"
    exit 1
fi

echo ""
echo "📝 Adding metadata column to agentic_activities..."
psql "$SUPABASE_DB_URL" -f db_setup/add-metadata-to-activities.sql

if [ $? -eq 0 ]; then
    echo "✅ Metadata column added!"
else
    echo "❌ Failed to add metadata column"
    exit 1
fi

echo ""
echo "🎉 All database fixes applied successfully!"
echo ""
echo "You can now:"
echo "- Use mood conversation feature"
echo "- Add activities with user context"
echo "- Run analytics on user intent"
