/**
 * Test script v2 - Test different number formats and endpoints
 * Run with: node test-sinch-rent-v2.js
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

async function searchNumbers() {
  console.log('\n🔍 Searching for available numbers...\n');
  
  const response = await fetch(
    `${baseUrl}/availableNumbers?regionCode=US&type=LOCAL&capabilities=VOICE`,
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
    console.error('❌ Search failed:', response.status, errorText);
    return null;
  }

  const data = await response.json();
  console.log('✅ Search successful!');
  console.log('Available numbers:', data.availableNumbers?.length || 0);
  
  if (data.availableNumbers && data.availableNumbers.length > 0) {
    // Show first 3 numbers
    console.log('\nFirst 3 available numbers:');
    data.availableNumbers.slice(0, 3).forEach((num, i) => {
      console.log(`  ${i + 1}. ${num.phoneNumber}`);
      console.log(`     Capabilities: ${JSON.stringify(num.capabilities)}`);
      console.log(`     Type: ${num.type}`);
      console.log(`     Region: ${num.regionCode}`);
    });
    
    return data.availableNumbers;
  }
  
  return null;
}

async function testRentWithDifferentFormats(phoneNumber) {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🧪 Testing different phone number formats');
  console.log('═══════════════════════════════════════════════════════');
  
  const formats = [
    { name: 'Original format', value: phoneNumber },
    { name: 'Without +', value: phoneNumber.replace('+', '') },
    { name: 'URL encoded', value: encodeURIComponent(phoneNumber) },
  ];
  
  for (const format of formats) {
    console.log(`\n📞 Testing: ${format.name} = "${format.value}"`);
    
    const response = await fetch(
      `${baseUrl}/availableNumbers/${format.value}:rent`,
      {
        method: 'POST',
        headers: {
          Authorization: getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    console.log(`   Status: ${response.status}`);
    const responseText = await response.text();
    
    if (response.ok) {
      console.log('   ✅ SUCCESS!');
      console.log('   Response:', responseText);
      return true;
    } else {
      console.log('   ❌ Failed:', responseText.substring(0, 200));
    }
  }
  
  return false;
}

async function testRentAnyNumber() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🧪 Testing rentAnyNumber endpoint');
  console.log('═══════════════════════════════════════════════════════');
  
  const requestBody = {
    regionCode: 'US',
    type: 'LOCAL',
    capabilities: ['VOICE'],
  };
  
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  const response = await fetch(
    `${baseUrl}/availableNumbers:rentAny`,
    {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }
  );

  console.log('Response status:', response.status);
  const responseText = await response.text();
  
  if (response.ok) {
    console.log('✅ SUCCESS!');
    console.log('Response:', responseText);
    return JSON.parse(responseText);
  } else {
    console.log('❌ FAILED');
    console.log('Error:', responseText);
    return null;
  }
}

async function listActiveNumbers() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📋 Listing currently active numbers');
  console.log('═══════════════════════════════════════════════════════');
  
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
    console.error('❌ Failed to list active numbers:', response.status, errorText);
    return;
  }

  const data = await response.json();
  console.log('✅ Active numbers:', data.activeNumbers?.length || 0);
  
  if (data.activeNumbers && data.activeNumbers.length > 0) {
    data.activeNumbers.forEach((num, i) => {
      console.log(`\n  ${i + 1}. ${num.phoneNumber}`);
      console.log(`     Capabilities: ${JSON.stringify(num.capability)}`);
      console.log(`     Voice config: ${JSON.stringify(num.voiceConfiguration)}`);
    });
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 SINCH NUMBER RENT API TEST V2');
  console.log('═══════════════════════════════════════════════════════');

  try {
    // First, list any active numbers
    await listActiveNumbers();
    
    // Search for available numbers
    const availableNumbers = await searchNumbers();
    
    if (!availableNumbers || availableNumbers.length === 0) {
      console.error('\n❌ No available numbers found. Cannot proceed with tests.');
      return;
    }

    const phoneNumber = availableNumbers[0].phoneNumber;
    
    // Test 1: Try rentAnyNumber endpoint (simpler approach)
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('APPROACH 1: Use rentAny endpoint (recommended)');
    console.log('═══════════════════════════════════════════════════════');
    
    const rentedNumber = await testRentAnyNumber();
    
    if (rentedNumber) {
      console.log('\n✅✅✅ SUCCESS! rentAny works!');
      console.log('This is the recommended approach - let Sinch pick the number.');
      console.log('Rented number:', rentedNumber.phoneNumber || 'check response');
      return;
    }
    
    // Test 2: Try different formats for specific number
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('APPROACH 2: Rent specific number with different formats');
    console.log('═══════════════════════════════════════════════════════');
    
    await testRentWithDifferentFormats(phoneNumber);

  } catch (error) {
    console.error('\n❌ Test script error:', error);
  }
}

main();
