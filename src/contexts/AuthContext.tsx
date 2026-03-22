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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    liffUser: null,
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function init() {
      try {
        await initLiff();
        const liffUser = await getLiffUser();

        let user: User;

        if (USE_MOCK) {
          // Firebase未設定時はモックデータを使用
          user = {
            displayName: liffUser.displayName,
            pictureUrl: liffUser.pictureUrl,
            balance: 5000,
            role: "admin",
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          };
        } else {
          const { getOrCreateUser } = await import("@/lib/firestore");
          user = await getOrCreateUser(liffUser.userId, {
            displayName: liffUser.displayName,
            pictureUrl: liffUser.pictureUrl,
          });
        }

        setState({ liffUser, user, loading: false, error: null });
      } catch (err) {
        console.error("[Auth] initialization failed:", err);
        setState({
          liffUser: null,
          user: null,
          loading: false,
          error: "認証に失敗しました",
        });
      }
    }
    init();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
