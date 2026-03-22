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
} from "firebase/firestore";
import { db } from "./firebase";
import type { User, Merchant, Transaction } from "@/types";

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

    tx.update(userRef, {
      balance: user.balance - amount,
      updatedAt: Timestamp.now(),
    });

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
