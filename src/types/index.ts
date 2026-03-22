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
  referrerId?: string;
  referrerRewarded?: boolean;
  createdAt: Timestamp;
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
