import { ApiClient, ApiError } from '@pms/api-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const TOKEN_KEY = 'pms_auth_token';

let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorizedCallback(cb: () => void) {
  onUnauthorizedCallback = cb;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export const apiClient = new ApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => getStoredToken(),
});

// Interceptor helper or error handler wrapper
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 401 && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    return error.message;
  }
  if (error instanceof Error) {
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
  CreateProjectDto,
  UpdateProjectDto,
  CreateTaskDto,
  UpdateTaskDto,
  LoginDto,
  RegisterDto,
} from '@pms/api-client';
