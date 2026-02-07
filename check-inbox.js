/**
 * Check user's inbox for received faxes
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkInbox() {
  const email = 'jgkoff+10@gmail.com';
  const faxNumber = '+12232426242';
  
  console.log(`\n🔍 Checking inbox for user: ${email}`);
  console.log(`📠 Fax number: ${faxNumber}\n`);
  
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
    console.log('   Fax Number:', userData.faxNumber);
    console.log('   Unread Count:', userData.unreadFaxCount || 0);
    
    // Check if fax number matches
    if (userData.faxNumber !== faxNumber) {
      console.log(`\n⚠️  WARNING: User's fax number (${userData.faxNumber}) doesn't match expected (${faxNumber})`);
    }
    
    // Get inbox
    console.log('\n📥 Checking inbox...');
    const inboxSnapshot = await db.collection('users')
      .doc(uid)
      .collection('inbox')
      .orderBy('receivedAt', 'desc')
      .get();
    
    if (inboxSnapshot.empty) {
      console.log('❌ No faxes in inbox');
    } else {
      console.log(`✅ Found ${inboxSnapshot.size} fax(es) in inbox:\n`);
      
      inboxSnapshot.forEach((doc, index) => {
        const fax = doc.data();
        console.log(`${index + 1}. Fax ID: ${doc.id}`);
        console.log(`   From: ${fax.from}`);
        console.log(`   To: ${fax.to}`);
        console.log(`   Pages: ${fax.pages}`);
        console.log(`   Received: ${fax.receivedAt}`);
        console.log(`   Read: ${fax.read}`);
        console.log(`   Storage Path: ${fax.storagePath}`);
        console.log('');
      });
    }
    
    // Check recent webhook logs
    console.log('📋 Recent activity:');
    console.log('   Last Login:', userData.lastLogin);
    console.log('   Created At:', userData.createdAt);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkInbox();
