# Fax History Isolation Fix

## Problem
Fax history was being shared between different user accounts. When user A sent a fax, user B could see it in their history.

## Root Cause
The `useFaxStore` was using a global AsyncStorage key (`'fax-storage'`) that was shared across all users on the same device.

## Solution Implemented

### 1. Updated `src/state/fax-store.ts`
- Changed from a single global store to user-specific stores
- Each user now has their own storage key: `fax-storage-${userId}`
- Store instances are cached in a Map to avoid recreating them

**Key Changes:**
```typescript
// OLD - Global store
export const useFaxStore = create<FaxState>()(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'fax-storage', // ❌ Shared across all users
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// NEW - User-specific stores
export const useFaxStore = (userId?: string) => {
  const storeKey = userId || 'default';
  
  if (!stores.has(storeKey)) {
    stores.set(storeKey, createFaxStore(storeKey));
  }
  
  return stores.get(storeKey)!();
};

function createFaxStore(userId: string) {
  return create<FaxState>()(
    persist(
      (set, get) => ({ ... }),
      {
        name: `fax-storage-${userId}`, // ✅ User-specific
        storage: createJSONStorage(() => AsyncStorage),
      }
    )
  );
}
```

### 2. Updated Screens to Pass User ID

**Screens Updated:**
- ✅ `HistoryScreen.tsx` - Shows user's fax history
- ✅ `HomeScreen.tsx` - Sends faxes

**Screens That Need Updating:**
- `FaxReviewScreen.tsx`
- `FaxDetailScreen.tsx`
- `UsageScreen.tsx`
- `CoverPageScreen.tsx`
- `DocumentScanScreen.tsx`
- `FileUploadScreen.tsx`

**Pattern to Follow:**
```typescript
// Add import
import { useAuth } from '../contexts/AuthContext';

// In component
const { user } = useAuth();
const { faxHistory, currentFax, ... } = useFaxStore(user?.uid);
```

## Remaining Work

### Update Remaining Screens

Run these replacements for each screen:

**FaxReviewScreen.tsx:**
```typescript
// Add import
import { useAuth } from '../contexts/AuthContext';

// Update hook usage
const { user } = useAuth();
const { currentFax, sendFax, clearCurrentFax } = useFaxStore(user?.uid);
```

**FaxDetailScreen.tsx:**
```typescript
import { useAuth } from '../contexts/AuthContext';

const { user } = useAuth();
const { faxHistory } = useFaxStore(user?.uid);
```

**UsageScreen.tsx:**
```typescript
import { useAuth } from '../contexts/AuthContext';

const { user } = useAuth();
const { faxHistory } = useFaxStore(user?.uid);
```

**CoverPageScreen.tsx:**
```typescript
import { useAuth } from '../contexts/AuthContext';

const { user } = useAuth();
const { currentFax, setCoverPage, removeCoverPage } = useFaxStore(user?.uid);
```

**DocumentScanScreen.tsx:**
```typescript
import { useAuth } from '../contexts/AuthContext';

const { user } = useAuth();
const { addDocument } = useFaxStore(user?.uid);
```

**FileUploadScreen.tsx:**
```typescript
import { useAuth } from '../contexts/AuthContext';

const { user } = useAuth();
const { addDocument } = useFaxStore(user?.uid);
```

## Testing

After updating all screens:

1. **Test with two accounts:**
   - Login as user A (e.g., jgkoff@gmail.com)
   - Send a fax
   - Logout
   - Login as user B (e.g., jgkoff+9@gmail.com)
   - Verify user B does NOT see user A's fax
   - Send a fax as user B
   - Logout and login as user A
   - Verify user A does NOT see user B's fax

2. **Test persistence:**
   - Send a fax
   - Close and reopen the app
   - Verify fax history is still there

3. **Test backwards compatibility:**
   - If no user is logged in, it should use 'default' store

## Migration Note

Existing users will have their fax history in the old `'fax-storage'` key. After this update:
- New faxes will be stored in user-specific keys
- Old faxes in the global store won't be visible (but won't be deleted)
- This is acceptable as it's a privacy improvement

If you want to migrate old data, you could add a one-time migration:
```typescript
// Check if old global storage exists
const oldData = await AsyncStorage.getItem('fax-storage');
if (oldData && user?.uid) {
  // Copy to user-specific storage
  await AsyncStorage.setItem(`fax-storage-${user.uid}`, oldData);
  // Optionally delete old storage
  await AsyncStorage.removeItem('fax-storage');
}
```

## Status

- ✅ Core store logic updated
- ✅ HistoryScreen updated
- ✅ HomeScreen updated
- ⏳ 6 more screens need updating (see list above)
- ⏳ Testing required after all updates
