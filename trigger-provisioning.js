/**
 * Manual script to trigger fax number provisioning for existing Pro users
 * Run with: node trigger-provisioning.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
// This will use the Firebase CLI credentials
admin.initializeApp({
  projectId: 'tigerfax-e3915'
});

const db = admin.firestore();

async function provisionForExistingProUsers() {
  try {
    console.log('🔍 Searching for Pro users without fax numbers...');
    
    const usersSnapshot = await db.collection('users')
      .where('subscriptionTier', '==', 'pro')
      .get();
    
    console.log(`📊 Found ${usersSnapshot.size} Pro users`);
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;
      
      if (!userData.faxNumber) {
        console.log(`\n👤 User ${uid} (${userData.email}) needs a fax number`);
        console.log('   Triggering provisioning by updating document...');
        
        // Trigger the Cloud Function by updating the document
        // This simulates an upgrade by changing a field
        await db.collection('users').doc(uid).update({
          lastProvisioningAttempt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('   ✅ Update triggered - Cloud Function should provision number');
      } else {
        console.log(`\n✓ User ${uid} already has fax number: ${userData.faxNumber}`);
      }
    }
    
    console.log('\n✅ Done! Check Firebase Functions logs to see provisioning status.');
    console.log('   View logs: https://console.firebase.google.com/project/tigerfax-e3915/functions/logs');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

provisionForExistingProUsers();
