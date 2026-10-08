import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'pms_auth_token_secure';

/**
 * Store the JWT in encrypted device storage using expo-secure-store.
 * Never use AsyncStorage or plain files.
 */
export async function saveToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to securely store token:', error);
  }
}

/**
 * Retrieve the JWT from expo-secure-store.
 */
export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to read secure token:', error);
    return null;
  }
}

/**
 * Remove the JWT from expo-secure-store.
 */
export async function deleteToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to delete secure token:', error);
  }
}
