import { logger } from '@client/src/utils/logger';
import type {
  AuthResponse,
  UserInfo,
  LoginRequest,
  RegisterRequest,
} from '@shared/api.interface';
import { http } from './instance';

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  try {
    const res = await http.post<AuthResponse>('/auth/register', data);
    return res.data;
  } catch (err: unknown) {
    logger.error(`auth.register failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  try {
    const res = await http.post<AuthResponse>('/auth/login', data);
    return res.data;
  } catch (err: unknown) {
    logger.error(`auth.login failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function logout(): Promise<void> {
  try {
    await http.post('/auth/logout');
  } catch (err: unknown) {
    logger.error(`auth.logout failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function getCurrentUser(): Promise<UserInfo> {
  try {
    const res = await http.get<UserInfo>('/auth/me');
    return res.data;
  } catch (err: unknown) {
    logger.error(`auth.getCurrentUser failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function heartbeat(): Promise<void> {
  try {
    await http.get('/auth/heartbeat');
  } catch (err: unknown) {
    logger.error(`auth.heartbeat failed: ${JSON.stringify(err)}`);
    throw err;
  }
}

export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  try {
    const res = await http.post<{ message: string }>('/auth/change-password', {
      oldPassword,
      newPassword,
    });
    return res.data;
  } catch (err: unknown) {
    logger.error(`auth.changePassword failed: ${JSON.stringify(err)}`);
    throw err;
  }
}
