import type { Role } from '@/shared/constants/roles';

export type { ApiEnvelope } from './api.types';

export interface AuthUser {
  id: number | string;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponseData {
  user: AuthUser;
  accessToken: string;
}
