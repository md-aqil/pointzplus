import { storage } from "../lib/storage";

// Mock SecureStore
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockImplementation(async (key: string) => `mock_val_${key}`),
  setItemAsync: jest.fn().mockImplementation(async () => {}),
  deleteItemAsync: jest.fn().mockImplementation(async () => {}),
}));

describe("lib/storage cross-platform adapter", () => {
  it("validates keys against invalid characters (prevents injection / platform errors)", async () => {
    await expect(storage.getItemAsync("invalid key with spaces")).rejects.toThrow("Invalid storage key");
    await expect(storage.setItemAsync("bad/key", "value")).rejects.toThrow("Invalid storage key");
    await expect(storage.deleteItemAsync("bad@key")).rejects.toThrow("Invalid storage key");
  });

  it("stores, retrieves, and deletes values with valid keys", async () => {
    const key = "pointzplus_auth_token";
    await expect(storage.setItemAsync(key, "test-jwt-token")).resolves.not.toThrow();
    const val = await storage.getItemAsync(key);
    expect(val).toBeDefined();
    await expect(storage.deleteItemAsync(key)).resolves.not.toThrow();
  });
});
