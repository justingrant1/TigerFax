/**
 * Manually trigger provisioning for a specific user
 * This simulates what happens when a user upgrades to Pro
 * 
 * Usage: node trigger-provisioning-for-user.js <email>
 * Example: node trigger-provisioning-for-user.js jgkoff+8@gmail.com
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with Application Default Credentials
// This will use the credentials from `firebase login`
admin.initializeApp({
  projectId: 'tigerfax-e3915',
});

const db = admin.firestore();

async function findUserByEmail(email) {
  console.log(`\n🔍 Searching for user with email: ${email}\n`);
  
  const usersSnapshot = await db.collection('users').where('email', '==', email).get();
  
  if (usersSnapshot.empty) {
    console.error('❌ No user found with that email');
    return null;
  }
  
  const userDoc = usersSnapshot.docs[0];
  console.log('✅ Found user:', userDoc.id);
  console.log('Current data:', userDoc.data());
  
  return { uid: userDoc.id, data: userDoc.data() };
}

async function triggerProvisioning(uid) {
  console.log(`\n🚀 Triggering provisioning for user: ${uid}\n`);
  
  // Update the user to Pro tier (this will trigger the Cloud Function)
  await db.doc(`users/${uid}`).update({
    subscriptionTier: 'pro',
    updatedAt: new Date().toISOString(),
  });
  
  console.log('✅ Updated user to Pro tier');
  console.log('⏳ Cloud Function should trigger automatically...');
  console.log('⏳ Waiting 5 seconds for provisioning...\n');
  
  // Wait for the function to execute
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check if number was assigned
  const userDoc = await db.doc(`users/${uid}`).get();
  const userData = userDoc.data();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 RESULT:');
  console.log('═══════════════════════════════════════════════════════');
  
  if (userData.faxNumber) {
    console.log('✅ SUCCESS! Fax number assigned:', userData.faxNumber);
    console.log('Assigned at:', userData.faxNumberAssignedAt?.toDate?.() || userData.faxNumberAssignedAt);
    
    // Check if it's a real number or test number
    if (userData.faxNumber.startsWith('+1555')) {
      console.log('⚠️  This is a TEST number (fallback)');
      console.log('⚠️  Check Cloud Function logs for errors');
    } else {
      console.log('✅ This is a REAL Sinch number!');
    }
  } else {
    console.log('❌ No fax number assigned yet');
    if (userData.faxNumberError) {
      console.log('Error:', userData.faxNumberError);
    }
    console.log('⏳ May need more time - check Firebase Console logs');
  }
  
  console.log('═══════════════════════════════════════════════════════\n');
}

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ Please provide an email address');
    console.log('Usage: node trigger-provisioning-for-user.js <email>');
    console.log('Example: node trigger-provisioning-for-user.js jgkoff+8@gmail.com');
    process.exit(1);
  }
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 MANUAL PROVISIONING TRIGGER');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    const user = await findUserByEmail(email);
    
    if (!user) {
      process.exit(1);
    }
    
    if (user.data.subscriptionTier === 'pro' && user.data.faxNumber) {
      console.log('\n⚠️  User already has Pro subscription and fax number:', user.data.faxNumber);
      console.log('Do you want to re-trigger provisioning? (This will update the timestamp)');
      console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    await triggerProvisioning(user.uid);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

main();
