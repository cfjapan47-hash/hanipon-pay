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
  status: string;
}

const AuthContext = createContext<AuthState>({
  liffUser: null,
  user: null,
  loading: true,
  error: null,
  status: "",
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
    status: "初期化中...",
  });

  useEffect(() => {
    async function init() {
      // Step 1: LIFF初期化（30秒タイムアウト）
      setState((s) => ({ ...s, status: "LINE接続中..." }));
      try {
        await Promise.race([
          initLiff(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("LIFF初期化タイムアウト")), 30000)
          ),
        ]);
      } catch (liffErr) {
        console.error("[Auth] LIFF init failed:", liffErr);
        setState({
          liffUser: { userId: "guest", displayName: "ゲスト" },
          user: createFallbackUser("ゲスト"),
          loading: false,
          error: null,
          status: "ゲストモード",
        });
        return;
      }

      // Step 2: プロフィール取得（15秒タイムアウト）
      setState((s) => ({ ...s, status: "プロフィール取得中..." }));
      let liffUser: LiffUser;
      try {
        liffUser = await Promise.race([
          getLiffUser(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("プロフィール取得タイムアウト")), 15000)
          ),
        ]);
      } catch (profileErr) {
        console.warn("[Auth] getProfile failed:", profileErr);
        setState({
          liffUser: { userId: "guest", displayName: "ゲスト" },
          user: createFallbackUser("ゲスト"),
          loading: false,
          error: null,
          status: "ゲストモード",
        });
        return;
      }

      // Step 3: Firestore ユーザーデータ取得（15秒タイムアウト）
      setState((s) => ({ ...s, status: "データ読み込み中..." }));
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
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Firestore timeout")), 15000)
            ),
          ]);
        } catch (firestoreErr) {
          console.warn("[Auth] Firestore failed:", firestoreErr);
          user = createFallbackUser(liffUser.displayName, liffUser.pictureUrl);
        }
      }

      setState({ liffUser, user, loading: false, error: null, status: "完了" });
    }
    init();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
