/**
 * Migration Script: Update Activity Types
 * Adds new activity types to agentic_activities table
 * Run: node run-activity-types-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🔄 Running activity types migration...\n');

  try {
    // Read SQL file
    const sqlPath = join(__dirname, 'db_setup', 'update-activity-types.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL Migration:');
    console.log(sql);
    console.log('\n');

    // Execute migration
    console.log('⚙️  Executing migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct execution via REST API if RPC doesn't exist
      console.log('⚠️  RPC method not available, trying direct execution...\n');
      
      // Split into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT'));

      for (const statement of statements) {
        if (statement) {
          console.log(`▶ Executing: ${statement.substring(0, 80)}...`);
          const result = await supabase.rpc('exec', { query: statement });
          if (result.error) {
            console.error(`❌ Error: ${result.error.message}`);
          } else {
            console.log('✅ Success');
          }
        }
      }
      
      console.log('\n⚠️  Note: You may need to run this SQL manually in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/wipfxrpiuwqtsaummrwk/editor');
      console.log('\nCopy the SQL from: server/db_setup/update-activity-types.sql\n');
      
    } else {
      console.log('✅ Migration executed successfully!');
      console.log('Result:', data);
    }

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('\n✅ Migration complete!');
    console.log('Now restart your server and test activity generation again.');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
