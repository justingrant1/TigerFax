/**
 * Fix inbox issue - Check and update user's fax number, then manually add the fax
 */

require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin - will use Application Default Credentials
// Make sure you're logged in with: firebase login
admin.initializeApp({
  projectId: 'tigerfax-e3915',
  storageBucket: 'tigerfax-e3915.firebasestorage.app',
});

const db = admin.firestore();

async function fixInboxIssue() {
  const email = 'jgkoff+10@gmail.com';
  const expectedFaxNumber = '+12232426242';
  const faxId = '01KGPICZPMN288OAAW647ZSR2Q';
  
  console.log(`\n🔧 Fixing inbox issue for: ${email}`);
  console.log(`📠 Expected fax number: ${expectedFaxNumber}`);
  console.log(`📄 Fax ID: ${faxId}\n`);
  
  try {
    // Step 1: Find user by email
    console.log('Step 1: Finding user...');
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      console.log('❌ User not found with email:', email);
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const uid = userDoc.id;
    const userData = userDoc.data();
    
    console.log('✅ User found:');
    console.log('   UID:', uid);
    console.log('   Email:', userData.email);
    console.log('   Current Fax Number:', userData.faxNumber || 'NOT SET');
    console.log('   Subscription Tier:', userData.subscriptionTier);
    console.log('   Unread Count:', userData.unreadFaxCount || 0);
    
    // Step 2: Fix fax number if needed
    console.log('\nStep 2: Checking fax number...');
    if (userData.faxNumber !== expectedFaxNumber) {
      console.log(`⚠️  Fax number mismatch!`);
      console.log(`   Current: ${userData.faxNumber || 'NOT SET'}`);
      console.log(`   Expected: ${expectedFaxNumber}`);
      console.log(`\n🔧 Updating fax number...`);
      
      await db.collection('users').doc(uid).update({
        faxNumber: expectedFaxNumber,
        faxNumberAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log('✅ Fax number updated successfully!');
    } else {
      console.log('✅ Fax number is correct!');
    }
    
    // Step 3: Check if fax already exists in inbox
    console.log('\nStep 3: Checking if fax already exists in inbox...');
    const existingFax = await db.collection('users')
      .doc(uid)
      .collection('inbox')
      .doc(faxId)
      .get();
    
    if (existingFax.exists) {
      console.log('✅ Fax already exists in inbox!');
      const faxData = existingFax.data();
      console.log('   From:', faxData.from);
      console.log('   Pages:', faxData.pages);
      console.log('   Received:', faxData.receivedAt);
    } else {
      console.log('❌ Fax not in inbox, adding it now...');
      
      // Step 4: Add fax to inbox
      await db.collection('users')
        .doc(uid)
        .collection('inbox')
        .doc(faxId)
        .set({
          faxId: faxId,
          from: '+16464377113',
          to: expectedFaxNumber,
          pages: 2,
          receivedAt: '2026-02-05T04:36:29Z',
          documentUrl: '',
          storagePath: `receivedFaxes/${uid}/${faxId}.pdf`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      
      console.log('✅ Fax added to inbox!');
      
      // Step 5: Update unread count
      await db.doc(`users/${uid}`).update({
        unreadFaxCount: admin.firestore.FieldValue.increment(1),
      });
      
      console.log('✅ Unread count updated!');
    }
    
    // Step 6: Show final inbox status
    console.log('\nStep 4: Final inbox status...');
    const inboxSnapshot = await db.collection('users')
      .doc(uid)
      .collection('inbox')
      .orderBy('receivedAt', 'desc')
      .get();
    
    console.log(`📥 Total faxes in inbox: ${inboxSnapshot.size}`);
    
    if (inboxSnapshot.size > 0) {
      console.log('\nFaxes:');
      inboxSnapshot.forEach((doc, index) => {
        const fax = doc.data();
        console.log(`${index + 1}. ${doc.id}`);
        console.log(`   From: ${fax.from}`);
        console.log(`   To: ${fax.to}`);
        console.log(`   Pages: ${fax.pages}`);
        console.log(`   Read: ${fax.read}`);
        console.log('');
      });
    }
    
    console.log('\n✅ All done! The user should now see the fax in their inbox.');
    console.log('📱 Have the user refresh the app to see the changes.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
  
  process.exit(0);
}

fixInboxIssue();
