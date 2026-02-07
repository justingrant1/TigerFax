const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkLatestFax() {
  try {
    // Get the user with fax number +12232426242
    const usersSnapshot = await db.collection('users')
      .where('faxNumber', '==', '+12232426242')
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No user found with fax number +12232426242');
      return;
    }
    
    const userId = usersSnapshot.docs[0].id;
    console.log(`✓ Found user: ${userId}`);
    
    // Get the latest fax from inbox
    const inboxSnapshot = await db.collection('users').doc(userId).collection('inbox')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (inboxSnapshot.empty) {
      console.log('❌ No faxes in inbox');
      return;
    }
    
    const faxDoc = inboxSnapshot.docs[0];
    const faxData = faxDoc.data();
    
    console.log('\n📠 Latest Fax Details:');
    console.log('='.repeat(50));
    console.log(`Fax ID: ${faxDoc.id}`);
    console.log(`From: ${faxData.from}`);
    console.log(`To: ${faxData.to}`);
    console.log(`Pages: ${faxData.pages}`);
    console.log(`Received At: ${faxData.receivedAt}`);
    console.log(`Storage Path: "${faxData.storagePath || ''}"`);
    console.log(`Document URL: "${faxData.documentUrl || ''}"`);
    console.log(`Read: ${faxData.read}`);
    console.log('='.repeat(50));
    
    if (!faxData.storagePath || faxData.storagePath === '') {
      console.log('\n❌ PROBLEM: storagePath is empty!');
      console.log('This means the PDF upload failed.');
    } else {
      console.log('\n✓ storagePath is populated');
      
      // Check if file exists in Storage
      const bucket = admin.storage().bucket();
      const file = bucket.file(faxData.storagePath);
      const [exists] = await file.exists();
      
      if (exists) {
        const [metadata] = await file.getMetadata();
        console.log(`✓ PDF file exists in Storage`);
        console.log(`  Size: ${metadata.size} bytes`);
        console.log(`  Content-Type: ${metadata.contentType}`);
      } else {
        console.log(`❌ PDF file does NOT exist in Storage at: ${faxData.storagePath}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkLatestFax();
