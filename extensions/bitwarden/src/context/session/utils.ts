import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { VAULT_TIMEOUT } from "~/constants/preferences";
import { Preferences } from "~/types/preferences";
import { SessionState } from "~/types/session";

export const Storage = {
  getSavedSession: () => {
    return Promise.all([
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.SESSION_TOKEN),
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.REPROMPT_HASH),
      LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.LAST_ACTIVITY_TIME),
    ]);
  },
  clearSession: () => {
    return Promise.all([
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.SESSION_TOKEN),
      LocalStorage.removeItem(LOCAL_STORAGE_KEY.REPROMPT_HASH),
    ]);
  },
  saveSession: (token: string, passwordHash: string) => {
    return Promise.all([
      LocalStorage.setItem(LOCAL_STORAGE_KEY.SESSION_TOKEN, token),
      LocalStorage.setItem(LOCAL_STORAGE_KEY.REPROMPT_HASH, passwordHash),
    ]);
  },
};

export type SavedSessionState = {
  token?: SessionState["token"];
  passwordHash?: SessionState["passwordHash"];
  lastActivityTime?: SessionState["lastActivityTime"];
  shouldLockVault?: boolean;
  lockReason?: string;
};

const VAULT_TIMEOUT_MESSAGE = "Vault timed out due to inactivity";

export async function getSavedSession(): Promise<SavedSessionState> {
  const [token, passwordHash, lastActivityTimeString] = await Storage.getSavedSession();
  if (!token || !passwordHash) return { shouldLockVault: true };

  const loadedState: SavedSessionState = { token, passwordHash };
  if (!lastActivityTimeString) return { ...loadedState, shouldLockVault: false };

  const lastActivityTime = new Date(lastActivityTimeString);
  loadedState.lastActivityTime = lastActivityTime;
  const vaultTimeoutMs = +getPreferenceValues<Preferences>().repromptIgnoreDuration;
  if (vaultTimeoutMs === VAULT_TIMEOUT.NEVER) return { ...loadedState, shouldLockVault: false };

  const timeElapseSinceLastPasswordEnter = Date.now() - lastActivityTime.getTime();
  if (vaultTimeoutMs === VAULT_TIMEOUT.IMMEDIATELY || timeElapseSinceLastPasswordEnter >= vaultTimeoutMs) {
    return { ...loadedState, shouldLockVault: true, lockReason: VAULT_TIMEOUT_MESSAGE };
  }

  return { ...loadedState, shouldLockVault: false };
}
