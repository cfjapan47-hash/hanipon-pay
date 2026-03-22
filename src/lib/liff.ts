import liff from "@line/liff";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";
const IS_DEV = process.env.NODE_ENV === "development";

export interface LiffUser {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

let initialized = false;

export async function initLiff(): Promise<void> {
  if (initialized) return;

  if (IS_DEV && !LIFF_ID) {
    console.log("[LIFF] Development mode: using mock user");
    initialized = true;
    return;
  }

  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
    }
    initialized = true;
  } catch (error) {
    console.error("[LIFF] Initialization failed:", error);
    throw error;
  }
}

export async function getLiffUser(): Promise<LiffUser> {
  if (IS_DEV && !LIFF_ID) {
    return {
      userId: "dev-user-001",
      displayName: "テストユーザー",
      pictureUrl: undefined,
    };
  }

  const profile = await liff.getProfile();
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
  };
}

export function closeLiff(): void {
  if (!IS_DEV && liff.isInClient()) {
    liff.closeWindow();
  }
}
