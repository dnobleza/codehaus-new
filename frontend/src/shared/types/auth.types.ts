import type { Role } from '@/shared/constants/roles';

export interface AuthUser {
  id: number | string;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthResponseData {
  user: AuthUser;
  accessToken: string;
}
