/**
 * Delete the broken fax and re-add it with proper PDF
 */

const https = require('https');

const FUNCTION_URL = 'https://us-central1-tigerfax-e3915.cloudfunctions.net/fixInboxIssue';

// First, we need to manually delete the fax from Firestore
// Then call the fix function again to re-add it with the PDF

const payload = {
  email: 'jgkoff+10@gmail.com',
  faxNumber: '+12232426242',
  faxId: '01KGPICZPMN288OAAW647ZSR2Q',
  from: '+16464377113',
  pages: 2,
  receivedAt: '2026-02-05T04:36:29Z'
};

console.log('\n🔧 Re-fixing inbox with proper PDF download...');
console.log('📧 Email:', payload.email);
console.log('📠 Fax Number:', payload.faxNumber);
console.log('📄 Fax ID:', payload.faxId);
console.log('');
console.log('⚠️  NOTE: You need to manually delete the fax from Firestore first!');
console.log('   Go to Firebase Console → Firestore → users → [uid] → inbox → 01KGPICZPMN288OAAW647ZSR2Q');
console.log('   Delete that document, then run this script again.');
console.log('');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');

setTimeout(() => {
  console.log('\n📞 Calling fixInboxIssue function...\n');

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
          console.log('  PDF Downloaded:', result.pdfDownloaded ? 'Yes ✅' : 'No ❌');
          console.log('  Total Faxes in Inbox:', result.inboxCount);
          console.log('');
          console.log('Message:', result.message);
          console.log('');
          
          if (result.pdfDownloaded) {
            console.log('🎉 PDF was successfully downloaded and uploaded!');
            console.log('📱 The user should now be able to view the fax PDF in the app.');
          } else {
            console.log('⚠️  PDF download failed. Check Firebase logs for details.');
          }
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
}, 5000);
