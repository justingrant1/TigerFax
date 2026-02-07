/**
 * Test the webhook directly with a sample payload
 */

const https = require('https');

const WEBHOOK_URL = 'https://us-central1-tigerfax-e3915.cloudfunctions.net/incomingFaxWebhook';

// Sample payload based on Sinch format
const payload = {
  event: {
    fax: {
      id: '01KGP2VJ08AX9K9X314QGH9HF3',
      from: '+16464377113',
      to: '+12232426242',
      numberOfPages: 2,
      status: 'COMPLETED',
      createTime: '2026-02-05T05:02:28Z',
      completedTime: '2026-02-05T05:02:28Z',
    }
  }
};

console.log('\n🧪 Testing webhook with sample payload...');
console.log('URL:', WEBHOOK_URL);
console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('');

const data = JSON.stringify(payload);

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const url = new URL(WEBHOOK_URL);
const reqOptions = {
  hostname: url.hostname,
  path: url.pathname,
  ...options
};

const req = https.request(reqOptions, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', responseData);
    console.log('');
    
    if (res.statusCode === 200) {
      console.log('✅ Webhook responded successfully');
    } else {
      console.log('❌ Webhook returned error');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error calling webhook:', error.message);
});

req.write(data);
req.end();
