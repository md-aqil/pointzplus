// lib/storage.ts – Cross-platform secure storage adapter.
// Native: expo-secure-store (Keychain / Keystore-backed).
// Web:    localStorage (best-effort; browsers have no OS keychain).
// Same async API as expo-secure-store so call sites need no changes.

import { Platform } from "react-native";

interface StorageAdapter {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SecureStore =
  Platform.OS === "web"
    ? null
    : (require("expo-secure-store") as typeof import("expo-secure-store"));

// Keys must be safe for SecureStore (it restricts key charset on some platforms).
function assertKey(key: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(key)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
}

const localStorageAdapter: StorageAdapter = {
  async getItemAsync(key) {
    assertKey(key);
    try {
      return window.localStorage.getItem(key);
    } catch {
      // Fail-fast per defensive rules: surface as null but never throw across the boundary.
      return null;
    }
  },
  async setItemAsync(key, value) {
    assertKey(key);
    window.localStorage.setItem(key, value);
  },
  async deleteItemAsync(key) {
    assertKey(key);
    window.localStorage.removeItem(key);
  },
};

const secureStoreAdapter: StorageAdapter = {
  async getItemAsync(key) {
    assertKey(key);
    return SecureStore!.getItemAsync(key);
  },
  async setItemAsync(key, value) {
    assertKey(key);
    await SecureStore!.setItemAsync(key, value);
  },
  async deleteItemAsync(key) {
    assertKey(key);
    await SecureStore!.deleteItemAsync(key);
  },
};

export const storage: StorageAdapter =
  Platform.OS === "web" ? localStorageAdapter : secureStoreAdapter;
