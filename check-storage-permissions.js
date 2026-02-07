/**
 * Check Firebase Storage permissions and test upload
 */

const admin = require('firebase-admin');

// Initialize with project ID
admin.initializeApp({
  projectId: 'tigerfax-e3915'
});

const db = admin.firestore();
const storage = admin.storage();

async function checkStoragePermissions() {
  try {
    console.log('Testing Firebase Storage permissions...\n');
    
    // Get user
    const usersSnapshot = await db.collection('users')
      .where('faxNumber', '==', '+12232426242')
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No user found');
      return;
    }
    
    const userId = usersSnapshot.docs[0].id;
    console.log(`✓ Found user: ${userId}\n`);
    
    // Try to upload a test file
    const bucket = storage.bucket();
    const testFileName = `receivedFaxes/${userId}/test-upload.txt`;
    const testFile = bucket.file(testFileName);
    
    console.log(`Attempting to upload test file: ${testFileName}`);
    
    try {
      await testFile.save('This is a test file to verify Storage permissions', {
        contentType: 'text/plain',
        metadata: {
          test: 'true',
          uploadedAt: new Date().toISOString(),
        },
      });
      
      console.log('✅ SUCCESS! File uploaded successfully');
      console.log('Storage permissions are working correctly\n');
      
      // Clean up test file
      await testFile.delete();
      console.log('✓ Test file cleaned up');
      
    } catch (uploadError) {
      console.log('❌ UPLOAD FAILED!');
      console.log('Error:', uploadError.message);
      console.log('\nThis is the problem - Cloud Function cannot write to Storage');
      console.log('\nPossible causes:');
      console.log('1. Storage rules are blocking writes');
      console.log('2. Service account lacks permissions');
      console.log('3. Storage bucket not properly configured');
      
      if (uploadError.code) {
        console.log(`\nError code: ${uploadError.code}`);
      }
    }
    
    // Check latest fax
    console.log('\n' + '='.repeat(60));
    console.log('Checking latest fax in inbox...\n');
    
    const inboxSnapshot = await db.collection('users').doc(userId).collection('inbox')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (!inboxSnapshot.empty) {
      const faxDoc = inboxSnapshot.docs[0];
      const faxData = faxDoc.data();
      
      console.log(`Fax ID: ${faxDoc.id}`);
      console.log(`Storage Path: "${faxData.storagePath || '(empty)'}"`);
      console.log(`Document URL: "${faxData.documentUrl || '(empty)'}"`);
      
      if (!faxData.storagePath) {
        console.log('\n❌ Storage path is empty - PDF was not uploaded');
      } else {
        console.log('\n✓ Storage path exists');
        
        // Check if file actually exists
        const file = bucket.file(faxData.storagePath);
        const [exists] = await file.exists();
        
        if (exists) {
          console.log('✓ PDF file exists in Storage');
        } else {
          console.log('❌ PDF file does NOT exist in Storage');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkStoragePermissions();
