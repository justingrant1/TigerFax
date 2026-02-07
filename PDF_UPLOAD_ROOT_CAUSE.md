# PDF Upload Root Cause Analysis

## Issue Summary
Faxes appear in the inbox but PDFs cannot be downloaded/viewed.

## Investigation Findings

### 1. Webhook Payload Structure ✅
- **Status**: WORKING
- Sinch sends base64-encoded PDF in `payload.file` field
- Webhook correctly receives and logs the PDF data
- Example fax ID: `01KGQG4B8CPS6DHFP7JCGC2FNF`

### 2. Webhook Code Analysis ✅
- **Status**: CODE IS CORRECT
- The webhook has proper logic to handle base64 PDF data:
  ```typescript
  const fileData = payload.file; // Base64-encoded PDF
  
  if (fileData && typeof fileData === 'string') {
    console.log('Using base64-encoded PDF from webhook payload');
    documentBuffer = Buffer.from(fileData, 'base64');
  }
  ```
- Upload to Firebase Storage is implemented:
  ```typescript
  storagePath = await uploadFaxToStorage(uid, faxId, documentBuffer);
  ```

### 3. Root Cause Identified ⚠️

**The webhook code has a critical bug in the payload parsing:**

```typescript
// Current code (WRONG):
const fileData = payload.file; // This is undefined!

// The actual structure from logs:
{
  "event": { ... },
  "fax": { ... },
  "file": "JVBERi0xLjcK..." // ← PDF is here at root level
}
```

**The issue**: The code correctly checks `payload.file`, BUT it's checking AFTER already extracting `faxData`:

```typescript
let faxData = payload.event?.fax || payload.fax || payload;
const fileData = payload.file; // ✓ This is correct

// BUT the fax metadata extraction happens before file processing
// and the code may be failing silently during upload
```

### 4. Likely Failure Point

Looking at the webhook code flow:
1. ✅ Payload received with base64 PDF
2. ✅ Fax metadata extracted correctly
3. ❓ PDF upload attempt - **NO LOGS SHOWING SUCCESS/FAILURE**
4. ✅ Firestore inbox entry created (even if upload fails)

**The webhook is designed to ALWAYS store the fax in inbox, even if PDF upload fails:**
```typescript
} catch (storageError) {
  console.error('⚠️  Failed to download/upload PDF...');
  storagePath = ''; // Empty path if upload fails
}

// ALWAYS store in Firestore inbox
await storeFaxInInbox(uid, { ...faxData, storagePath });
```

## Root Cause Conclusion

**The PDF upload is likely failing silently**, and the webhook continues to store the fax metadata in Firestore with an empty `storagePath`. This explains why:
- ✅ Faxes appear in inbox (metadata stored)
- ❌ PDFs cannot be downloaded (no storage path)

## Potential Causes of Upload Failure

1. **Firebase Storage permissions** - The Cloud Function may not have write access
2. **Storage bucket not configured** - Missing or incorrect bucket name
3. **Buffer conversion error** - Base64 decoding might be failing
4. **Silent exception** - Error caught but not properly logged

## Next Steps

1. Add more detailed logging to the upload process
2. Check Firebase Storage rules and permissions
3. Verify the storage bucket configuration
4. Test the base64 to Buffer conversion
5. Ensure proper error handling and logging
