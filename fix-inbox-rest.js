/**
 * Fix inbox issue using Firebase REST API
 * This script will check the user's fax number and manually add the fax to their inbox
 */

require('dotenv').config();
const https = require('https');

const PROJECT_ID = 'tigerfax-e3915';
const email = 'jgkoff+10@gmail.com';
const expectedFaxNumber = '+12232426242';
const faxId = '01KGPICZPMN288OAAW647ZSR2Q';

console.log(`\n🔧 Fixing inbox issue for: ${email}`);
console.log(`📠 Expected fax number: ${expectedFaxNumber}`);
console.log(`📄 Fax ID: ${faxId}\n`);

// Helper function to make Firestore REST API calls
function firestoreRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Convert Firestore document to plain object
function parseFirestoreDoc(doc) {
  if (!doc.fields) return null;
  const result = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue);
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.timestampValue !== undefined) result[key] = value.timestampValue;
  }
  return result;
}

// Convert plain object to Firestore format
function toFirestoreDoc(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { integerValue: value.toString() };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    }
  }
  return { fields };
}

async function fixInbox() {
  try {
    // Step 1: Query for user by email
    console.log('Step 1: Finding user by email...');
    
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'email' },
            op: 'EQUAL',
            value: { stringValue: email }
          }
        },
        limit: 1
      }
    };

    const queryResult = await firestoreRequest(':runQuery', 'POST', queryBody);
    
    if (!queryResult || queryResult.length === 0 || !queryResult[0].document) {
      console.log('❌ User not found with email:', email);
      return;
    }

    const userDoc = queryResult[0].document;
    const userPath = userDoc.name;
    const uid = userPath.split('/').pop();
    const userData = parseFirestoreDoc(userDoc);

    console.log('✅ User found:');
    console.log('   UID:', uid);
    console.log('   Email:', userData.email);
    console.log('   Current Fax Number:', userData.faxNumber || 'NOT SET');
    console.log('   Subscription Tier:', userData.subscriptionTier || 'NOT SET');

    // Step 2: Update fax number if needed
    console.log('\nStep 2: Checking fax number...');
    if (userData.faxNumber !== expectedFaxNumber) {
      console.log(`⚠️  Fax number mismatch!`);
      console.log(`   Current: ${userData.faxNumber || 'NOT SET'}`);
      console.log(`   Expected: ${expectedFaxNumber}`);
      console.log(`\n🔧 Updating fax number...`);

      const updateBody = {
        fields: {
          faxNumber: { stringValue: expectedFaxNumber },
          faxNumberAssignedAt: { timestampValue: new Date().toISOString() }
        }
      };

      await firestoreRequest(`/users/${uid}?updateMask.fieldPaths=faxNumber&updateMask.fieldPaths=faxNumberAssignedAt`, 'PATCH', updateBody);
      console.log('✅ Fax number updated successfully!');
    } else {
      console.log('✅ Fax number is correct!');
    }

    // Step 3: Check if fax exists in inbox
    console.log('\nStep 3: Checking if fax already exists in inbox...');
    try {
      const existingFax = await firestoreRequest(`/users/${uid}/inbox/${faxId}`);
      if (existingFax && existingFax.fields) {
        console.log('✅ Fax already exists in inbox!');
        const faxData = parseFirestoreDoc(existingFax);
        console.log('   From:', faxData.from);
        console.log('   Pages:', faxData.pages);
        return;
      }
    } catch (e) {
      // Fax doesn't exist, continue to add it
    }

    console.log('❌ Fax not in inbox, adding it now...');

    // Step 4: Add fax to inbox
    const faxDoc = toFirestoreDoc({
      faxId: faxId,
      from: '+16464377113',
      to: expectedFaxNumber,
      pages: 2,
      receivedAt: '2026-02-05T04:36:29Z',
      documentUrl: '',
      storagePath: `receivedFaxes/${uid}/${faxId}.pdf`,
      read: false,
    });

    faxDoc.fields.createdAt = { timestampValue: new Date().toISOString() };

    await firestoreRequest(`/users/${uid}/inbox?documentId=${faxId}`, 'POST', faxDoc);
    console.log('✅ Fax added to inbox!');

    // Step 5: Update unread count
    console.log('\n🔧 Updating unread count...');
    const currentUnread = userData.unreadFaxCount || 0;
    const updateUnreadBody = {
      fields: {
        unreadFaxCount: { integerValue: (currentUnread + 1).toString() }
      }
    };
    await firestoreRequest(`/users/${uid}?updateMask.fieldPaths=unreadFaxCount`, 'PATCH', updateUnreadBody);
    console.log('✅ Unread count updated!');

    console.log('\n✅ All done! The user should now see the fax in their inbox.');
    console.log('📱 Have the user refresh the app to see the changes.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

fixInbox();
