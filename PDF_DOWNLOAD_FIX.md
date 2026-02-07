# PDF Download Fix - Retry Logic Implementation

## Problem Identified

When faxes were received, the webhook was getting **404 errors** when trying to download PDFs from Sinch immediately after the webhook notification. This caused faxes to appear in the inbox without viewable PDFs ("file URL with no data").

### Root Cause
Sinch sends the webhook notification immediately when a fax completes, but the PDF content is not immediately available via their API. The webhook was trying to download the PDF right away and failing with 404.

## Solution Implemented

Added **retry logic with exponential backoff** to the webhook's PDF download process.

### How It Works

1. **First attempt**: Try to download PDF immediately
2. **If fails**: Wait 4 seconds (2^2 * 1000ms), then retry
3. **If fails again**: Wait 8 seconds (2^3 * 1000ms), then retry
4. **If all retries fail**: Store fax metadata without PDF (graceful degradation)

### Code Changes

Added `downloadFaxDocumentWithRetry()` function:
```typescript
async function downloadFaxDocumentWithRetry(faxId: string, maxRetries: number = 3): Promise<Buffer> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Wait before retry (exponential backoff: 2s, 4s, 8s)
      if (attempt > 1) {
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt}/${maxRetries} - waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      console.log(`Attempting to download PDF (attempt ${attempt}/${maxRetries})...`);
      const buffer = await downloadFaxDocument(faxId);
      console.log(`✓ Successfully downloaded PDF on attempt ${attempt}`);
      return buffer;
      
    } catch (error) {
      lastError = error as Error;
      console.log(`Download attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      
      if (attempt === maxRetries) {
        console.error(`All ${maxRetries} download attempts failed`);
        throw lastError;
      }
    }
  }
  
  throw lastError || new Error('Download failed');
}
```

### Benefits

1. **Handles timing issues**: Gives Sinch time to make the PDF available
2. **No additional infrastructure**: No need for Cloud Tasks or Pub/Sub
3. **Graceful degradation**: If all retries fail, fax metadata is still stored
4. **Fast when possible**: If PDF is available immediately, no delay
5. **Reasonable timeout**: Max ~14 seconds total (well within Cloud Function limits)

## Deployment

✅ **Deployed**: 2026-02-05 21:32 PST

**Updated Functions:**
- `incomingFaxWebhook` (1st gen)
- `sinchFaxWebhook` (2nd gen)

## Testing

### To Test:
1. Send a fax to a Pro user's number
2. Check Firebase logs for retry attempts
3. Verify PDF is downloaded successfully
4. Confirm user can view PDF in app

### Expected Logs:
```
Downloading PDF from Sinch API with retry logic...
Attempting to download PDF (attempt 1/3)...
Download attempt 1/3 failed: Failed to download fax: 404
Retry attempt 2/3 - waiting 4000ms before retry...
Attempting to download PDF (attempt 2/3)...
✓ Successfully downloaded PDF on attempt 2
✓ PDF uploaded to storage successfully
Generated signed URL for fax document
✓ Fax metadata stored in inbox successfully
```

## What This Fixes

### Before (Broken):
1. Fax received by Sinch ✅
2. Webhook called immediately ✅
3. Try to download PDF → 404 ❌
4. Store fax without PDF ❌
5. User sees "file URL with no data" ❌

### After (Fixed):
1. Fax received by Sinch ✅
2. Webhook called immediately ✅
3. Try to download PDF → 404
4. Wait 4 seconds, retry → Success! ✅
5. Upload PDF to Storage ✅
6. Generate signed URL ✅
7. Store fax with proper documentUrl ✅
8. User can view PDF ✅

## Monitoring

Check Firebase Console logs for:
- `✓ Successfully downloaded PDF on attempt X` - Success indicator
- `All X download attempts failed` - Indicates persistent issue
- Retry attempt logs show the backoff is working

## Future Improvements

If retry logic isn't sufficient:
1. Increase max retries to 5
2. Implement background job to retry failed downloads
3. Add webhook from Sinch when PDF is ready (if available)
4. Store fax ID and retry later via Cloud Scheduler

## Related Files

- `functions/src/incomingFaxWebhook.ts` - Main webhook with retry logic
- `functions/src/fixInboxIssue.ts` - Manual fix function (also has retry logic)
- `ROOT_CAUSE_AND_FIX.md` - Investigation notes
