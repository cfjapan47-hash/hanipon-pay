import liff from "@line/liff";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";
const IS_DEV = process.env.NODE_ENV === "development";

export interface LiffUser {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

let initialized = false;
let useMock = false;

export async function initLiff(): Promise<void> {
  if (initialized) return;

  if (IS_DEV && !LIFF_ID) {
    console.log("[LIFF] Development mode: using mock user (no LIFF_ID)");
    useMock = true;
    initialized = true;
    return;
  }

  try {
    await liff.init({ liffId: LIFF_ID });
    console.log("[LIFF] init success, isLoggedIn:", liff.isLoggedIn(), "isInClient:", liff.isInClient());

    if (!liff.isLoggedIn()) {
      if (IS_DEV) {
        console.log("[LIFF] Development mode: not logged in, using mock user");
        useMock = true;
        initialized = true;
        return;
      }
      // 本番環境: LINEログインにリダイレクト（現在のパスを保持）
      const currentUrl = window.location.href;
      liff.login({ redirectUri: currentUrl });
      return; // リダイレクト後は実行されない
    }
    initialized = true;
  } catch (error) {
    if (IS_DEV) {
      console.warn("[LIFF] Init failed in dev, using mock user:", error);
      useMock = true;
      initialized = true;
      return;
    }
    console.error("[LIFF] Initialization failed:", error);
    throw error;
  }
}

export async function getLiffUser(): Promise<LiffUser> {
  if (useMock) {
    return {
      userId: "dev-user-001",
      displayName: "テストユーザー",
      pictureUrl: undefined,
    };
  }

  // アクセストークンがない場合は再ログイン
  const token = liff.getAccessToken();
  if (!token) {
    console.warn("[LIFF] No access token, triggering login");
    const currentUrl = window.location.href;
    liff.login({ redirectUri: currentUrl });
    throw new Error("Re-login required");
  }

  try {
    const profile = await liff.getProfile();
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    };
  } catch (error) {
    console.error("[LIFF] getProfile failed:", error);
    throw error;
  }
}

export function closeLiff(): void {
  if (!IS_DEV && liff.isInClient()) {
    liff.closeWindow();
  }
}
