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
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { User, Merchant, Transaction, Referral, WithdrawalRequest, Coupon, CouponUse, Message, MessageThread, ShopCustomer, Area, CustomerNote, ChargeRequest, Card, StampCard, UserStamp, ReservationSettings, Reservation, Product, Order, OrderStatus, Delivery, DeliveryStatus, Driver, KycRecord, Invoice, InvoiceStatus, BirthdayCouponSettings } from "@/types";

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

    // 加盟店の売上残高を加算（4%手数料を差し引き）
    const feeRate = 0.04;
    const fee = Math.floor(amount * feeRate);
    const merchantReceive = amount - fee;

    const merchantRef = doc(db, "merchants", toMerchantId);
    const merchantSnap = await tx.get(merchantRef);
    if (merchantSnap.exists()) {
      const merchant = merchantSnap.data() as Merchant;
      tx.update(merchantRef, {
        salesBalance: (merchant.salesBalance || 0) + merchantReceive,
      });
    }

    const txRef = doc(collection(db, "transactions"));
    tx.set(txRef, {
      fromUserId,
      toMerchantId,
      amount,
      fee,
      merchantReceive,
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

  // スタンプを自動付与
  try {
    await addStamp(toMerchantId, fromUserId);
  } catch (e) {
    console.warn("[stamp] auto-stamp failed (non-critical):", e);
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
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Coupon)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

export async function getActiveCoupons(): Promise<Coupon[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "coupons"),
    where("status", "==", "active")
  );
  const snap = await getDocs(q);
  const now = new Date();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Coupon)
    .filter((c) => {
      const end = c.endAt?.toDate();
      const start = c.startAt?.toDate();
      return end && end > now && start && start <= now && c.usedCount < c.maxUses;
    })
    .sort((a, b) => (a.endAt?.seconds || 0) - (b.endAt?.seconds || 0));
}

export async function getActiveCouponsByMerchant(
  merchantId: string
): Promise<Coupon[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "coupons"),
    where("merchantId", "==", merchantId)
  );
  const snap = await getDocs(q);
  const now = new Date();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Coupon)
    .filter((c) => {
      const end = c.endAt?.toDate();
      const start = c.startAt?.toDate();
      return c.status === "active" && end && end > now && start && start <= now && c.usedCount < c.maxUses;
    })
    .sort((a, b) => (a.endAt?.seconds || 0) - (b.endAt?.seconds || 0));
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
    limit(maxCount)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Message)
    .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
}

export async function getMerchantThreads(
  merchantId: string
): Promise<MessageThread[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "messageThreads"),
    where("merchantId", "==", merchantId),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as MessageThread)
    .sort((a, b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0));
}

export async function getCitizenThreads(
  userId: string
): Promise<MessageThread[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "messageThreads"),
    where("userId", "==", userId),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as MessageThread)
    .sort((a, b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0));
}

// ========== リアルタイムリスナー ==========

/**
 * メッセージスレッドをリアルタイム監視
 */
export function onThreadMessages(
  merchantId: string,
  userId: string,
  callback: (messages: Message[]) => void
): () => void {
  const threadId = getThreadId(merchantId, userId);
  const q = query(
    collection(db, "messages"),
    where("threadId", "==", threadId),
    limit(100)
  );

  // リアルタイムリスナー + ポーリングフォールバック
  let unsubSnapshot = () => {};
  try {
    unsubSnapshot = onSnapshot(q, (snap) => {
      const messages = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Message)
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      callback(messages);
    }, (err) => {
      console.warn("[onThreadMessages] snapshot error, using polling:", err);
    });
  } catch { /* ignore */ }

  // 5秒ごとのポーリングも併用
  const interval = setInterval(async () => {
    try {
      const snap = await getDocs(q);
      const messages = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Message)
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      callback(messages);
    } catch { /* ignore */ }
  }, 5000);

  return () => {
    unsubSnapshot();
    clearInterval(interval);
  };
}

export function onMerchantThreads(
  merchantId: string,
  callback: (threads: MessageThread[]) => void
): () => void {
  const q = query(
    collection(db, "messageThreads"),
    where("merchantId", "==", merchantId),
    limit(50)
  );

  let unsubSnapshot = () => {};
  try {
    unsubSnapshot = onSnapshot(q, (snap) => {
      const threads = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as MessageThread)
        .sort((a, b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0));
      callback(threads);
    }, (err) => {
      console.warn("[onMerchantThreads] snapshot error:", err);
    });
  } catch { /* ignore */ }

  const interval = setInterval(async () => {
    try {
      const snap = await getDocs(q);
      const threads = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as MessageThread)
        .sort((a, b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0));
      callback(threads);
    } catch { /* ignore */ }
  }, 5000);

  return () => {
    unsubSnapshot();
    clearInterval(interval);
  };
}

export function onCitizenThreads(
  userId: string,
  callback: (threads: MessageThread[]) => void
): () => void {
  const q = query(
    collection(db, "messageThreads"),
    where("userId", "==", userId),
    limit(50)
  );

  let unsubSnapshot = () => {};
  try {
    unsubSnapshot = onSnapshot(q, (snap) => {
      const threads = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as MessageThread)
        .sort((a, b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0));
      callback(threads);
    }, (err) => {
      console.warn("[onCitizenThreads] snapshot error:", err);
    });
  } catch { /* ignore */ }

  const interval = setInterval(async () => {
    try {
      const snap = await getDocs(q);
      const threads = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as MessageThread)
        .sort((a, b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0));
      callback(threads);
    } catch { /* ignore */ }
  }, 5000);

  return () => {
    unsubSnapshot();
    clearInterval(interval);
  };
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
    limit(100)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as ShopCustomer)
    .sort((a, b) => (b.lastVisit?.seconds || 0) - (a.lastVisit?.seconds || 0));
}

// ========== Favorite / お気に入り ==========

/**
 * 市民が加盟店をお気に入り登録（＝顧客リストにも自動追加）
 */
export async function favoriteShop(
  userId: string,
  displayName: string,
  pictureUrl: string | undefined,
  merchantId: string
): Promise<void> {
  if (USE_MOCK) return;
  await getOrCreateShopCustomer({
    merchantId,
    userId,
    displayName,
    pictureUrl,
  });
}

/**
 * 市民がお気に入り登録している加盟店一覧を取得
 */
export async function getUserFavoriteShops(
  userId: string
): Promise<ShopCustomer[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "shopCustomers"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ShopCustomer);
}

/**
 * アクティブな加盟店一覧を取得
 */
export async function getActiveShops(): Promise<{ id: string; data: Merchant }[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "merchants"),
    where("isActive", "==", true)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Merchant }));
}

/**
 * 加盟店のプロフィール情報を更新（ホームページ機能用）
 */
export async function updateMerchantProfile(
  merchantId: string,
  data: {
    description?: string;
    businessHours?: { open: string; close: string };
    closedDays?: string[];
    snsLinks?: { instagram?: string; x?: string };
    category?: string;
  }
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] updateMerchantProfile:", merchantId, data);
    return;
  }
  await updateDoc(doc(db, "merchants", merchantId), data);
}

/**
 * 加盟店のお知らせを追加（最新5件を保持）
 */
export async function addMerchantAnnouncement(
  merchantId: string,
  text: string
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] addAnnouncement:", merchantId, text);
    return;
  }
  const merchantRef = doc(db, "merchants", merchantId);
  const snap = await getDoc(merchantRef);
  if (!snap.exists()) throw new Error("加盟店が見つかりません");
  const data = snap.data() as Merchant;
  const existing = data.announcements || [];
  const newAnnouncement = { text, createdAt: Timestamp.now() };
  // 最新5件を保持
  const updated = [newAnnouncement, ...existing].slice(0, 5);
  await updateDoc(merchantRef, { announcements: updated });
}

/**
 * 加盟店のお知らせを削除
 */
export async function deleteMerchantAnnouncement(
  merchantId: string,
  index: number
): Promise<void> {
  if (USE_MOCK) return;
  const merchantRef = doc(db, "merchants", merchantId);
  const snap = await getDoc(merchantRef);
  if (!snap.exists()) throw new Error("加盟店が見つかりません");
  const data = snap.data() as Merchant;
  const existing = data.announcements || [];
  existing.splice(index, 1);
  await updateDoc(merchantRef, { announcements: existing });
}

/**
 * 加盟店の詳細情報を取得（公開ページ用）
 */
export async function getMerchantWithId(
  merchantId: string
): Promise<{ id: string; data: Merchant } | null> {
  if (USE_MOCK) {
    const m = MOCK_MERCHANTS.find((m) => m.id === merchantId);
    return m ? { id: m.id, data: m.data } : null;
  }
  const snap = await getDoc(doc(db, "merchants", merchantId));
  if (!snap.exists()) return null;
  return { id: snap.id, data: snap.data() as Merchant };
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

// ========== Customer Notes (顧客メモ) ==========

export async function addCustomerNote(
  merchantId: string,
  userId: string,
  text: string
): Promise<string> {
  if (USE_MOCK) return "mock-note-1";
  const ref = await addDoc(collection(db, "customerNotes"), {
    merchantId,
    userId,
    text,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getCustomerNotes(
  merchantId: string,
  userId: string
): Promise<CustomerNote[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "customerNotes"),
    where("merchantId", "==", merchantId),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomerNote);
}

// ========== Charge Requests (銀行振込チャージ) ==========

export async function createChargeRequest(
  userId: string,
  userName: string,
  amount: number
): Promise<string> {
  if (amount <= 0) throw new Error("チャージ金額は1以上を指定してください");

  if (USE_MOCK) {
    console.log("[Mock] createChargeRequest:", { userId, userName, amount });
    return "mock-charge-request";
  }

  const ref = await addDoc(collection(db, "chargeRequests"), {
    userId,
    userName,
    amount,
    status: "pending",
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getChargeRequests(
  userId: string
): Promise<ChargeRequest[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "chargeRequests"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(20)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChargeRequest);
}

export async function getPendingChargeRequests(): Promise<ChargeRequest[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "chargeRequests"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ChargeRequest);
}

export async function approveChargeRequest(
  requestId: string,
  adminId: string
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] approveChargeRequest:", { requestId, adminId });
    return;
  }

  await runTransaction(db, async (tx) => {
    const reqRef = doc(db, "chargeRequests", requestId);
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists()) throw new Error("チャージ申請が見つかりません");

    const req = reqSnap.data() as ChargeRequest;
    if (req.status !== "pending") throw new Error("この申請は既に処理済みです");

    const userRef = doc(db, "users", req.userId);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("対象ユーザーが見つかりません");

    const user = userSnap.data() as User;

    // ユーザーの残高を加算
    tx.update(userRef, {
      balance: user.balance + req.amount,
      updatedAt: Timestamp.now(),
    });

    // 申請を承認済みに更新
    tx.update(reqRef, {
      status: "approved",
      approvedAt: Timestamp.now(),
      approvedBy: adminId,
    });

    // トランザクション記録
    const txRef = doc(collection(db, "transactions"));
    tx.set(txRef, {
      fromUserId: "system",
      toMerchantId: "",
      amount: req.amount,
      type: "cash_charge",
      memo: `銀行振込チャージ`,
      createdAt: Timestamp.now(),
    });
  });
}

export async function rejectChargeRequest(
  requestId: string
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] rejectChargeRequest:", requestId);
    return;
  }
  await updateDoc(doc(db, "chargeRequests", requestId), {
    status: "rejected",
  });
}

// ========== Cards (紙カード) ==========

/** 最大カード番号を取得して次の番号を決定 */
async function getNextCardNumber(): Promise<number> {
  const q = query(
    collection(db, "cards"),
    orderBy("cardNumber", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return 1;
  const lastCard = snap.docs[0].data() as Card;
  const lastNum = parseInt(lastCard.cardNumber.replace("HANIPON-", ""), 10);
  return (isNaN(lastNum) ? 0 : lastNum) + 1;
}

/** カード一括発行 */
export async function issueCards(count: number): Promise<string[]> {
  if (count <= 0 || count > 1000) throw new Error("発行枚数は1〜1000枚で指定してください");
  if (USE_MOCK) {
    console.log("[Mock] issueCards:", count);
    return Array.from({ length: count }, (_, i) => `mock-card-${i + 1}`);
  }

  const startNum = await getNextCardNumber();
  const ids: string[] = [];

  for (let i = 0; i < count; i++) {
    const num = startNum + i;
    const cardNumber = `HANIPON-${String(num).padStart(5, "0")}`;
    const ref = await addDoc(collection(db, "cards"), {
      cardNumber,
      citizenId: "",
      balance: 0,
      isActive: true,
      createdAt: Timestamp.now(),
    });
    ids.push(ref.id);
  }

  return ids;
}

/** カード一覧取得 */
export async function getAllCards(): Promise<{ id: string; data: Card }[]> {
  if (USE_MOCK) return [];
  const q = query(collection(db, "cards"), orderBy("cardNumber", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Card }));
}

/** カード番号でカード取得 */
export async function getCardByNumber(
  cardNumber: string
): Promise<{ id: string; data: Card } | null> {
  if (USE_MOCK) return null;
  const q = query(
    collection(db, "cards"),
    where("cardNumber", "==", cardNumber),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, data: d.data() as Card };
}

/** 市民に紐付けられたカード取得 */
export async function getCardsByCitizen(
  citizenId: string
): Promise<{ id: string; data: Card }[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "cards"),
    where("citizenId", "==", citizenId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Card }));
}

/** カードの有効/無効を切替 */
export async function toggleCardActive(
  cardId: string,
  isActive: boolean
): Promise<void> {
  if (USE_MOCK) return;
  await updateDoc(doc(db, "cards", cardId), { isActive });
}

/** カードを市民に紐付け（カード残高をユーザー残高に統合） */
export async function linkCardToCitizen(
  cardNumber: string,
  citizenId: string
): Promise<void> {
  if (USE_MOCK) return;

  const cardResult = await getCardByNumber(cardNumber);
  if (!cardResult) throw new Error("カードが見つかりません");

  const { id: cardId, data: card } = cardResult;
  if (!card.isActive) throw new Error("このカードは無効です");
  if (card.citizenId && card.citizenId !== "") throw new Error("このカードは既に紐付けられています");

  await runTransaction(db, async (tx) => {
    const cardRef = doc(db, "cards", cardId);
    const cardSnap = await tx.get(cardRef);
    if (!cardSnap.exists()) throw new Error("カードが見つかりません");
    const cardData = cardSnap.data() as Card;

    // カード残高をユーザー残高に統合
    if (cardData.balance > 0) {
      const userRef = doc(db, "users", citizenId);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) throw new Error("ユーザーが見つかりません");
      const user = userSnap.data() as User;

      tx.update(userRef, {
        balance: user.balance + cardData.balance,
        updatedAt: Timestamp.now(),
      });

      // 残高移行のトランザクション記録
      const txRef = doc(collection(db, "transactions"));
      tx.set(txRef, {
        fromUserId: "card:" + cardNumber,
        toMerchantId: "",
        amount: cardData.balance,
        type: "card_balance_transfer",
        memo: `カード${cardNumber}の残高統合`,
        createdAt: Timestamp.now(),
      });
    }

    // カードを紐付け、残高を0にする
    tx.update(cardRef, {
      citizenId,
      balance: 0,
      linkedAt: Timestamp.now(),
    });
  });
}

// ========== Analytics (加盟店分析) ==========

export interface AnalyticsData {
  dailySales: { date: string; total: number; count: number }[];
  monthlySales: { current: number; previous: number };
  hourlyVisits: { label: string; count: number }[];
  repeaterRate: { repeaters: number; total: number };
  basicStats: {
    totalSales: number;
    totalTransactions: number;
    uniqueCustomers: number;
    avgPerTransaction: number;
  };
}

export async function getMerchantAnalytics(
  merchantId: string
): Promise<AnalyticsData> {
  if (USE_MOCK) {
    return {
      dailySales: Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          total: Math.floor(Math.random() * 5000) + 1000,
          count: Math.floor(Math.random() * 10) + 1,
        };
      }),
      monthlySales: { current: 45000, previous: 38000 },
      hourlyVisits: [
        { label: "6-10時", count: 5 },
        { label: "10-14時", count: 12 },
        { label: "14-18時", count: 8 },
        { label: "18-22時", count: 3 },
      ],
      repeaterRate: { repeaters: 15, total: 25 },
      basicStats: {
        totalSales: 120000,
        totalTransactions: 85,
        uniqueCustomers: 25,
        avgPerTransaction: 1412,
      },
    };
  }

  const now = new Date();

  // 過去30日+先月分のトランザクションを取得
  const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const txQuery = query(
    collection(db, "transactions"),
    where("toMerchantId", "==", merchantId),
    where("type", "==", "payment"),
    where("createdAt", ">=", Timestamp.fromDate(firstDayLastMonth)),
    orderBy("createdAt", "desc")
  );
  const txSnap = await getDocs(txQuery);
  const transactions = txSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Transaction
  );

  // 全トランザクション（累計用）
  const allTxQuery = query(
    collection(db, "transactions"),
    where("toMerchantId", "==", merchantId),
    where("type", "==", "payment")
  );
  const allTxSnap = await getDocs(allTxQuery);
  const allTransactions = allTxSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Transaction
  );

  // 日別売上（過去7日）
  const dailySales: { date: string; total: number; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const nextD = new Date(d);
    nextD.setDate(nextD.getDate() + 1);
    const dayTxs = transactions.filter((tx) => {
      const txDate = tx.createdAt.toDate();
      return txDate >= d && txDate < nextD;
    });
    dailySales.push({
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      total: dayTxs.reduce((sum, tx) => sum + tx.amount, 0),
      count: dayTxs.length,
    });
  }

  // 月別売上
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayLastMonth = new Date(firstDayThisMonth);
  const currentMonthTxs = transactions.filter(
    (tx) => tx.createdAt.toDate() >= firstDayThisMonth
  );
  const lastMonthTxs = transactions.filter((tx) => {
    const txDate = tx.createdAt.toDate();
    return txDate >= firstDayLastMonth && txDate < lastDayLastMonth;
  });
  const monthlySales = {
    current: currentMonthTxs.reduce((sum, tx) => sum + tx.amount, 0),
    previous: lastMonthTxs.reduce((sum, tx) => sum + tx.amount, 0),
  };

  // 時間帯別来客数（過去30日）
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentTxs = transactions.filter(
    (tx) => tx.createdAt.toDate() >= thirtyDaysAgo
  );
  const hourBuckets = [
    { label: "6-10時", min: 6, max: 10, count: 0 },
    { label: "10-14時", min: 10, max: 14, count: 0 },
    { label: "14-18時", min: 14, max: 18, count: 0 },
    { label: "18-22時", min: 18, max: 22, count: 0 },
  ];
  recentTxs.forEach((tx) => {
    const hour = tx.createdAt.toDate().getHours();
    const bucket = hourBuckets.find((b) => hour >= b.min && hour < b.max);
    if (bucket) bucket.count++;
  });

  // リピーター率
  const customerQuery = query(
    collection(db, "shopCustomers"),
    where("merchantId", "==", merchantId)
  );
  const customerSnap = await getDocs(customerQuery);
  const customers = customerSnap.docs.map((d) => d.data() as ShopCustomer);
  const repeaters = customers.filter((c) => c.visitCount >= 2).length;
  const repeaterRate = {
    repeaters,
    total: customers.length,
  };

  // 基本統計
  const uniqueUserIds = new Set(allTransactions.map((tx) => tx.fromUserId));
  const totalSales = allTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const basicStats = {
    totalSales,
    totalTransactions: allTransactions.length,
    uniqueCustomers: uniqueUserIds.size,
    avgPerTransaction:
      allTransactions.length > 0
        ? Math.round(totalSales / allTransactions.length)
        : 0,
  };

  return {
    dailySales,
    monthlySales,
    hourlyVisits: hourBuckets.map((b) => ({ label: b.label, count: b.count })),
    repeaterRate,
    basicStats,
  };
}

/** カードの紐付け解除 */
export async function unlinkCard(cardId: string): Promise<void> {
  if (USE_MOCK) return;
  await updateDoc(doc(db, "cards", cardId), {
    citizenId: "",
    linkedAt: null,
  });
}

/** 窓口チャージ（カード残高に加算） */
export async function chargeCard(
  cardNumber: string,
  amount: number,
  adminId: string
): Promise<void> {
  if (amount <= 0) throw new Error("チャージ金額は1以上を指定してください");
  if (USE_MOCK) return;

  const cardResult = await getCardByNumber(cardNumber);
  if (!cardResult) throw new Error("カードが見つかりません");

  const { id: cardId, data: card } = cardResult;
  if (!card.isActive) throw new Error("このカードは無効です");

  await runTransaction(db, async (tx) => {
    const cardRef = doc(db, "cards", cardId);
    const cardSnap = await tx.get(cardRef);
    if (!cardSnap.exists()) throw new Error("カードが見つかりません");
    const cardData = cardSnap.data() as Card;

    // カード残高を加算
    tx.update(cardRef, {
      balance: cardData.balance + amount,
    });

    // 紐付け済みの場合はユーザー残高にも加算
    if (cardData.citizenId && cardData.citizenId !== "") {
      const userRef = doc(db, "users", cardData.citizenId);
      const userSnap = await tx.get(userRef);
      if (userSnap.exists()) {
        const user = userSnap.data() as User;
        tx.update(userRef, {
          balance: user.balance + amount,
          updatedAt: Timestamp.now(),
        });
      }
    }

    // トランザクション記録
    const txRef = doc(collection(db, "transactions"));
    tx.set(txRef, {
      fromUserId: "admin:" + adminId,
      toMerchantId: "",
      amount,
      type: "card_charge",
      memo: `窓口チャージ: ${cardNumber}`,
      createdAt: Timestamp.now(),
    });
  });
}

// ========== Stamp Card (スタンプカード) ==========

export async function createStampCard(data: {
  merchantId: string;
  merchantName: string;
  requiredStamps: number;
  rewardType: "point" | "coupon";
  rewardValue: number;
  rewardDescription: string;
}): Promise<string> {
  if (USE_MOCK) return "mock-stamp-card-1";
  const ref = await addDoc(collection(db, "stampCards"), {
    ...data,
    isActive: true,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getStampCardByMerchant(
  merchantId: string
): Promise<StampCard | null> {
  if (USE_MOCK) return null;
  const q = query(
    collection(db, "stampCards"),
    where("merchantId", "==", merchantId),
    where("isActive", "==", true),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as StampCard;
}

export async function getAllStampCardsByMerchant(
  merchantId: string
): Promise<StampCard[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "stampCards"),
    where("merchantId", "==", merchantId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StampCard);
}

export async function updateStampCardStatus(
  stampCardId: string,
  isActive: boolean
): Promise<void> {
  if (USE_MOCK) return;
  await updateDoc(doc(db, "stampCards", stampCardId), { isActive });
}

export async function getUserStamp(
  merchantId: string,
  userId: string
): Promise<UserStamp | null> {
  if (USE_MOCK) return null;
  const id = `${merchantId}_${userId}`;
  const snap = await getDoc(doc(db, "userStamps", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as UserStamp;
}

export async function getUserStampsByUser(
  userId: string
): Promise<UserStamp[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "userStamps"),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserStamp);
}

/**
 * 決済時にスタンプを1つ付与する
 */
export async function addStamp(
  merchantId: string,
  userId: string
): Promise<{ stamped: boolean; completed: boolean }> {
  if (USE_MOCK) return { stamped: false, completed: false };

  // アクティブなスタンプカードがあるか確認
  const stampCard = await getStampCardByMerchant(merchantId);
  if (!stampCard || !stampCard.id) return { stamped: false, completed: false };

  const userStampId = `${merchantId}_${userId}`;
  const userStampRef = doc(db, "userStamps", userStampId);
  const userStampSnap = await getDoc(userStampRef);

  if (userStampSnap.exists()) {
    const data = userStampSnap.data() as UserStamp;
    const newCount = data.currentStamps + 1;
    const completed = newCount >= stampCard.requiredStamps;

    await updateDoc(userStampRef, {
      currentStamps: completed ? 0 : newCount,
      completedCount: completed ? (data.completedCount || 0) + 1 : data.completedCount || 0,
      lastStampAt: Timestamp.now(),
    });

    // 達成時に自動でポイント付与
    if (completed && stampCard.rewardType === "point") {
      try {
        await grantPoints(
          userId,
          stampCard.rewardValue,
          `スタンプカード達成報酬（${stampCard.rewardDescription}）`,
          "system:stamp"
        );
      } catch (e) {
        console.warn("[stamp] reward grant failed:", e);
      }
    }

    return { stamped: true, completed };
  } else {
    // 初回スタンプ
    await setDoc(userStampRef, {
      userId,
      merchantId,
      stampCardId: stampCard.id,
      currentStamps: 1,
      completedCount: 0,
      lastStampAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
    return { stamped: true, completed: false };
  }
}

/**
 * スタンプ達成時の報酬受け取り（手動用 - couponタイプ等）
 */
export async function claimStampReward(
  merchantId: string,
  userId: string
): Promise<boolean> {
  if (USE_MOCK) return false;

  const stampCard = await getStampCardByMerchant(merchantId);
  if (!stampCard || !stampCard.id) return false;

  const userStampId = `${merchantId}_${userId}`;
  const userStampRef = doc(db, "userStamps", userStampId);
  const userStampSnap = await getDoc(userStampRef);

  if (!userStampSnap.exists()) return false;
  const data = userStampSnap.data() as UserStamp;

  if (data.currentStamps < stampCard.requiredStamps) return false;

  // スタンプリセット + 達成カウント更新
  await updateDoc(userStampRef, {
    currentStamps: 0,
    completedCount: (data.completedCount || 0) + 1,
    lastStampAt: Timestamp.now(),
  });

  // ポイント報酬の場合は自動付与
  if (stampCard.rewardType === "point") {
    try {
      await grantPoints(
        userId,
        stampCard.rewardValue,
        `スタンプカード達成報酬（${stampCard.rewardDescription}）`,
        "system:stamp"
      );
    } catch (e) {
      console.warn("[stamp] reward grant failed:", e);
    }
  }

  return true;
}

// ========== Reservation Settings ==========

export async function getReservationSettings(
  merchantId: string
): Promise<ReservationSettings | null> {
  if (USE_MOCK) return null;
  const snap = await getDoc(doc(db, "reservationSettings", merchantId));
  return snap.exists() ? (snap.data() as ReservationSettings) : null;
}

export async function saveReservationSettings(
  merchantId: string,
  data: Omit<ReservationSettings, "updatedAt">
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] saveReservationSettings:", merchantId, data);
    return;
  }
  await setDoc(doc(db, "reservationSettings", merchantId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ========== Reservations ==========

export async function createReservation(
  data: Omit<Reservation, "id" | "createdAt">
): Promise<string> {
  if (USE_MOCK) {
    console.log("[Mock] createReservation:", data);
    return "mock-reservation-id";
  }
  const ref = await addDoc(collection(db, "reservations"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getReservationsByMerchant(
  merchantId: string
): Promise<Reservation[]> {
  if (USE_MOCK) return [];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const q = query(
    collection(db, "reservations"),
    where("merchantId", "==", merchantId),
    where("date", ">=", todayStr),
    orderBy("date", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reservation);
}

export async function getReservationsByUser(
  userId: string
): Promise<Reservation[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "reservations"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reservation);
}

export async function getReservationsByMerchantAndDate(
  merchantId: string,
  date: string
): Promise<Reservation[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "reservations"),
    where("merchantId", "==", merchantId),
    where("date", "==", date),
    where("status", "in", ["pending", "confirmed"])
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reservation);
}

export async function updateReservationStatus(
  reservationId: string,
  status: Reservation["status"]
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] updateReservationStatus:", reservationId, status);
    return;
  }
  await updateDoc(doc(db, "reservations", reservationId), { status });
}

export async function processReservationPrepayment(
  userId: string,
  merchantId: string,
  amount: number,
  reservationData: Omit<Reservation, "id" | "createdAt">
): Promise<string> {
  if (amount <= 0) throw new Error("金額は1以上を指定してください");

  if (USE_MOCK) {
    console.log("[Mock] processReservationPrepayment:", { userId, merchantId, amount });
    return "mock-reservation-prepaid";
  }

  const reservationId = await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", userId);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("ユーザーが見つかりません");

    const user = userSnap.data() as User;
    if (user.balance < amount) throw new Error("ポイント残高が不足しています");

    // 残高を減算
    tx.update(userRef, {
      balance: user.balance - amount,
      updatedAt: Timestamp.now(),
    });

    // 加盟店の売上残高を加算
    const merchantRef = doc(db, "merchants", merchantId);
    const merchantSnap = await tx.get(merchantRef);
    if (merchantSnap.exists()) {
      const merchant = merchantSnap.data() as Merchant;
      tx.update(merchantRef, {
        salesBalance: (merchant.salesBalance || 0) + amount,
      });
    }

    // 予約を作成
    const resRef = doc(collection(db, "reservations"));
    tx.set(resRef, {
      ...reservationData,
      createdAt: Timestamp.now(),
    });

    // 取引履歴を記録
    const txRef = doc(collection(db, "transactions"));
    tx.set(txRef, {
      fromUserId: userId,
      toMerchantId: merchantId,
      amount,
      type: "payment",
      memo: `予約事前決済（${reservationData.date} ${reservationData.time}）`,
      createdAt: Timestamp.now(),
    });

    return resRef.id;
  });

  return reservationId;
}

export async function processReservationCancellation(
  reservationId: string,
  userId: string,
  merchantId: string,
  cancellationFee: number,
  prepaidAmount: number
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] cancelReservation:", reservationId);
    return;
  }

  await runTransaction(db, async (tx) => {
    // 予約ステータスを更新
    const resRef = doc(db, "reservations", reservationId);
    tx.update(resRef, { status: "cancelled" });

    // 事前決済されていた場合、返金処理（キャンセル料を差し引き）
    if (prepaidAmount > 0) {
      const refundAmount = prepaidAmount - cancellationFee;

      if (refundAmount > 0) {
        // 市民に返金
        const userRef = doc(db, "users", userId);
        const userSnap = await tx.get(userRef);
        if (userSnap.exists()) {
          const user = userSnap.data() as User;
          tx.update(userRef, {
            balance: user.balance + refundAmount,
            updatedAt: Timestamp.now(),
          });
        }

        // 加盟店から減算
        const merchantRef = doc(db, "merchants", merchantId);
        const merchantSnap = await tx.get(merchantRef);
        if (merchantSnap.exists()) {
          const merchant = merchantSnap.data() as Merchant;
          tx.update(merchantRef, {
            salesBalance: Math.max(0, (merchant.salesBalance || 0) - refundAmount),
          });
        }

        // 返金取引を記録
        const txRef = doc(collection(db, "transactions"));
        tx.set(txRef, {
          fromUserId: "system",
          toMerchantId: "",
          amount: refundAmount,
          type: "refund",
          memo: `予約キャンセル返金（キャンセル料: ${cancellationFee}pt）`,
          createdAt: Timestamp.now(),
        });
      }
    }
  });
}

// ========== Products (商品・在庫管理) ==========

export async function getProductsByMerchant(
  merchantId: string
): Promise<Product[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "products"),
    where("shopId", "==", merchantId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

export async function getActiveProductsByMerchant(
  merchantId: string
): Promise<Product[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "products"),
    where("shopId", "==", merchantId),
    where("isActive", "==", true),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

export async function createProduct(
  data: Omit<Product, "id" | "createdAt">
): Promise<string> {
  if (USE_MOCK) {
    console.log("[Mock] createProduct:", data);
    return "mock-product-id";
  }
  const ref = await addDoc(collection(db, "products"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateProduct(
  productId: string,
  data: Partial<Pick<Product, "name" | "price" | "stock" | "description" | "category" | "isActive">>
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] updateProduct:", productId, data);
    return;
  }
  await updateDoc(doc(db, "products", productId), data);
}

export async function deleteProduct(productId: string): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] deleteProduct:", productId);
    return;
  }
  await deleteDoc(doc(db, "products", productId));
}

// ========== Marketplace (全商品取得) ==========

export async function getAllActiveProducts(): Promise<Product[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "products"),
    where("isActive", "==", true),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

export async function getProduct(productId: string): Promise<Product | null> {
  if (USE_MOCK) return null;
  const snap = await getDoc(doc(db, "products", productId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Product) : null;
}

// ========== Orders (EC注文) ==========

export async function processEcPurchase(params: {
  productId: string;
  productName: string;
  buyerId: string;
  buyerName: string;
  shopId: string;
  shopName: string;
  unitPrice: number;
  quantity: number;
  method: "pickup" | "delivery";
  deliveryAddress: string;
  memo: string;
}): Promise<string> {
  const totalAmount = params.unitPrice * params.quantity;
  if (totalAmount <= 0) throw new Error("金額は1以上を指定してください");
  if (params.quantity <= 0) throw new Error("数量は1以上を指定してください");

  if (USE_MOCK) {
    console.log("[Mock] processEcPurchase:", params);
    return "mock-order-id";
  }

  const orderId = await runTransaction(db, async (tx) => {
    // 1. 購入者の残高チェック & 減算
    const userRef = doc(db, "users", params.buyerId);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("ユーザーが見つかりません");
    const user = userSnap.data() as User;
    if (user.balance < totalAmount) throw new Error("ポイント残高が不足しています");

    // 2. 在庫チェック & 減算
    const productRef = doc(db, "products", params.productId);
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists()) throw new Error("商品が見つかりません");
    const product = productSnap.data() as Product;
    if (product.stock < params.quantity) throw new Error("在庫が不足しています");

    // 残高減算
    tx.update(userRef, {
      balance: user.balance - totalAmount,
      updatedAt: Timestamp.now(),
    });

    // 在庫減算
    tx.update(productRef, {
      stock: product.stock - params.quantity,
    });

    // 3. 加盟店の売上残高に加算（4%手数料差し引き）
    const feeRate = 0.04;
    const fee = Math.floor(totalAmount * feeRate);
    const merchantReceive = totalAmount - fee;

    const merchantRef = doc(db, "merchants", params.shopId);
    const merchantSnap = await tx.get(merchantRef);
    if (merchantSnap.exists()) {
      const merchant = merchantSnap.data() as Merchant;
      tx.update(merchantRef, {
        salesBalance: (merchant.salesBalance || 0) + merchantReceive,
      });
    }

    // 4. 取引記録を作成
    const txRef = doc(collection(db, "transactions"));
    tx.set(txRef, {
      fromUserId: params.buyerId,
      toMerchantId: params.shopId,
      amount: totalAmount,
      fee,
      merchantReceive,
      type: "payment",
      memo: `EC購入: ${params.productName} x${params.quantity}`,
      createdAt: Timestamp.now(),
    });

    // 5. 注文を作成
    const orderRef = doc(collection(db, "orders"));
    tx.set(orderRef, {
      productId: params.productId,
      productName: params.productName,
      buyerId: params.buyerId,
      buyerName: params.buyerName,
      shopId: params.shopId,
      shopName: params.shopName,
      amount: totalAmount,
      quantity: params.quantity,
      method: params.method,
      deliveryAddress: params.deliveryAddress,
      status: "pending",
      memo: params.memo,
      createdAt: Timestamp.now(),
    });

    return orderRef.id;
  });

  return orderId;
}

export async function getOrdersByBuyer(buyerId: string): Promise<Order[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "orders"),
    where("buyerId", "==", buyerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

export async function getOrdersByShop(shopId: string): Promise<Order[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "orders"),
    where("shopId", "==", shopId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] updateOrderStatus:", orderId, status);
    return;
  }
  await updateDoc(doc(db, "orders", orderId), { status });
}

export async function cancelOrder(orderId: string): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] cancelOrder:", orderId);
    return;
  }

  await runTransaction(db, async (tx) => {
    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists()) throw new Error("注文が見つかりません");
    const order = orderSnap.data() as Order;

    if (order.status !== "pending") throw new Error("この注文はキャンセルできません");

    // 1. 注文をキャンセル
    tx.update(orderRef, { status: "cancelled" });

    // 2. 購入者に返金
    const userRef = doc(db, "users", order.buyerId);
    const userSnap = await tx.get(userRef);
    if (userSnap.exists()) {
      const user = userSnap.data() as User;
      tx.update(userRef, {
        balance: user.balance + order.amount,
        updatedAt: Timestamp.now(),
      });
    }

    // 3. 加盟店の売上残高から差し引き
    const feeRate = 0.04;
    const fee = Math.floor(order.amount * feeRate);
    const merchantReceive = order.amount - fee;

    const merchantRef = doc(db, "merchants", order.shopId);
    const merchantSnap = await tx.get(merchantRef);
    if (merchantSnap.exists()) {
      const merchant = merchantSnap.data() as Merchant;
      tx.update(merchantRef, {
        salesBalance: Math.max(0, (merchant.salesBalance || 0) - merchantReceive),
      });
    }

    // 4. 在庫を戻す
    const productRef = doc(db, "products", order.productId);
    const productSnap = await tx.get(productRef);
    if (productSnap.exists()) {
      const product = productSnap.data() as Product;
      tx.update(productRef, {
        stock: product.stock + order.quantity,
      });
    }

    // 5. 返金トランザクション記録
    const txRef = doc(collection(db, "transactions"));
    tx.set(txRef, {
      fromUserId: "system",
      toMerchantId: order.shopId,
      amount: order.amount,
      type: "refund",
      memo: `EC注文キャンセル返金: ${order.productName}`,
      createdAt: Timestamp.now(),
    });
  });
}

// ========== Driver (ドライバー) ==========

export async function getDriver(userId: string): Promise<Driver | null> {
  if (USE_MOCK) return null;
  const snap = await getDoc(doc(db, "drivers", userId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Driver) : null;
}

export async function registerDriver(userId: string, displayName: string): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] registerDriver:", { userId, displayName });
    return;
  }
  await setDoc(doc(db, "drivers", userId), {
    userId,
    displayName,
    isAvailable: false,
    totalDeliveries: 0,
    totalEarnings: 0,
    rating: 0,
    ratingCount: 0,
    registeredAt: Timestamp.now(),
  });
}

export async function updateDriverAvailability(userId: string, isAvailable: boolean): Promise<void> {
  if (USE_MOCK) return;
  await updateDoc(doc(db, "drivers", userId), { isAvailable });
}

// ========== Delivery (配達) ==========

export async function createDeliveryRequest(data: {
  requesterId: string;
  requesterName: string;
  pickup: string;
  destination: string;
  description: string;
  fee: number;
  preferredTime: string;
  shopId?: string;
  orderId?: string;
}): Promise<string> {
  if (data.fee <= 0) throw new Error("配達料は1以上を指定してください");

  const platformFee = Math.floor(data.fee * 0.1);

  if (USE_MOCK) {
    console.log("[Mock] createDeliveryRequest:", data);
    return "mock-delivery-new";
  }

  // 依頼者のポイントを仮引き落とし（トランザクション）
  const deliveryId = await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", data.requesterId);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error("ユーザーが見つかりません");

    const user = userSnap.data() as User;
    if (user.balance < data.fee) throw new Error("ポイント残高が不足しています");

    // 残高を減算
    tx.update(userRef, {
      balance: user.balance - data.fee,
      updatedAt: Timestamp.now(),
    });

    // 配達依頼を作成
    const deliveryRef = doc(collection(db, "deliveries"));
    tx.set(deliveryRef, {
      requesterId: data.requesterId,
      requesterName: data.requesterName,
      driverId: "",
      driverName: "",
      shopId: data.shopId || "",
      orderId: data.orderId || "",
      pickup: data.pickup,
      destination: data.destination,
      description: data.description,
      fee: data.fee,
      platformFee,
      status: "open",
      preferredTime: data.preferredTime,
      createdAt: Timestamp.now(),
    });

    return deliveryRef.id;
  });

  return deliveryId;
}

export async function getOpenDeliveries(): Promise<Delivery[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "deliveries"),
    where("status", "==", "open"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Delivery);
}

export async function getDriverDeliveries(driverId: string): Promise<Delivery[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "deliveries"),
    where("driverId", "==", driverId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Delivery);
}

export async function getRequesterDeliveries(requesterId: string): Promise<Delivery[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "deliveries"),
    where("requesterId", "==", requesterId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Delivery);
}

export async function acceptDelivery(deliveryId: string, driverId: string, driverName: string): Promise<void> {
  if (USE_MOCK) return;
  await runTransaction(db, async (tx) => {
    const deliveryRef = doc(db, "deliveries", deliveryId);
    const deliverySnap = await tx.get(deliveryRef);
    if (!deliverySnap.exists()) throw new Error("配達依頼が見つかりません");

    const delivery = deliverySnap.data() as Delivery;
    if (delivery.status !== "open") throw new Error("この配達依頼は既に受注されています");

    tx.update(deliveryRef, {
      driverId,
      driverName,
      status: "accepted",
    });
  });
}

export async function updateDeliveryStatus(deliveryId: string, status: DeliveryStatus): Promise<void> {
  if (USE_MOCK) return;
  await updateDoc(doc(db, "deliveries", deliveryId), { status });
}

export async function completeDelivery(deliveryId: string): Promise<void> {
  if (USE_MOCK) return;

  await runTransaction(db, async (tx) => {
    const deliveryRef = doc(db, "deliveries", deliveryId);
    const deliverySnap = await tx.get(deliveryRef);
    if (!deliverySnap.exists()) throw new Error("配達依頼が見つかりません");

    const delivery = deliverySnap.data() as Delivery;
    if (delivery.status !== "picked_up") throw new Error("集荷完了後に配達完了できます");

    const driverEarnings = delivery.fee - delivery.platformFee;

    // ドライバーにポイント入金
    const driverUserRef = doc(db, "users", delivery.driverId);
    const driverUserSnap = await tx.get(driverUserRef);
    if (driverUserSnap.exists()) {
      const driverUser = driverUserSnap.data() as User;
      tx.update(driverUserRef, {
        balance: driverUser.balance + driverEarnings,
        updatedAt: Timestamp.now(),
      });
    }

    // ドライバー統計を更新
    const driverRef = doc(db, "drivers", delivery.driverId);
    const driverSnap = await tx.get(driverRef);
    if (driverSnap.exists()) {
      const driver = driverSnap.data() as Driver;
      tx.update(driverRef, {
        totalDeliveries: driver.totalDeliveries + 1,
        totalEarnings: driver.totalEarnings + driverEarnings,
      });
    }

    // 配達ステータスを更新
    tx.update(deliveryRef, { status: "delivered" });

    // トランザクション記録
    const txRef = doc(collection(db, "transactions"));
    tx.set(txRef, {
      fromUserId: delivery.requesterId,
      toMerchantId: "",
      amount: driverEarnings,
      type: "payment",
      memo: `配達報酬: ${delivery.description}`,
      createdAt: Timestamp.now(),
    });
  });
}

export async function cancelDeliveryRequest(deliveryId: string): Promise<void> {
  if (USE_MOCK) return;

  await runTransaction(db, async (tx) => {
    const deliveryRef = doc(db, "deliveries", deliveryId);
    const deliverySnap = await tx.get(deliveryRef);
    if (!deliverySnap.exists()) throw new Error("配達依頼が見つかりません");

    const delivery = deliverySnap.data() as Delivery;
    if (delivery.status !== "open") throw new Error("受注済みの配達はキャンセルできません");

    // 依頼者にポイント返金
    const userRef = doc(db, "users", delivery.requesterId);
    const userSnap = await tx.get(userRef);
    if (userSnap.exists()) {
      const user = userSnap.data() as User;
      tx.update(userRef, {
        balance: user.balance + delivery.fee,
        updatedAt: Timestamp.now(),
      });
    }

    tx.update(deliveryRef, { status: "cancelled" });
  });
}

export async function rateDriver(deliveryId: string, rating: number): Promise<void> {
  if (USE_MOCK) return;
  if (rating < 1 || rating > 5) throw new Error("評価は1〜5の範囲で指定してください");

  await runTransaction(db, async (tx) => {
    const deliveryRef = doc(db, "deliveries", deliveryId);
    const deliverySnap = await tx.get(deliveryRef);
    if (!deliverySnap.exists()) throw new Error("配達依頼が見つかりません");

    const delivery = deliverySnap.data() as Delivery;
    if (delivery.status !== "delivered") throw new Error("配達完了後に評価できます");
    if (delivery.rating) throw new Error("既に評価済みです");

    // 配達に評価を記録
    tx.update(deliveryRef, { rating });

    // ドライバーの平均評価を更新
    const driverRef = doc(db, "drivers", delivery.driverId);
    const driverSnap = await tx.get(driverRef);
    if (driverSnap.exists()) {
      const driver = driverSnap.data() as Driver;
      const newCount = driver.ratingCount + 1;
      const newRating = ((driver.rating * driver.ratingCount) + rating) / newCount;
      tx.update(driverRef, {
        rating: Math.round(newRating * 10) / 10,
        ratingCount: newCount,
      });
    }
  });
}

// ========== KYC (本人確認) ==========

export async function getKycRecord(merchantId: string): Promise<KycRecord | null> {
  if (USE_MOCK) {
    return null;
  }
  const snap = await getDoc(doc(db, "kycRecords", merchantId));
  return snap.exists() ? (snap.data() as KycRecord) : null;
}

export async function submitKycRecord(
  merchantId: string,
  data: { fullName: string; address: string; dateOfBirth: string; expiryDate: string }
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] submitKycRecord:", merchantId, data);
    return;
  }
  await setDoc(doc(db, "kycRecords", merchantId), {
    merchantId,
    status: "pending",
    fullName: data.fullName,
    address: data.address,
    dateOfBirth: data.dateOfBirth,
    expiryDate: data.expiryDate,
    submittedAt: Timestamp.now(),
  });
}

export async function getPendingKycRecords(): Promise<{ id: string; data: KycRecord }[]> {
  if (USE_MOCK) return [];
  const q = query(
    collection(db, "kycRecords"),
    where("status", "==", "pending"),
    orderBy("submittedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as KycRecord }));
}

export async function approveKyc(merchantId: string, adminId: string): Promise<void> {
  if (USE_MOCK) return;
  await updateDoc(doc(db, "kycRecords", merchantId), {
    status: "verified",
    verifiedAt: Timestamp.now(),
    verifiedBy: adminId,
  });
}

export async function rejectKyc(merchantId: string, reason: string): Promise<void> {
  if (USE_MOCK) return;
  await updateDoc(doc(db, "kycRecords", merchantId), {
    status: "rejected",
    rejectionReason: reason,
  });
}

// ========== Invoice (BtoB請求書) ==========

export async function createInvoice(data: Omit<Invoice, "id" | "createdAt">): Promise<string> {
  if (USE_MOCK) {
    console.log("[Mock] createInvoice:", data);
    return "mock-invoice-id";
  }
  const ref = await addDoc(collection(db, "invoices"), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getInvoicesByShop(
  shopId: string,
  direction: "sent" | "received"
): Promise<Invoice[]> {
  if (USE_MOCK) return [];
  const field = direction === "sent" ? "fromShopId" : "toShopId";
  const q = query(
    collection(db, "invoices"),
    where(field, "==", shopId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice));
}

export async function getAllInvoices(): Promise<Invoice[]> {
  if (USE_MOCK) return [];
  const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice));
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus
): Promise<void> {
  if (USE_MOCK) return;
  const updates: Record<string, unknown> = { status };
  if (status === "paid") {
    updates.paidAt = Timestamp.now();
  }
  await updateDoc(doc(db, "invoices", invoiceId), updates);
}

/**
 * 月間BtoB取引額を取得（手数料率判定用）
 */
export async function getMonthlyB2BVolume(
  fromShopId: string,
  toShopId: string
): Promise<number> {
  if (USE_MOCK) return 0;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const q = query(
    collection(db, "invoices"),
    where("fromShopId", "==", fromShopId),
    where("toShopId", "==", toShopId),
    where("status", "==", "paid")
  );
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => {
      const data = d.data();
      const paidAt = data.paidAt?.toDate?.();
      return paidAt && paidAt >= startOfMonth;
    })
    .reduce((sum, d) => sum + (d.data().totalAmount || 0), 0);
}

/**
 * BtoB請求書の支払い処理（トランザクション）
 * 請求先の売上残高から引き落とし → 請求元の売上残高に加算（手数料差引）
 */
export async function payInvoice(invoiceId: string): Promise<void> {
  if (USE_MOCK) return;
  await runTransaction(db, async (transaction) => {
    const invoiceRef = doc(db, "invoices", invoiceId);
    const invoiceSnap = await transaction.get(invoiceRef);
    if (!invoiceSnap.exists()) throw new Error("請求書が見つかりません");

    const invoice = invoiceSnap.data() as Invoice;
    if (invoice.status !== "sent") throw new Error("この請求書は支払い対象ではありません");

    const fromShopRef = doc(db, "merchants", invoice.fromShopId);
    const toShopRef = doc(db, "merchants", invoice.toShopId);

    const fromShopSnap = await transaction.get(fromShopRef);
    const toShopSnap = await transaction.get(toShopRef);

    if (!fromShopSnap.exists()) throw new Error("請求元の加盟店が見つかりません");
    if (!toShopSnap.exists()) throw new Error("請求先の加盟店が見つかりません");

    const toShopBalance = (toShopSnap.data() as Merchant).salesBalance || 0;
    if (toShopBalance < invoice.totalAmount) {
      throw new Error("売上残高が不足しています");
    }

    const netAmount = invoice.totalAmount - invoice.fee;

    // 請求先から引き落とし
    transaction.update(toShopRef, {
      salesBalance: increment(-invoice.totalAmount),
    });

    // 請求元に加算（手数料差引）
    transaction.update(fromShopRef, {
      salesBalance: increment(netAmount),
    });

    // 請求書ステータス更新
    transaction.update(invoiceRef, {
      status: "paid",
      paidAt: Timestamp.now(),
    });
  });
}

// ========== CSV Export (売上データ) ==========

export async function getTransactionsByMerchantDateRange(
  merchantId: string,
  startDate: Date,
  endDate: Date
): Promise<Transaction[]> {
  if (USE_MOCK) {
    return MOCK_TRANSACTIONS.filter((tx) => tx.toMerchantId === merchantId);
  }
  const q = query(
    collection(db, "transactions"),
    where("toMerchantId", "==", merchantId),
    where("createdAt", ">=", Timestamp.fromDate(startDate)),
    where("createdAt", "<=", Timestamp.fromDate(endDate)),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Transaction);
}

// ========== User Update ==========

export async function updateUser(
  userId: string,
  data: Partial<User>
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] updateUser:", userId, data);
    return;
  }
  await updateDoc(doc(db, "users", userId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ========== Birthday Coupon Settings ==========

export async function getBirthdayCouponSettings(): Promise<BirthdayCouponSettings | null> {
  if (USE_MOCK) {
    return {
      isEnabled: true,
      discountType: "fixed",
      discountValue: 500,
      validDays: 7,
      updatedAt: Timestamp.now(),
    };
  }
  const snap = await getDoc(doc(db, "settings", "birthdayCoupon"));
  return snap.exists() ? (snap.data() as BirthdayCouponSettings) : null;
}

export async function saveBirthdayCouponSettings(
  data: Omit<BirthdayCouponSettings, "updatedAt">
): Promise<void> {
  if (USE_MOCK) {
    console.log("[Mock] saveBirthdayCouponSettings:", data);
    return;
  }
  await setDoc(doc(db, "settings", "birthdayCoupon"), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}
