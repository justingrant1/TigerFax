/**
 * Check and fix user's fax number format
 */

const admin = require('firebase-admin');

// Initialize with environment variables (same as Cloud Functions)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'tigerfax-e3915',
});

const db = admin.firestore();

async function fixUserFaxNumber() {
  const email = 'jgkoff+10@gmail.com';
  const expectedFaxNumber = '+12232426242';
  
  console.log(`\n🔍 Checking user: ${email}`);
  console.log(`📠 Expected fax number: ${expectedFaxNumber}\n`);
  
  try {
    // Find user by email
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
    
    // Check if fax number needs updating
    if (userData.faxNumber !== expectedFaxNumber) {
      console.log(`\n⚠️  Fax number mismatch!`);
      console.log(`   Current: ${userData.faxNumber || 'NOT SET'}`);
      console.log(`   Expected: ${expectedFaxNumber}`);
      console.log(`\n🔧 Updating fax number...`);
      
      await db.collection('users').doc(uid).update({
        faxNumber: expectedFaxNumber,
        faxNumberAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log('✅ Fax number updated successfully!');
    } else {
      console.log('\n✅ Fax number is correct!');
    }
    
    // Check inbox
    console.log('\n📥 Checking inbox...');
    const inboxSnapshot = await db.collection('users')
      .doc(uid)
      .collection('inbox')
      .get();
    
    console.log(`   Found ${inboxSnapshot.size} fax(es) in inbox`);
    
    if (inboxSnapshot.size > 0) {
      inboxSnapshot.forEach((doc) => {
        const fax = doc.data();
        console.log(`   - ${doc.id}: From ${fax.from}, ${fax.pages} pages`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

fixUserFaxNumber();
