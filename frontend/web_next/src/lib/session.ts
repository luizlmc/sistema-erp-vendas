const ACCESS_TOKEN_KEY = "erp_access_token";
const REFRESH_TOKEN_KEY = "erp_refresh_token";
const USER_NAME_KEY = "erp_user_name";
const USER_LOGIN_KEY = "erp_user_login";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveSession(
  accessToken: string,
  refreshToken: string,
  name: string,
  login: string,
): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  storage.setItem(USER_NAME_KEY, name);
  storage.setItem(USER_LOGIN_KEY, login);
}

export function clearSession(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(USER_NAME_KEY);
  storage.removeItem(USER_LOGIN_KEY);
}

export function getAccessToken(): string {
  const storage = getStorage();
  if (!storage) return "";
  return storage.getItem(ACCESS_TOKEN_KEY) ?? "";
}

export function getUserIdentity(): { name: string; login: string } {
  const storage = getStorage();
  if (!storage) return { name: "", login: "" };
  return {
    name: storage.getItem(USER_NAME_KEY) ?? "",
    login: storage.getItem(USER_LOGIN_KEY) ?? "",
  };
}
