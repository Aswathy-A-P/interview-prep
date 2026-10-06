const STORAGE_SLOT = ['shop', 'session'].join('.');

let accessToken: string | null = null;

function readRefreshToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_SLOT);
  } catch {
    return null;
  }
}

function writeRefreshToken(value: string | null): void {
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_SLOT, value);
    } else {
      window.localStorage.removeItem(STORAGE_SLOT);
    }
  } catch {
    return;
  }
}

export const tokenStorage = {
  getAccessToken: (): string | null => accessToken,
  getRefreshToken: readRefreshToken,
  setTokens(nextAccessToken: string, nextRefreshToken: string): void {
    accessToken = nextAccessToken;
    writeRefreshToken(nextRefreshToken);
  },
  clear(): void {
    accessToken = null;
    writeRefreshToken(null);
  },
};
