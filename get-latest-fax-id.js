/**
 * Get the latest fax ID from Sinch to manually fix it
 */

const https = require('https');

// Sinch API configuration
const SINCH_PROJECT_ID = '881d6487-fb61-4c40-85b1-ed77a90c7334';
const SINCH_KEY_ID = '945ba97f-aa5b-4ce1-a899-61a399da99b1';
const SINCH_KEY_SECRET = '5o76bjtWk3RK47NodVmS5fRbCK';

const credentials = `${SINCH_KEY_ID}:${SINCH_KEY_SECRET}`;
const authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;

const options = {
  hostname: 'fax.api.sinch.com',
  path: `/v3/projects/${SINCH_PROJECT_ID}/faxes?direction=INBOUND&pageSize=5`,
  method: 'GET',
  headers: {
    'Authorization': authHeader,
  }
};

console.log('\n📠 Fetching latest inbound faxes from Sinch...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.faxes && result.faxes.length > 0) {
        console.log(`Found ${result.faxes.length} recent inbound fax(es):\n`);
        
        result.faxes.forEach((fax, index) => {
          console.log(`${index + 1}. Fax ID: ${fax.id}`);
          console.log(`   To: ${fax.to}`);
          console.log(`   From: ${fax.from}`);
          console.log(`   Pages: ${fax.numberOfPages}`);
          console.log(`   Status: ${fax.status}`);
          console.log(`   Completed: ${fax.completedTime}`);
          console.log('');
        });
        
        console.log('\n💡 To fix the latest fax, run:');
        console.log(`   node call-fix-inbox.js`);
        console.log(`   (Update the faxId in call-fix-inbox.js to: ${result.faxes[0].id})`);
      } else {
        console.log('No faxes found');
      }
    } catch (e) {
      console.error('Error parsing response:', e.message);
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
