import { Timestamp } from "firebase/firestore";

export type UserRole = "citizen" | "merchant" | "admin";

export interface User {
  displayName: string;
  pictureUrl?: string;
  balance: number;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Merchant {
  name: string;
  ownerUserId: string;
  address: string;
  category: string;
  qrCodeId: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export type TransactionType = "payment" | "grant" | "refund";

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
