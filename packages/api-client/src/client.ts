import type { components, paths } from './schema.js';

export type Schemas = components['schemas'];
export type RegisterDto = Schemas['RegisterDto'];
export type LoginDto = Schemas['LoginDto'];
export type CreateProjectDto = Schemas['CreateProjectDto'];
export type UpdateProjectDto = Schemas['UpdateProjectDto'];
export type CreateTaskDto = Schemas['CreateTaskDto'];
export type UpdateTaskDto = Schemas['UpdateTaskDto'];
export type DashboardResponseDto = Schemas['DashboardResponseDto'];

export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  description?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly error: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientConfig {
  baseUrl?: string;
  getToken?: () => string | null | Promise<string | null>;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken?: () => string | null | Promise<string | null>;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = (config.baseUrl || '').replace(/\/$/, '');
    this.getToken = config.getToken;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    if (this.getToken) {
      const token = await this.getToken();
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let errorBody: { message?: string | string[]; error?: string; requestId?: string } = {};
      if (isJson) {
        try {
          errorBody = await response.json();
        } catch {
          // ignore parsing error
        }
      }

      const message = Array.isArray(errorBody.message)
        ? errorBody.message.join(', ')
        : errorBody.message || response.statusText || 'An error occurred';

      throw new ApiError(
        response.status,
        message,
        errorBody.error || response.statusText || 'Error',
        errorBody.requestId || response.headers.get('X-Request-ID') || undefined,
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    if (isJson) {
      return response.json();
    }

    return response.text() as unknown as T;
  }

  // --- Auth endpoints ---
  readonly auth = {
    register: (data: RegisterDto): Promise<AuthResponse> =>
      this.request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    login: (data: LoginDto): Promise<AuthResponse> =>
      this.request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    logout: (): Promise<{ message: string }> =>
      this.request<{ message: string }>('/api/auth/logout', {
        method: 'POST',
      }),

    me: (): Promise<User> =>
      this.request<User>('/api/auth/me', {
        method: 'GET',
      }),
  };

  // --- Projects endpoints ---
  readonly projects = {
    list: (query?: { search?: string; status?: ProjectStatus }): Promise<Project[]> => {
      const params = new URLSearchParams();
      if (query?.search) params.set('search', query.search);
      if (query?.status) params.set('status', query.status);
      const qs = params.toString();
      return this.request<Project[]>(`/api/projects${qs ? `?${qs}` : ''}`, {
        method: 'GET',
      });
    },

    get: (id: string): Promise<Project> =>
      this.request<Project>(`/api/projects/${id}`, {
        method: 'GET',
      }),

    create: (data: CreateProjectDto): Promise<Project> =>
      this.request<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateProjectDto): Promise<Project> =>
      this.request<Project>(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string): Promise<{ message: string }> =>
      this.request<{ message: string }>(`/api/projects/${id}`, {
        method: 'DELETE',
      }),

    getTasks: (id: string): Promise<Task[]> =>
      this.request<Task[]>(`/api/projects/${id}/tasks`, {
        method: 'GET',
      }),
  };

  // --- Tasks endpoints ---
  readonly tasks = {
    list: (query?: {
      search?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      projectId?: string;
    }): Promise<Task[]> => {
      const params = new URLSearchParams();
      if (query?.search) params.set('search', query.search);
      if (query?.status) params.set('status', query.status);
      if (query?.priority) params.set('priority', query.priority);
      if (query?.projectId) params.set('projectId', query.projectId);
      const qs = params.toString();
      return this.request<Task[]>(`/api/tasks${qs ? `?${qs}` : ''}`, {
        method: 'GET',
      });
    },

    get: (id: string): Promise<Task> =>
      this.request<Task>(`/api/tasks/${id}`, {
        method: 'GET',
      }),

    create: (data: CreateTaskDto): Promise<Task> =>
      this.request<Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: UpdateTaskDto): Promise<Task> =>
      this.request<Task>(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string): Promise<{ message: string }> =>
      this.request<{ message: string }>(`/api/tasks/${id}`, {
        method: 'DELETE',
      }),
  };

  // --- Dashboard endpoints ---
  readonly dashboard = {
    get: (): Promise<DashboardResponseDto> =>
      this.request<DashboardResponseDto>('/api/dashboard', {
        method: 'GET',
      }),
  };

  // --- Health endpoint ---
  readonly health = {
    get: (): Promise<{ status: string; timestamp: string; database: { status: string } }> =>
      this.request<{ status: string; timestamp: string; database: { status: string } }>('/api/health', {
        method: 'GET',
      }),
  };
}
