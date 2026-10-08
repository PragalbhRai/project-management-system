export interface JwtPayload {
  sub: string;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  jti: string;
  exp: number;
}

export interface UserResponse {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: {
    id: string;
    fullName: string;
    email: string;
    createdAt?: string;
  };
  accessToken: string;
}
