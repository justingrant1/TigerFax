/**
 * Test script to debug Sinch Number Renting API
 * Run with: node test-sinch-rent.js
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
  console.log('\n🔍 STEP 1: Searching for available numbers...\n');
  
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
    console.log('First number:', data.availableNumbers[0].phoneNumber);
    console.log('Capabilities:', data.availableNumbers[0].capabilities);
    return data.availableNumbers[0].phoneNumber;
  }
  
  return null;
}

async function testRentNumber(phoneNumber, testName, requestBody) {
  console.log(`\n📞 ${testName}\n`);
  console.log('Phone number:', phoneNumber);
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  const response = await fetch(
    `${baseUrl}/availableNumbers/${encodeURIComponent(phoneNumber)}:rent`,
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
    return true;
  } else {
    console.log('❌ FAILED');
    console.log('Error:', responseText);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 SINCH NUMBER RENT API TEST');
  console.log('═══════════════════════════════════════════════════════');

  try {
    // Step 1: Search for a number
    const phoneNumber = await searchNumbers();
    
    if (!phoneNumber) {
      console.error('\n❌ No available numbers found. Cannot proceed with tests.');
      return;
    }

    // Test 1: Try with FAX configuration (current approach - we know this fails)
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 1: Rent with FAX configuration (current approach)');
    console.log('═══════════════════════════════════════════════════════');
    
    await testRentNumber(phoneNumber, 'TEST 1: With FAX config', {
      voiceConfiguration: {
        type: 'FAX',
        serviceId: 'https://us-central1-tigerfax-e3915.cloudfunctions.net/incomingFaxWebhook',
      },
      callbackUrl: 'https://us-central1-tigerfax-e3915.cloudfunctions.net/incomingFaxWebhook',
    });

    // Test 2: Try with no configuration (minimal request)
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 2: Rent with NO configuration (minimal)');
    console.log('═══════════════════════════════════════════════════════');
    
    const success2 = await testRentNumber(phoneNumber, 'TEST 2: No config', {});
    
    if (success2) {
      console.log('\n✅ SUCCESS! Minimal request works. We should use this approach.');
      return;
    }

    // Test 3: Try with EST voice configuration
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 3: Rent with EST voice configuration');
    console.log('═══════════════════════════════════════════════════════');
    
    const success3 = await testRentNumber(phoneNumber, 'TEST 3: EST config', {
      voiceConfiguration: {
        type: 'EST',
      },
    });

    if (success3) {
      console.log('\n✅ SUCCESS! EST configuration works.');
      return;
    }

    // Test 4: Try with RTC voice configuration
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 4: Rent with RTC voice configuration');
    console.log('═══════════════════════════════════════════════════════');
    
    const success4 = await testRentNumber(phoneNumber, 'TEST 4: RTC config', {
      voiceConfiguration: {
        type: 'RTC',
      },
    });

    if (success4) {
      console.log('\n✅ SUCCESS! RTC configuration works.');
      return;
    }

    // Test 5: Try with just callbackUrl
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 5: Rent with just callbackUrl');
    console.log('═══════════════════════════════════════════════════════');
    
    const success5 = await testRentNumber(phoneNumber, 'TEST 5: Just callback', {
      callbackUrl: 'https://us-central1-tigerfax-e3915.cloudfunctions.net/incomingFaxWebhook',
    });

    if (success5) {
      console.log('\n✅ SUCCESS! Just callbackUrl works.');
      return;
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('❌ All tests failed. Check Sinch documentation or contact support.');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ Test script error:', error);
  }
}

main();
