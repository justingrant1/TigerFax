/**
 * Test configuring a number for FAX
 * Run with: node test-configure-fax.js <phoneNumber>
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

async function getNumberDetails(phoneNumber) {
  console.log(`\n🔍 Getting details for ${phoneNumber}...\n`);
  
  const response = await fetch(
    `${baseUrl}/activeNumbers/${encodeURIComponent(phoneNumber)}`,
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
    console.error('❌ Failed:', response.status, errorText);
    return null;
  }

  const data = await response.json();
  console.log('Current configuration:');
  console.log('  Voice Config Type:', data.voiceConfiguration?.type || 'None');
  console.log('  Service ID:', data.voiceConfiguration?.serviceId || 'None');
  console.log('  Capabilities:', data.capability?.join(', '));
  return data;
}

async function configureForFax(phoneNumber, serviceId) {
  console.log(`\n🔧 Configuring ${phoneNumber} for FAX...\n`);
  
  const requestBody = {
    voiceConfiguration: {
      type: 'FAX',
      serviceId: serviceId,
    },
  };
  
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  const response = await fetch(
    `${baseUrl}/activeNumbers/${encodeURIComponent(phoneNumber)}`,
    {
      method: 'PATCH',
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
  const phoneNumber = process.argv[2];
  
  if (!phoneNumber) {
    console.error('❌ Please provide a phone number');
    console.log('Usage: node test-configure-fax.js <phoneNumber>');
    console.log('Example: node test-configure-fax.js +14013947431');
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 TEST FAX CONFIGURATION');
  console.log('═══════════════════════════════════════════════════════');

  try {
    // Get current config
    const before = await getNumberDetails(phoneNumber);
    
    if (!before) {
      console.error('\n❌ Number not found or error getting details');
      return;
    }

    // Configure for FAX
    const serviceId = '01KGEAPNC5AY23XS2615BA4VNY'; // Your existing FAX service ID
    const success = await configureForFax(phoneNumber, serviceId);
    
    if (success) {
      // Get updated config
      console.log('\n═══════════════════════════════════════════════════════');
      console.log('📊 VERIFICATION');
      console.log('═══════════════════════════════════════════════════════');
      await getNumberDetails(phoneNumber);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

main();
