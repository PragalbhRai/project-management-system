import { Platform } from 'react-native';
import { ApiClient, ApiError } from '@pms/api-client';
import { getToken } from './secureStore';

// Android emulator uses 10.0.2.2 to access host Windows machine.
// Physical device or local network uses EXPO_PUBLIC_API_BASE_URL.
const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_URL;

let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorizedCallback(cb: () => void) {
  onUnauthorizedCallback = cb;
}

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: async () => {
    return await getToken();
  },
});

/**
 * Normalizes API and network errors for user display.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    return error.message;
  }
  if (error instanceof Error) {
    if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
      return 'Network connection failed. Please check your internet connection.';
    }
    return error.message;
  }
  return 'An unexpected error occurred';
}

export { ApiError };
export type {
  Project,
  Task,
  User,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  DashboardResponseDto,
  CreateTaskDto,
  UpdateTaskDto,
  LoginDto,
  RegisterDto,
} from '@pms/api-client';
