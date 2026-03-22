import { Timestamp } from "firebase/firestore";

export type UserRole = "citizen" | "merchant" | "admin";

export interface User {
  displayName: string;
  pictureUrl?: string;
  balance: number;
  role: UserRole;
  referralCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type MerchantStatus = "pending" | "active" | "suspended";

export interface Merchant {
  name: string;
  ownerUserId: string;
  address: string;
  category: string;
  phone?: string;
  qrCodeId: string;
  isActive: boolean;
  status?: MerchantStatus;
  salesBalance?: number;
  bankAccount?: string;
  bankName?: string;
  referrerId?: string;
  referrerRewarded?: boolean;
  createdAt: Timestamp;
}

export type WithdrawalStatus = "pending" | "completed" | "rejected";

export interface WithdrawalRequest {
  id?: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  bankAccount: string;
  bankName: string;
  status: WithdrawalStatus;
  createdAt: Timestamp;
  processedAt?: Timestamp;
}

export type TransactionType = "payment" | "grant" | "refund" | "referral_reward";

export interface Transaction {
  id?: string;
  fromUserId: string;
  toMerchantId: string;
  amount: number;
  type: TransactionType;
  memo: string;
  createdAt: Timestamp;
}

export interface PointGrant {
  id?: string;
  toUserId: string;
  amount: number;
  reason: string;
  grantedBy: string;
  createdAt: Timestamp;
}

export interface Referral {
  id?: string;
  referrerId: string;
  merchantId: string;
  merchantName: string;
  reward: number;
  rewarded: boolean;
  createdAt: Timestamp;
}

// ========== Coupon ==========

export type CouponType = "percent" | "fixed" | "cashback";
export type CouponStatus = "active" | "expired" | "disabled";

export interface Coupon {
  id?: string;
  merchantId: string;
  merchantName: string;
  title: string;
  description?: string;
  type: CouponType;
  value: number; // percent: 割引率(1-100), fixed: 値引き額, cashback: 還元率(1-100)
  minAmount?: number; // 最低利用額
  maxUses: number; // 発行枚数上限
  usedCount: number; // 使用済み枚数
  startAt: Timestamp;
  endAt: Timestamp;
  status: CouponStatus;
  createdAt: Timestamp;
}

export interface CouponUse {
  id?: string;
  couponId: string;
  userId: string;
  merchantId: string;
  discount: number; // 実際の割引額
  createdAt: Timestamp;
}
