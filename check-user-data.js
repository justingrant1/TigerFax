/**
 * Check user data and inbox via Cloud Function
 */

const https = require('https');

// We'll use the fixInboxIssue function just to query the user data
const FUNCTION_URL = 'https://us-central1-tigerfax-e3915.cloudfunctions.net/fixInboxIssue';

const payload = {
  email: 'jgkoff+10@gmail.com',
  faxNumber: '+12232426242',
  faxId: 'DUMMY_ID_FOR_QUERY', // Won't add anything, just query
};

console.log('\n🔍 Checking user data and inbox...');
console.log('📧 Email:', payload.email);
console.log('');

const data = JSON.stringify(payload);

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(FUNCTION_URL, options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('');

    try {
      const result = JSON.parse(responseData);
      
      if (result.success) {
        console.log('✅ User Found');
        console.log('');
        console.log('User Details:');
        console.log('  UID:', result.uid);
        console.log('  Fax Number Updated:', result.faxNumberUpdated ? 'Yes' : 'No');
        console.log('  Total Faxes in Inbox:', result.inboxCount);
        console.log('');
        console.log('Message:', result.message);
      } else {
        console.log('❌ Error');
        console.log('Error:', result.error);
        console.log('Message:', result.message);
      }
    } catch (e) {
      console.log('Response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error calling function:', error.message);
});

req.write(data);
req.end();
