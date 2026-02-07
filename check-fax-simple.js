/**
 * Simple script to check latest fax using Firebase CLI auth
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, orderBy, limit, getDocs } = require('firebase/firestore');
const { getStorage, ref, getMetadata } = require('firebase/storage');

const firebaseConfig = {
  apiKey: "AIzaSyDhXN8fF8vYqH0jKxH0jKxH0jKxH0jKxH0",
  authDomain: "tigerfax-e3915.firebaseapp.com",
  projectId: "tigerfax-e3915",
  storageBucket: "tigerfax-e3915.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

async function checkLatestFax() {
  try {
    console.log('Checking for user with fax number +12232426242...\n');
    
    // Get the user
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('faxNumber', '==', '+12232426242'), limit(1));
    const usersSnapshot = await getDocs(q);
    
    if (usersSnapshot.empty) {
      console.log('❌ No user found');
      return;
    }
    
    const userId = usersSnapshot.docs[0].id;
    console.log(`✓ Found user: ${userId}\n`);
    
    // Get latest fax
    const inboxRef = collection(db, 'users', userId, 'inbox');
    const faxQuery = query(inboxRef, orderBy('createdAt', 'desc'), limit(1));
    const inboxSnapshot = await getDocs(faxQuery);
    
    if (inboxSnapshot.empty) {
      console.log('❌ No faxes in inbox');
      return;
    }
    
    const faxDoc = inboxSnapshot.docs[0];
    const faxData = faxDoc.data();
    
    console.log('📠 Latest Fax:');
    console.log('='.repeat(60));
    console.log(`ID: ${faxDoc.id}`);
    console.log(`From: ${faxData.from}`);
    console.log(`To: ${faxData.to}`);
    console.log(`Pages: ${faxData.pages}`);
    console.log(`Storage Path: "${faxData.storagePath || '(empty)'}"`);
    console.log(`Document URL: "${faxData.documentUrl || '(empty)'}"`);
    console.log('='.repeat(60));
    
    if (!faxData.storagePath) {
      console.log('\n❌ PROBLEM: Storage path is empty!');
      console.log('The PDF was not uploaded to Firebase Storage.');
    } else {
      console.log('\n✓ Storage path exists');
      console.log('Checking if file exists in Storage...');
      
      try {
        const fileRef = ref(storage, faxData.storagePath);
        const metadata = await getMetadata(fileRef);
        console.log(`✓ File exists! Size: ${metadata.size} bytes`);
      } catch (error) {
        console.log(`❌ File does NOT exist in Storage`);
        console.log(`Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkLatestFax();
