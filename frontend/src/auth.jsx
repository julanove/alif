import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "./api/client.js";
const AuthContext = createContext(null);
const SIGNED_OUT = { user: null, streak: null, due: 0, savedWordIds: [] };
export function AuthProvider({ children }) {
  const [me, setMe] = useState(SIGNED_OUT);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const next = await api.getMe();
      setMe(next.user ? next : SIGNED_OUT);
    } catch {
      setMe(SIGNED_OUT);
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const value = useMemo(
    () => ({
      ...me,
      ready,
      saved: new Set(me.savedWordIds),
      refresh,
      async login(credentials) {
        setMe(await api.login(credentials));
      },
      async register(details) {
        setMe(await api.register(details));
      },
      async logout() {
        await api.logout();
        setMe(SIGNED_OUT);
      },
      async toggleSaved(wordId) {
        const isSaved = me.savedWordIds.includes(wordId);
        const { due } = isSaved ? await api.removeFlashcard(wordId) : await api.addFlashcard(wordId);
        setMe((prev) => ({
          ...prev,
          due,
          savedWordIds: isSaved ? prev.savedWordIds.filter((id) => id !== wordId) : [...prev.savedWordIds, wordId]
        }));
      },
      applyProgress({ streak, due }) {
        setMe((prev) => ({ ...prev, streak: streak ?? prev.streak, due: due ?? prev.due }));
      }
    }),
    [me, ready, refresh]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  return useContext(AuthContext);
}
