import liff from "@line/liff";

const LIFF_ID_CITIZEN = process.env.NEXT_PUBLIC_LIFF_ID || "2009557990-bY9jHDSg";
const LIFF_ID_MERCHANT = process.env.NEXT_PUBLIC_LIFF_ID_MERCHANT || "2009557990-BN5K34LH";
const IS_DEV = process.env.NODE_ENV === "development";

function getLiffId(): string {
  // 常に市民用LIFF IDで初期化（加盟店ページもアプリ内ナビで遷移）
  return LIFF_ID_CITIZEN;
}

export interface LiffUser {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

let initialized = false;
let useMock = false;

export async function initLiff(): Promise<void> {
  if (initialized) return;

  const LIFF_ID = getLiffId();

  if (IS_DEV && !LIFF_ID) {
    console.log("[LIFF] Development mode: using mock user (no LIFF_ID)");
    useMock = true;
    initialized = true;
    return;
  }

  try {
    console.log("[LIFF] initializing with ID:", LIFF_ID, "path:", typeof window !== "undefined" ? window.location.pathname : "unknown");
    await liff.init({ liffId: LIFF_ID });
    console.log("[LIFF] init success, isLoggedIn:", liff.isLoggedIn(), "isInClient:", liff.isInClient(), "token:", !!liff.getAccessToken());

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

  console.log("[LIFF] getLiffUser: isLoggedIn:", liff.isLoggedIn(), "isInClient:", liff.isInClient(), "token:", !!liff.getAccessToken());

  // 方法1: getProfile()を試す
  try {
    const profile = await liff.getProfile();
    console.log("[LIFF] getProfile success:", profile.displayName);
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    };
  } catch (err1) {
    console.warn("[LIFF] getProfile failed:", err1);
  }

  // 方法2: IDトークンからユーザー情報を取得
  try {
    const decoded = liff.getDecodedIDToken();
    if (decoded?.sub && decoded?.name) {
      console.log("[LIFF] Using decoded ID token:", decoded.name);
      return {
        userId: decoded.sub,
        displayName: decoded.name,
        pictureUrl: decoded.picture,
      };
    }
  } catch (err2) {
    console.warn("[LIFF] getDecodedIDToken failed:", err2);
  }

  // 方法3: コンテキストからユーザーIDを取得
  try {
    const context = liff.getContext();
    if (context?.userId) {
      console.log("[LIFF] Using context userId:", context.userId);
      return {
        userId: context.userId,
        displayName: "ユーザー",
        pictureUrl: undefined,
      };
    }
  } catch (err3) {
    console.warn("[LIFF] getContext failed:", err3);
  }

  throw new Error("ユーザー情報を取得できませんでした");
}

export function closeLiff(): void {
  if (!IS_DEV && liff.isInClient()) {
    liff.closeWindow();
  }
}
