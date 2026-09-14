import type { UserInfo } from '@shared/api.interface';

const TOKEN_KEY = 'ledger_token';
const USER_INFO_KEY = 'ledger_user_info';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getUserInfo(): UserInfo | null {
  const raw = localStorage.getItem(USER_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export function setUserInfo(info: UserInfo): void {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(info));
}

export function clearUserInfo(): void {
  localStorage.removeItem(USER_INFO_KEY);
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}

export function isAdmin(): boolean {
  const user = getUserInfo();
  return user?.role === 'admin';
}

export function clearAuth(): void {
  clearToken();
  clearUserInfo();
}
