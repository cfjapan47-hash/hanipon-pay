"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { initLiff, getLiffUser, type LiffUser } from "@/lib/liff";
import type { User } from "@/types";
import { Timestamp } from "firebase/firestore";

const IS_DEV = process.env.NODE_ENV === "development";
const HAS_LIFF =
  !!process.env.NEXT_PUBLIC_LIFF_ID &&
  process.env.NEXT_PUBLIC_LIFF_ID !== "";
const USE_MOCK = IS_DEV && !HAS_LIFF;

interface AuthState {
  liffUser: LiffUser | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthState>({
  liffUser: null,
  user: null,
  loading: true,
  error: null,
});

function createFallbackUser(displayName: string, pictureUrl?: string): User {
  return {
    displayName,
    pictureUrl,
    balance: 0,
    role: "citizen",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    liffUser: null,
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function init() {
      const timeout = (ms: number) =>
        new Promise((_, reject) => setTimeout(() => reject(new Error("タイムアウト")), ms));

      try {
        await Promise.race([initLiff(), timeout(10000)]);
      } catch (liffErr) {
        console.error("[Auth] LIFF init failed:", liffErr);
        // LIFF初期化失敗時でもフォールバックで表示
        const fallbackUser = createFallbackUser("ゲスト");
        setState({
          liffUser: { userId: "guest", displayName: "ゲスト" },
          user: fallbackUser,
          loading: false,
          error: null,
        });
        return;
      }

      let liffUser: LiffUser;
      try {
        liffUser = await getLiffUser();
      } catch (profileErr) {
        console.warn("[Auth] getProfile failed, using guest:", profileErr);
        // プロフィール取得失敗時もフォールバック
        const fallbackUser = createFallbackUser("ゲスト");
        setState({
          liffUser: { userId: "guest", displayName: "ゲスト" },
          user: fallbackUser,
          loading: false,
          error: null,
        });
        return;
      }

      let user: User;
      if (USE_MOCK) {
        user = {
          displayName: liffUser.displayName,
          pictureUrl: liffUser.pictureUrl,
          balance: 5000,
          role: "admin",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
      } else {
        try {
          const { getOrCreateUser } = await import("@/lib/firestore");
          user = await Promise.race([
            getOrCreateUser(liffUser.userId, {
              displayName: liffUser.displayName,
              pictureUrl: liffUser.pictureUrl,
            }),
            timeout(8000).then(() => {
              throw new Error("Firestore timeout");
            }),
          ]) as User;
        } catch (firestoreErr) {
          console.warn("[Auth] Firestore failed, using fallback:", firestoreErr);
          user = createFallbackUser(liffUser.displayName, liffUser.pictureUrl);
        }
      }

      setState({ liffUser, user, loading: false, error: null });
    }
    init();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
