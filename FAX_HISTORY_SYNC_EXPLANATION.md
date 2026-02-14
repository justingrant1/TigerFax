# Fax History Not Syncing Between Devices - Explanation

## The Issue

You're seeing fax history on your iPhone but not on your iPad, even though you're logged into the same account.

## Why This Happens

**Fax history is stored locally on each device using AsyncStorage**, not in the cloud (Firestore). This is by design in the current implementation:

```typescript
// From src/state/fax-store.ts
export const useFaxStore = create<FaxState>()(
  persist(
    (set, get) => ({
      // ... store logic
    }),
    {
      name: 'fax-storage',
      storage: createJSONStorage(() => AsyncStorage),  // ← Local device storage
      partialize: (state) => ({ faxHistory: state.faxHistory }),
    }
  )
);
```

**AsyncStorage is device-specific:**
- Each device (iPhone, iPad) has its own separate AsyncStorage
- Data is NOT synced between devices
- When you send a fax from iPhone, it's saved to iPhone's AsyncStorage
- When you open iPad, it reads from iPad's AsyncStorage (which is empty)

## This is Actually Normal Behavior

Many apps work this way:
- **Local storage** = Fast, works offline, no server costs
- **Cloud storage** = Syncs across devices, but requires server infrastructure

## Solutions

### Option 1: Accept Current Behavior (Recommended for Now)
- Each device maintains its own fax history
- History shows faxes sent from that specific device
- This is how the app currently works and is acceptable for most users

### Option 2: Sync History to Firestore (Future Enhancement)
To sync history across devices, you would need to:

1. **Store fax history in Firestore** (in addition to or instead of AsyncStorage)
2. **Update the fax store** to read/write from Firestore
3. **Add real-time listeners** to sync changes across devices

**Implementation would involve:**
```typescript
// Store fax jobs in Firestore under user's document
firestore()
  .collection('users')
  .doc(userId)
  .collection('faxHistory')
  .add(faxJob);

// Listen for changes
firestore()
  .collection('users')
  .doc(userId)
  .collection('faxHistory')
  .onSnapshot((snapshot) => {
    // Update local state with cloud data
  });
```

**Trade-offs:**
- ✅ History syncs across all devices
- ✅ History persists even if device is lost
- ❌ Requires internet connection to view history
- ❌ Additional Firestore reads/writes (costs)
- ❌ More complex implementation

### Option 3: Hybrid Approach
- Keep AsyncStorage for offline access
- Sync to Firestore when online
- Merge data from both sources

## Current Status

The iPad optimization is complete and working correctly. The fax history "issue" is actually expected behavior based on how the app stores data locally on each device.

If you want to implement cloud sync for fax history, that would be a separate feature enhancement beyond the iPad optimization scope.

## Recommendation

For now, this is working as designed. Each device maintains its own history. If cross-device sync is important, it should be planned as a future feature with proper consideration of the trade-offs mentioned above.
