#!/bin/bash

# Fix Conversations Table Schema
# Run this script to fix the "column conversations.role does not exist" error

echo "🔧 Fixing conversations table schema..."
echo ""

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ SUPABASE_DB_URL environment variable not set"
    echo "Please set it in your .env file or export it:"
    echo "export SUPABASE_DB_URL='postgresql://postgres:[password]@[host]:[port]/postgres'"
    echo ""
    echo "Or run the SQL manually in Supabase SQL Editor:"
    echo "cat db_setup/fix-conversations-table.sql"
    exit 1
fi

# Run the fix
psql "$SUPABASE_DB_URL" -f db_setup/fix-conversations-table.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Conversations table fixed successfully!"
    echo "You can now use the mood conversation feature."
else
    echo ""
    echo "❌ Failed to fix table. Please run manually in Supabase SQL Editor:"
    echo "1. Go to Supabase Dashboard → SQL Editor"
    echo "2. Copy contents from: db_setup/fix-conversations-table.sql"
    echo "3. Run the query"
    exit 1
fi
