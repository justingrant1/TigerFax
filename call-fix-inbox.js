/**
 * Call the fixInboxIssue Cloud Function
 */

const https = require('https');

const FUNCTION_URL = 'https://us-central1-tigerfax-e3915.cloudfunctions.net/fixInboxIssue';

const payload = {
  email: 'jgkoff+10@gmail.com',
  faxNumber: '+12232426242',
  faxId: '01KGP2VJ08AX9K9X314QGH9HF3',
  from: '+16464377113',
  pages: 2,
  receivedAt: '2026-02-05T05:02:28Z'
};

console.log('\n🔧 Calling fixInboxIssue Cloud Function...');
console.log('📧 Email:', payload.email);
console.log('📠 Fax Number:', payload.faxNumber);
console.log('📄 Fax ID:', payload.faxId);
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
        console.log('✅ SUCCESS!');
        console.log('');
        console.log('Results:');
        console.log('  User ID:', result.uid);
        console.log('  Fax Number Updated:', result.faxNumberUpdated ? 'Yes' : 'No');
        console.log('  Fax Added to Inbox:', result.faxAdded ? 'Yes' : 'Already existed');
        console.log('  Total Faxes in Inbox:', result.inboxCount);
        console.log('');
        console.log('Message:', result.message);
        console.log('');
        console.log('📱 The user should now see the fax in their inbox!');
        console.log('   Have them refresh the app.');
      } else {
        console.log('❌ FAILED');
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
