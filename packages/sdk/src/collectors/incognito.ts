// Incognito/private mode detection
export interface IncognitoSignals {
  storageQuotaLow: boolean
  indexedDbBlocked: boolean
  localStorageBlocked: boolean
}

export async function collectIncognito(): Promise<IncognitoSignals> {
  return {
    storageQuotaLow: await checkStorageQuota(),
    indexedDbBlocked: await checkIndexedDb(),
    localStorageBlocked: checkLocalStorage()
  }
}

// Incognito often reports very low storage quota
async function checkStorageQuota(): Promise<boolean> {
  try {
    if (!navigator.storage?.estimate) return false
    const estimate = await navigator.storage.estimate()
    if (!estimate.quota) return false
    // Chromium incognito reports ~1GB or less of quota
    // Normal mode reports a fraction of disk (typically > 1GB)
    return estimate.quota < 100 * 1024 * 1024
  } catch {
    return false
  }
}

// Some browsers block IndexedDB in private mode
async function checkIndexedDb(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const test = indexedDB.open('fp_test_incognito')
      test.onsuccess = () => {
        test.result.close()
        indexedDB.deleteDatabase('fp_test_incognito')
        resolve(false)
      }
      test.onerror = () => resolve(true)
    } catch {
      resolve(true)
    }
    // Safety timeout
    setTimeout(() => resolve(false), 200)
  })
}

// localStorage write test
function checkLocalStorage(): boolean {
  try {
    const key = '__fp_test__'
    localStorage.setItem(key, '1')
    const val = localStorage.getItem(key)
    localStorage.removeItem(key)
    return val !== '1'
  } catch {
    return true
  }
}
