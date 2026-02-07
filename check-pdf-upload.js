const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'tigerfax-4a652.appspot.com'
});

const db = admin.firestore();

async function checkPDFUpload() {
  try {
    // Get the latest fax from inbox
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const inboxSnapshot = await db.collection('users')
        .doc(userDoc.id)
        .collection('inbox')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (!inboxSnapshot.empty) {
        const fax = inboxSnapshot.docs[0].data();
        console.log('\n=== Latest Fax ===');
        console.log('User:', userDoc.id);
        console.log('Fax ID:', inboxSnapshot.docs[0].id);
        console.log('Storage Path:', fax.storagePath || 'MISSING');
        console.log('Document URL:', fax.documentUrl || 'MISSING');
        console.log('From:', fax.from);
        console.log('Pages:', fax.pages);
        console.log('Received At:', fax.receivedAt);
        
        // Check if file exists in storage
        if (fax.storagePath) {
          const bucket = admin.storage().bucket();
          const file = bucket.file(fax.storagePath);
          const [exists] = await file.exists();
          console.log('File exists in storage:', exists);
          
          if (exists) {
            const [metadata] = await file.getMetadata();
            console.log('File size:', metadata.size, 'bytes');
            console.log('Content type:', metadata.contentType);
          }
        } else {
          console.log('⚠️  NO STORAGE PATH - PDF was not uploaded!');
        }
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPDFUpload();
