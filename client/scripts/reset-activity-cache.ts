/**
 * Manual Cache Reset Script
 * Run this to clear activity generation flags and force regeneration
 * 
 * Usage:
 *   npx ts-node scripts/reset-activity-cache.ts
 * 
 * Or add to package.json:
 *   "reset-cache": "ts-node scripts/reset-activity-cache.ts"
 */

import * as SecureStore from 'expo-secure-store';

async function resetActivityCache() {
  console.log('🧹 Starting cache reset...\n');

  try {
    // Get today's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0];
    };

    const dates = [
      { label: 'Yesterday', date: yesterday, key: `activities_generated_date_${formatDate(yesterday)}` },
      { label: 'Today', date: today, key: `activities_generated_date_${formatDate(today)}` },
      { label: 'Tomorrow', date: tomorrow, key: `activities_generated_date_${formatDate(tomorrow)}` },
    ];

    console.log('📅 Cache keys to reset:');
    dates.forEach(d => {
      console.log(`   - ${d.label} (${formatDate(d.date)}): ${d.key}`);
    });
    console.log('');

    // Delete cache flags
    for (const d of dates) {
      try {
        await SecureStore.deleteItemAsync(d.key);
        console.log(`✅ Cleared: ${d.label}`);
      } catch (err) {
        console.log(`⚠️  ${d.label} cache not found (already clear)`);
      }
    }

    console.log('\n✨ Cache reset complete!');
    console.log('📱 Next time you open Today/Tomorrow tab, activities will regenerate.\n');
    
  } catch (error) {
    console.error('❌ Error resetting cache:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  resetActivityCache()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export default resetActivityCache;
