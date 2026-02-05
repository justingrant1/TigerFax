/**
 * Cleanup script to release extra numbers that were rented during testing
 * Run with: node cleanup-extra-numbers.js
 */

const fetch = require('node-fetch');

// Sinch credentials
const SINCH_PROJECT_ID = '881d6487-fb61-4c40-85b1-ed77a90c7334';
const SINCH_KEY_ID = '945ba97f-aa5b-4ce1-a899-61a399da99b1';
const SINCH_KEY_SECRET = '5o76bjtWk3RK47NodVmS5fRbCK';

const baseUrl = `https://numbers.api.sinch.com/v1/projects/${SINCH_PROJECT_ID}`;

function getAuthHeader() {
  const credentials = `${SINCH_KEY_ID}:${SINCH_KEY_SECRET}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

async function listActiveNumbers() {
  console.log('\n📋 Fetching active numbers...\n');
  
  const response = await fetch(
    `${baseUrl}/activeNumbers`,
    {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list active numbers: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.activeNumbers || [];
}

async function releaseNumber(phoneNumber) {
  console.log(`\n🗑️  Releasing ${phoneNumber}...`);
  
  const response = await fetch(
    `${baseUrl}/activeNumbers/${encodeURIComponent(phoneNumber)}:release`,
    {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    console.error(`   ❌ Failed: ${response.status} - ${errorText}`);
    return false;
  }

  console.log('   ✅ Released successfully');
  return true;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧹 CLEANUP EXTRA SINCH NUMBERS');
  console.log('═══════════════════════════════════════════════════════');

  try {
    const activeNumbers = await listActiveNumbers();
    
    console.log(`Found ${activeNumbers.length} active numbers:\n`);
    
    activeNumbers.forEach((num, i) => {
      console.log(`${i + 1}. ${num.phoneNumber}`);
      console.log(`   Type: ${num.type}`);
      console.log(`   Capabilities: ${num.capability?.join(', ')}`);
      console.log(`   Voice Config: ${num.voiceConfiguration?.type || 'None'}`);
      console.log(`   Cost: $${num.money?.amount || '?'}/month`);
      console.log('');
    });

    if (activeNumbers.length === 0) {
      console.log('✅ No active numbers to clean up.');
      return;
    }

    // Keep only the first number (or the one configured for FAX)
    const numbersToKeep = activeNumbers.filter(num => 
      num.voiceConfiguration?.type === 'FAX'
    );

    if (numbersToKeep.length === 0 && activeNumbers.length > 0) {
      // If none are configured for FAX, keep the first one
      numbersToKeep.push(activeNumbers[0]);
    }

    const numbersToRelease = activeNumbers.filter(num => 
      !numbersToKeep.includes(num)
    );

    if (numbersToRelease.length === 0) {
      console.log('✅ All numbers are needed. Nothing to clean up.');
      return;
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log(`📌 Keeping ${numbersToKeep.length} number(s):`);
    numbersToKeep.forEach(num => console.log(`   ✅ ${num.phoneNumber}`));
    
    console.log(`\n🗑️  Will release ${numbersToRelease.length} number(s):`);
    numbersToRelease.forEach(num => console.log(`   ❌ ${num.phoneNumber}`));
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('⏳ Waiting 3 seconds before releasing... (Press Ctrl+C to cancel)\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Release extra numbers
    for (const num of numbersToRelease) {
      await releaseNumber(num.phoneNumber);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between releases
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Cleanup complete!');
    console.log('═══════════════════════════════════════════════════════\n');

    // Show final count
    const finalNumbers = await listActiveNumbers();
    console.log(`📊 Final count: ${finalNumbers.length} active number(s)\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

main();
