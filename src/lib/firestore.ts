import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  runTransaction,
  Timestamp,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { User, Merchant, Transaction, Referral, WithdrawalRequest, Coupon, CouponUse, Message, MessageThread, ShopCustomer, Area } from "@/types";

const IS_DEV = process.env.NODE_ENV === "development";
const HAS_LIFF =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_LIFF_ID &&
  process.env.NEXT_PUBLIC_LIFF_ID !== "";

const USE_MOCK = IS_DEV && !HAS_LIFF;

// ========== Mock Data ==========

const MOCK_MERCHANTS: { id: string; data: Merchant }[] = [
  {
    id: "mock-merchant-1",
    data: {
      name: "本庄ベーカリー",
      ownerUserId: "dev-merchant-001",
      address: "本庄市駅前町1-2-3",
      category: "飲食",
      qrCodeId: "hp-demo-bakery",
      isActive: true,
      createdAt: Timestamp.now(),
    },
  },
  {
    id: "mock-merchant-2",
    data: {
      name: "はにぽん書店",
      ownerUserId: "dev-merchant-002",
      address: "本庄市中央2-5-8",
      category: "小売",
      qrCodeId: "hp-demo-bookstore",
      isActive: true,
      createdAt: Timestamp.now(),
    },
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "mock-tx-1",
    fromUserId: "dev-user-001",
    toMerchantId: "mock-merchant-1",
    amount: 500,
    type: "payment",
    memo: "パン購入",
    createdAt: Timestamp.now(),
  },
  {
    id: "mock-tx-2",
    fromUserId: "system",
    toMerchantId: "",
    amount: 1000,
    type: "grant",
    memo: "プレミアム付与",
    createdAt: Timestamp.now(),
  },
];

// ========== Users ==========

export async function getUser(userId: string): Promise<User | null> {
  if (USE_MOCK) return null;
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? (snap.data() as User) : null;
}

export async function createUser(
  userId: string,
  data: { displayName: string; pictureUrl?: string }
): Promise<void> {
  if (USE_MOCK) return;
  await setDoc(doc(db, "users", userId), {
    displayName: data.displayName,
    pictureUrl: data.pictureUrl || null,
    balance: 0,
    role: "citizen",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function getOrCreateUser(
  userId: string,
  data: { displayName: string; pictureUrl?: string }
): Promise<User> {
  if (USE_MOCK) {
    return {
      displayName: data.displayName,
      pictureUrl: data.pictureUrl,
      balance: 5000,
      role: "admin",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }
  const existing = await getUser(userId);
  if (existing) return existing;
  await createUser(userId, data);
  return (await getUser(userId))!;
}

// ========== Merchants ==========

export async function getMerchant(
  merchantId: string
): Promise<Merchant | null> {
  if (USE_MOCK) {
    const m = MOCK_MERCHANTS.find((m) => m.id === merchantId);
    return m?.data || null;
  }
  const snap = await getDoc(doc(db, "merchants", merchantId));
  return snap.exists() ? (snap.data() as Merchant) : null;
}

export async function getMerchantByQrCode(
  qrCodeId: string
): Promise<{ id: string; data: Merchant } | null> {
  if (USE_MOCK) {
    return (
      MOCK_MERCHANTS.find(
        (m) => m.data.qrCodeId === qrCodeId && m.data.isActive
      ) || null
    );
  }
  const q = query(
    collection(db, "merchants"),
    where("qrCodeId", "==", qrCodeId),
    where("isActive", "==", true),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, data: d.data() as Merchant };
}

export async function getMerchantByOwner(
  ownerUserId: string
): Promise<{ id: string; data: Merchant } | null> {
  if (USE_MOCK) {
    return (
      MOCK_MERCHANTS.find((m) => m.data.ownerUserId === ownerUserId) || null
    );
  }
  const q = query(
    collection(db, "merchants"),
    where("ownerUserId", "==", ownerUserId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, data: d.data() as Merchant };
}

export async function getAllMerchants(): Promise<
  { id: string; data: Merchant }[]
> {
  if (USE_MOCK) return MOCK_MERCHANTS;
  const q = query(collection(db, "merchants"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Merchant }));
}

export async function createMerchant(
  data: Omit<Merchant, "createdAt">
): Promise<string> {
  if (USE_MOCK) {
    console.log("[Mock] createMerchant:", data);
    return "mock-new-merchant";
  }
  const ref = await addDoc(collection(db, "merchants"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateMerchant(
  merchantId: string,
  data: Partial<Merchant>
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] updateMerchant:", merchantId, data);
    return;
  }
  await updateDoc(doc(db, "merchants", merchantId), data);
}

// ========== Transactions ==========

export async function getUserTransactions(
  userId: string,
  maxCount = 20
): Promise<Transaction[]> {
  if (USE_MOCK) return MOCK_TRANSACTIONS.slice(0, maxCount);
  const q = query(
    collection(db, "transactions"),
    where("fromUserId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction);
}

export async function getMerchantTransactions(
  merchantId: string,
  maxCount = 50
): Promise<Transaction[]> {
  if (USE_MOCK)
    return MOCK_TRANSACTIONS.filter(
      (tx) => tx.toMerchantId === merchantId
    ).slice(0, maxCount);
  const q = query(
    collection(db, "transactions"),
    where("toMerchantId", "==", merchantId),
    orderBy("createdAt", "desc"),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction);
}

// ========== Payment (Atomic) ==========

export async function processPayment(
  fromUserId: string,
  toMerchantId: string,
  amount: number,
  memo = ""
): Promise<string> {
  if (amount <= 0) throw new Error("金額は1以上を指定してください");

  if (USE_MOCK) {
    console.log("[Mock] processPayment:", { fromUserId, toMerchantId, amount, memo });
    return "mock-tx-new";
  }

  const txId = await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", fromUserId);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("ユーザーが見つかりません");

    const user = userSnap.data() as User;
    if (user.balance < amount) throw new Error("ポイント残高が不足しています");

    // 市民の残高を減算
    tx.update(userRef, {
      balance: user.balance - amount,
      updatedAt: Timestamp.now(),
    });

    // 加盟店の売上残高を加算
    const merchantRef = doc(db, "merchants", toMerchantId);
    const merchantSnap = await tx.get(merchantRef);
    if (merchantSnap.exists()) {
      const merchant = merchantSnap.data() as Merchant;
      tx.update(merchantRef, {
        salesBalance: (merchant.salesBalance || 0) + amount,
      });
    }

    const txRef = doc(collection(db, "transactions"));
    tx.set(txRef, {
      fromUserId,
      toMerchantId,
      amount,
      type: "payment",
      memo,
      createdAt: Timestamp.now(),
    });

    return txRef.id;
  });

  // 顧客データを更新（トランザクション外で非同期処理）
  try {
    const userSnap = await getDoc(doc(db, "users", fromUserId));
    const userData = userSnap.exists() ? (userSnap.data() as User) : null;
    const customerId = `${toMerchantId}_${fromUserId}`;
    const customerRef = doc(db, "shopCustomers", customerId);
    const customerSnap = await getDoc(customerRef);

    if (customerSnap.exists()) {
      const existing = customerSnap.data() as ShopCustomer;
      await updateDoc(customerRef, {
        lastVisit: Timestamp.now(),
        visitCount: (existing.visitCount || 0) + 1,
        totalSpent: (existing.totalSpent || 0) + amount,
        displayName: userData?.displayName || existing.displayName,
      });
    } else {
      await setDoc(customerRef, {
        merchantId: toMerchantId,
        userId: fromUserId,
        displayName: userData?.displayName || "ユーザー",
        pictureUrl: userData?.pictureUrl || null,
        firstVisit: Timestamp.now(),
        lastVisit: Timestamp.now(),
        visitCount: 1,
        totalSpent: amount,
      });
    }
  } catch (e) {
    console.warn("[shopCustomer] update failed (non-critical):", e);
  }

  return txId;
}

// ========== Point Grant ==========

export async function grantPoints(
  toUserId: string,
  amount: number,
  reason: string,
  grantedBy: string
): Promise<string> {
  if (amount <= 0) throw new Error("付与ポイントは1以上を指定してください");

  if (USE_MOCK) {
    console.log("[Mock] grantPoints:", { toUserId, amount, reason, grantedBy });
    return "mock-grant-new";
  }

  const grantId = await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", toUserId);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("対象ユーザーが見つかりません");

    const user = userSnap.data() as User;

    tx.update(userRef, {
      balance: user.balance + amount,
      updatedAt: Timestamp.now(),
    });

    const grantRef = doc(collection(db, "pointGrants"));
    tx.set(grantRef, {
      toUserId,
      amount,
      reason,
      grantedBy,
      createdAt: Timestamp.now(),
    });

    const txRef = doc(collection(db, "transactions"));
    tx.set(txRef, {
      fromUserId: "system",
      toMerchantId: "",
      amount,
      type: "grant",
      memo: reason,
      createdAt: Timestamp.now(),
    });

    return grantRef.id;
  });

  return grantId;
}

// ========== Merchant Self-Registration ==========

export async function registerMerchantSelf(data: {
  name: string;
  ownerUserId: string;
  address: string;
  category: string;
  phone: string;
  referrerId?: string;
  areaId?: string;
}): Promise<string> {
  if (USE_MOCK) {
    console.log("[Mock] registerMerchantSelf:", data);
    return "mock-self-merchant";
  }

  const AREA_NAMES: Record<string, string> = {
    honjo: "本庄市", kumagaya: "熊谷市", fukaya: "深谷市", kodama: "児玉郡",
  };

  const qrCodeId = `hp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const merchantId = await createMerchant({
    name: data.name,
    ownerUserId: data.ownerUserId,
    address: data.address,
    category: data.category,
    phone: data.phone,
    qrCodeId,
    isActive: true,
    status: "pending",
    areaId: data.areaId || "honjo",
    areaName: AREA_NAMES[data.areaId || "honjo"] || data.areaId || "本庄市",
    referrerId: data.referrerId || null,
    referrerRewarded: false,
  });

  // 紹介者がいる場合、紹介記録を保存
  if (data.referrerId) {
    await addDoc(collection(db, "referrals"), {
      referrerId: data.referrerId,
      merchantId,
      merchantName: data.name,
      reward: 500,
      rewarded: false,
      createdAt: Timestamp.now(),
    });
  }

  return merchantId;
}

// ========== Referral Reward ==========

const REFERRAL_REWARD = 500;

export async function processReferralReward(
  merchantId: string
): Promise<void> {
  if (USE_MOCK) return;

  const merchant = await getMerchant(merchantId);
  if (!merchant || !merchant.referrerId || merchant.referrerRewarded) return;

  await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", merchant.referrerId!);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) return;

    const user = userSnap.data() as User;

    // 紹介者に報酬付与
    tx.update(userRef, {
      balance: user.balance + REFERRAL_REWARD,
      referralCount: (user.referralCount || 0) + 1,
      updatedAt: Timestamp.now(),
    });

    // 加盟店の報酬済みフラグを更新
    tx.update(doc(db, "merchants", merchantId), {
      referrerRewarded: true,
    });

    // トランザクション記録
    const txRef = doc(collection(db, "transactions"));
    tx.set(txRef, {
      fromUserId: "system",
      toMerchantId: "",
      amount: REFERRAL_REWARD,
      type: "referral_reward",
      memo: `加盟店紹介報酬: ${merchant.name}`,
      createdAt: Timestamp.now(),
    });
  });

  // 紹介記録を報酬済みに更新
  const refQuery = query(
    collection(db, "referrals"),
    where("merchantId", "==", merchantId),
    where("rewarded", "==", false),
    limit(1)
  );
  const refSnap = await getDocs(refQuery);
  if (!refSnap.empty) {
    await updateDoc(refSnap.docs[0].ref, { rewarded: true });
  }
}

export async function getUserReferrals(
  userId: string
): Promise<Referral[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "referrals"),
    where("referrerId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Referral);
}

// ========== Withdrawal (換金申請) ==========

export async function createWithdrawalRequest(
  merchantId: string,
  merchantName: string,
  amount: number,
  bankAccount: string,
  bankName: string
): Promise<string> {
  if (amount <= 0) throw new Error("換金額は1以上を指定してください");

  if (USE_MOCK) {
    console.log("[Mock] createWithdrawalRequest:", { merchantId, amount });
    return "mock-withdrawal";
  }

  // 売上残高チェック & 減算をアトミックに
  const wdId = await runTransaction(db, async (tx) => {
    const merchantRef = doc(db, "merchants", merchantId);
    const merchantSnap = await tx.get(merchantRef);
    if (!merchantSnap.exists()) throw new Error("加盟店が見つかりません");

    const merchant = merchantSnap.data() as Merchant;
    const salesBalance = merchant.salesBalance || 0;
    if (salesBalance < amount) throw new Error("売上残高が不足しています");

    // 売上残高を減算
    tx.update(merchantRef, {
      salesBalance: salesBalance - amount,
    });

    // 換金申請を作成
    const wdRef = doc(collection(db, "withdrawals"));
    tx.set(wdRef, {
      merchantId,
      merchantName,
      amount,
      bankAccount,
      bankName,
      status: "pending",
      createdAt: Timestamp.now(),
    });

    return wdRef.id;
  });

  return wdId;
}

export async function getMerchantWithdrawals(
  merchantId: string
): Promise<WithdrawalRequest[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "withdrawals"),
    where("merchantId", "==", merchantId),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WithdrawalRequest);
}

export async function getAllWithdrawals(): Promise<WithdrawalRequest[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "withdrawals"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WithdrawalRequest);
}

export async function processWithdrawal(
  withdrawalId: string,
  status: "completed" | "rejected"
): Promise<void> {
  if (USE_MOCK) return;
  await updateDoc(doc(db, "withdrawals", withdrawalId), {
    status,
    processedAt: Timestamp.now(),
  });
}

// ========== Coupons ==========

export async function createCoupon(data: {
  merchantId: string;
  merchantName: string;
  title: string;
  description?: string;
  type: Coupon["type"];
  value: number;
  minAmount?: number;
  maxUses: number;
  startAt: Date;
  endAt: Date;
}): Promise<string> {
  if (USE_MOCK) {
    console.log("[Mock] createCoupon:", data);
    return "mock-coupon-new";
  }
  const ref = await addDoc(collection(db, "coupons"), {
    merchantId: data.merchantId,
    merchantName: data.merchantName,
    title: data.title,
    description: data.description || "",
    type: data.type,
    value: data.value,
    minAmount: data.minAmount || 0,
    maxUses: data.maxUses,
    usedCount: 0,
    startAt: Timestamp.fromDate(data.startAt),
    endAt: Timestamp.fromDate(data.endAt),
    status: "active",
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getMerchantCoupons(
  merchantId: string
): Promise<Coupon[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "coupons"),
    where("merchantId", "==", merchantId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Coupon);
}

export async function getActiveCoupons(): Promise<Coupon[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "coupons"),
    where("status", "==", "active"),
    orderBy("endAt", "asc")
  );
  const snap = await getDocs(q);
  const now = new Date();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Coupon)
    .filter((c) => {
      const end = c.endAt?.toDate();
      const start = c.startAt?.toDate();
      return end && end > now && start && start <= now && c.usedCount < c.maxUses;
    });
}

export async function getActiveCouponsByMerchant(
  merchantId: string
): Promise<Coupon[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "coupons"),
    where("merchantId", "==", merchantId),
    where("status", "==", "active"),
    orderBy("endAt", "asc")
  );
  const snap = await getDocs(q);
  const now = new Date();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Coupon)
    .filter((c) => {
      const end = c.endAt?.toDate();
      const start = c.startAt?.toDate();
      return end && end > now && start && start <= now && c.usedCount < c.maxUses;
    });
}

export async function useCoupon(
  couponId: string,
  userId: string,
  paymentAmount: number
): Promise<{ discount: number }> {
  if (USE_MOCK) return { discount: 100 };

  const result = await runTransaction(db, async (tx) => {
    const couponRef = doc(db, "coupons", couponId);
    const couponSnap = await tx.get(couponRef);
    if (!couponSnap.exists()) throw new Error("クーポンが見つかりません");

    const coupon = couponSnap.data() as Coupon;
    const now = new Date();
    const end = coupon.endAt?.toDate();
    const start = coupon.startAt?.toDate();

    if (coupon.status !== "active") throw new Error("このクーポンは無効です");
    if (end && end < now) throw new Error("このクーポンは期限切れです");
    if (start && start > now) throw new Error("このクーポンはまだ有効期間前です");
    if (coupon.usedCount >= coupon.maxUses) throw new Error("クーポンの利用上限に達しました");
    if (coupon.minAmount && paymentAmount < coupon.minAmount) {
      throw new Error(`${coupon.minAmount}pt以上のお支払いで利用できます`);
    }

    // 同一ユーザーの重複利用チェック
    const existingUse = query(
      collection(db, "couponUses"),
      where("couponId", "==", couponId),
      where("userId", "==", userId),
      limit(1)
    );
    const existingSnap = await getDocs(existingUse);
    if (!existingSnap.empty) throw new Error("このクーポンは既に利用済みです");

    // 割引額の計算
    let discount = 0;
    if (coupon.type === "percent") {
      discount = Math.floor(paymentAmount * (coupon.value / 100));
    } else if (coupon.type === "fixed") {
      discount = Math.min(coupon.value, paymentAmount);
    } else if (coupon.type === "cashback") {
      discount = Math.floor(paymentAmount * (coupon.value / 100));
    }

    // クーポン使用数を更新
    tx.update(couponRef, {
      usedCount: coupon.usedCount + 1,
    });

    // クーポン使用記録を作成
    const useRef = doc(collection(db, "couponUses"));
    tx.set(useRef, {
      couponId,
      userId,
      merchantId: coupon.merchantId,
      discount,
      createdAt: Timestamp.now(),
    });

    return { discount };
  });

  return result;
}

export async function updateCouponStatus(
  couponId: string,
  status: Coupon["status"]
): Promise<void> {
  if (USE_MOCK) return;
  await updateDoc(doc(db, "coupons", couponId), { status });
}

export async function getUserCouponUses(
  userId: string
): Promise<CouponUse[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "couponUses"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CouponUse);
}

// ========== Messages ==========

function getThreadId(merchantId: string, userId: string): string {
  return `${merchantId}_${userId}`;
}

export async function sendMessage(data: {
  merchantId: string;
  merchantName: string;
  userId: string;
  userName: string;
  senderType: "merchant" | "citizen";
  senderId: string;
  text: string;
}): Promise<string> {
  if (USE_MOCK) {
    console.log("[Mock] sendMessage:", data);
    return "mock-msg-new";
  }

  const threadId = getThreadId(data.merchantId, data.userId);

  // メッセージを保存
  const msgRef = await addDoc(collection(db, "messages"), {
    threadId,
    merchantId: data.merchantId,
    merchantName: data.merchantName,
    userId: data.userId,
    userName: data.userName,
    senderType: data.senderType,
    senderId: data.senderId,
    text: data.text,
    read: false,
    createdAt: Timestamp.now(),
  });

  // スレッドを更新 or 作成
  const threadRef = doc(db, "messageThreads", threadId);
  const threadSnap = await getDoc(threadRef);

  if (threadSnap.exists()) {
    const thread = threadSnap.data() as MessageThread;
    await updateDoc(threadRef, {
      lastMessage: data.text,
      lastMessageAt: Timestamp.now(),
      ...(data.senderType === "merchant"
        ? { unreadByCitizen: (thread.unreadByCitizen || 0) + 1 }
        : { unreadByMerchant: (thread.unreadByMerchant || 0) + 1 }),
    });
  } else {
    await setDoc(threadRef, {
      merchantId: data.merchantId,
      merchantName: data.merchantName,
      userId: data.userId,
      userName: data.userName,
      lastMessage: data.text,
      lastMessageAt: Timestamp.now(),
      unreadByMerchant: data.senderType === "citizen" ? 1 : 0,
      unreadByCitizen: data.senderType === "merchant" ? 1 : 0,
    });
  }

  return msgRef.id;
}

export async function getThreadMessages(
  merchantId: string,
  userId: string,
  maxCount = 50
): Promise<Message[]> {
  if (USE_MOCK) return [];
  const threadId = getThreadId(merchantId, userId);
  const q = query(
    collection(db, "messages"),
    where("threadId", "==", threadId),
    orderBy("createdAt", "asc"),
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Message);
}

export async function getMerchantThreads(
  merchantId: string
): Promise<MessageThread[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "messageThreads"),
    where("merchantId", "==", merchantId),
    orderBy("lastMessageAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MessageThread);
}

export async function getCitizenThreads(
  userId: string
): Promise<MessageThread[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "messageThreads"),
    where("userId", "==", userId),
    orderBy("lastMessageAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MessageThread);
}

export async function markThreadRead(
  merchantId: string,
  userId: string,
  readerType: "merchant" | "citizen"
): Promise<void> {
  if (USE_MOCK) return;
  const threadId = getThreadId(merchantId, userId);
  const threadRef = doc(db, "messageThreads", threadId);
  await updateDoc(threadRef, {
    ...(readerType === "merchant"
      ? { unreadByMerchant: 0 }
      : { unreadByCitizen: 0 }),
  });
}

// ========== Shop Customers ==========

export async function getOrCreateShopCustomer(data: {
  merchantId: string;
  userId: string;
  displayName: string;
  pictureUrl?: string;
}): Promise<ShopCustomer> {
  if (USE_MOCK) {
    return {
      merchantId: data.merchantId,
      userId: data.userId,
      displayName: data.displayName,
      pictureUrl: data.pictureUrl,
      firstVisit: Timestamp.now(),
      lastVisit: Timestamp.now(),
      visitCount: 1,
      totalSpent: 0,
    };
  }

  const customerId = `${data.merchantId}_${data.userId}`;
  const ref = doc(db, "shopCustomers", customerId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as ShopCustomer;
  }

  const newCustomer = {
    merchantId: data.merchantId,
    userId: data.userId,
    displayName: data.displayName,
    pictureUrl: data.pictureUrl || null,
    firstVisit: Timestamp.now(),
    lastVisit: Timestamp.now(),
    visitCount: 0,
    totalSpent: 0,
  };
  await setDoc(ref, newCustomer);
  return { id: customerId, ...newCustomer } as ShopCustomer;
}

export async function getMerchantCustomers(
  merchantId: string
): Promise<ShopCustomer[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "shopCustomers"),
    where("merchantId", "==", merchantId),
    orderBy("lastVisit", "desc"),
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ShopCustomer);
}

// ========== Cash Charge (加盟店現金チャージ) ==========

/**
 * 加盟店が市民に現金チャージを行う
 * - 市民の残高: +chargeAmount
 * - 加盟店の売上残高: -(chargeAmount - fee)
 * - 加盟店の手元現金: +chargeAmount（物理的に受け取る）
 * - 手数料(2%): 加盟店の収益
 */
export async function processCashCharge(
  merchantId: string,
  merchantName: string,
  citizenUserId: string,
  chargeAmount: number,
  feeRate: number = 0.02
): Promise<string> {
  if (USE_MOCK) return "mock-charge-id";

  const fee = Math.floor(chargeAmount * feeRate);
  const merchantDeduction = chargeAmount - fee;

  const merchantRef = doc(db, "merchants", merchantId);
  const userRef = doc(db, "users", citizenUserId);

  return await runTransaction(db, async (transaction) => {
    const merchantDoc = await transaction.get(merchantRef);
    const userDoc = await transaction.get(userRef);

    if (!merchantDoc.exists()) throw new Error("加盟店が見つかりません");
    if (!userDoc.exists()) throw new Error("ユーザーが見つかりません");

    const merchantData = merchantDoc.data();
    const currentMerchantBalance = merchantData.salesBalance || 0;

    if (currentMerchantBalance < merchantDeduction) {
      throw new Error(
        `加盟店の売上残高が不足しています（残高: ${currentMerchantBalance}pt、必要: ${merchantDeduction}pt）`
      );
    }

    // 市民の残高を増やす
    transaction.update(userRef, {
      balance: increment(chargeAmount),
      updatedAt: serverTimestamp(),
    });

    // 加盟店の売上残高を減らす
    transaction.update(merchantRef, {
      salesBalance: increment(-merchantDeduction),
    });

    // 取引履歴を記録
    const txRef = doc(collection(db, "transactions"));
    transaction.set(txRef, {
      fromUserId: merchantId,
      toMerchantId: citizenUserId,
      amount: chargeAmount,
      type: "cash_charge",
      memo: `${merchantName}で現金チャージ（手数料${fee}pt）`,
      createdAt: serverTimestamp(),
    });

    return txRef.id;
  });
}

// ========== Area (エリア管理) ==========

export async function getAreas(): Promise<Area[]> {
  if (USE_MOCK) return [];
  const snap = await getDocs(collection(db, "areas"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Area));
}

export async function getArea(areaId: string): Promise<Area | null> {
  if (USE_MOCK) return null;
  const snap = await getDoc(doc(db, "areas", areaId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Area;
}

export async function createArea(areaId: string, data: Omit<Area, "id">): Promise<void> {
  if (USE_MOCK) return;
  await setDoc(doc(db, "areas", areaId), data);
}

/**
 * 地域限定ポイントを付与
 * localBalance.{areaId} に加算する
 */
export async function grantLocalPoints(
  toUserId: string,
  amount: number,
  areaId: string,
  reason: string,
  grantedBy: string
): Promise<string> {
  if (USE_MOCK) return "mock-local-grant-id";

  const userRef = doc(db, "users", toUserId);

  return await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("ユーザーが見つかりません");

    const userData = userDoc.data();
    const localBalance = userData.localBalance || {};
    localBalance[areaId] = (localBalance[areaId] || 0) + amount;

    transaction.update(userRef, {
      localBalance,
      updatedAt: serverTimestamp(),
    });

    const txRef = doc(collection(db, "transactions"));
    transaction.set(txRef, {
      fromUserId: "system",
      toMerchantId: toUserId,
      amount,
      type: "grant",
      memo: `${reason}（${areaId}限定）`,
      pointType: "local",
      areaId,
      createdAt: serverTimestamp(),
    });

    return txRef.id;
  });
}

/**
 * 決済時にポイントを消費（地域限定→共通の優先順位）
 * 加盟店のエリアと一致する地域限定ポイントを先に使う
 */
export async function processPaymentWithArea(
  fromUserId: string,
  toMerchantId: string,
  amount: number,
  merchantAreaId: string | undefined,
  memo: string = ""
): Promise<{ txId: string; usedLocal: number; usedCommon: number }> {
  if (USE_MOCK) return { txId: "mock", usedLocal: 0, usedCommon: amount };

  const userRef = doc(db, "users", fromUserId);
  const merchantRef = doc(db, "merchants", toMerchantId);

  return await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const merchantDoc = await transaction.get(merchantRef);

    if (!userDoc.exists()) throw new Error("ユーザーが見つかりません");
    if (!merchantDoc.exists()) throw new Error("加盟店が見つかりません");

    const userData = userDoc.data();
    const commonBalance = userData.balance || 0;
    const localBalance = userData.localBalance || {};

    let usedLocal = 0;
    let usedCommon = 0;
    let remaining = amount;

    // ① 加盟店のエリアに一致する地域限定ポイントを先に使う
    if (merchantAreaId && localBalance[merchantAreaId] > 0) {
      usedLocal = Math.min(localBalance[merchantAreaId], remaining);
      localBalance[merchantAreaId] -= usedLocal;
      remaining -= usedLocal;
    }

    // ② 残りは共通ポイントで支払い
    usedCommon = remaining;
    if (commonBalance < usedCommon) {
      throw new Error("ポイント残高が不足しています");
    }

    // ユーザーの残高を更新
    transaction.update(userRef, {
      balance: commonBalance - usedCommon,
      localBalance,
      updatedAt: serverTimestamp(),
    });

    // 加盟店の売上残高を更新
    transaction.update(merchantRef, {
      salesBalance: increment(amount),
    });

    // 取引履歴
    const txRef = doc(collection(db, "transactions"));
    transaction.set(txRef, {
      fromUserId,
      toMerchantId,
      amount,
      type: "payment",
      memo: memo || (usedLocal > 0
        ? `地域限定${usedLocal}pt + 共通${usedCommon}pt`
        : `共通${usedCommon}pt`),
      pointType: usedLocal > 0 ? "local" : "common",
      areaId: merchantAreaId || null,
      createdAt: serverTimestamp(),
    });

    return { txId: txRef.id, usedLocal, usedCommon };
  });
}

// ========== Stats ==========

export async function getSystemStats(): Promise<{
  totalUsers: number;
  totalMerchants: number;
  totalTransactions: number;
}> {
  if (USE_MOCK) {
    return {
      totalUsers: 142,
      totalMerchants: MOCK_MERCHANTS.length,
      totalTransactions: MOCK_TRANSACTIONS.length,
    };
  }
  const [users, merchants, transactions] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(query(collection(db, "merchants"), where("isActive", "==", true))),
    getDocs(collection(db, "transactions")),
  ]);
  return {
    totalUsers: users.size,
    totalMerchants: merchants.size,
    totalTransactions: transactions.size,
  };
}
