import { Timestamp } from "firebase/firestore";

export type UserRole = "citizen" | "merchant" | "admin";

export interface User {
  displayName: string;
  pictureUrl?: string;
  balance: number;
  localBalance?: Record<string, number>; // エリア別限定ポイント { "honjo": 1000, "kumagaya": 500 }
  role: UserRole;
  areaId?: string; // ユーザーの所属エリア
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
  areaId?: string; // 加盟店の所属エリア（例: "honjo"）
  areaName?: string; // エリア表示名（例: "本庄市"）
  referrerId?: string | null;
  referrerRewarded?: boolean;
  // ホームページ機能用フィールド
  description?: string; // 店舗紹介文
  businessHours?: { open: string; close: string };
  closedDays?: string[]; // ["月", "火"] 等
  snsLinks?: { instagram?: string; x?: string };
  announcements?: { text: string; createdAt: Timestamp }[];
  createdAt: Timestamp;
}

// ========== Area (エリア) ==========

export interface Area {
  id?: string;       // "honjo", "kumagaya" など
  name: string;      // "本庄市", "熊谷市"
  payName: string;   // "はにぽんありがとうPay", "くまがやありがとうPay"
  color?: string;    // ブランドカラー
  isActive: boolean;
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

// ========== Charge Request (銀行振込チャージ) ==========

export type ChargeRequestStatus = "pending" | "approved" | "rejected";

export interface ChargeRequest {
  id?: string;
  userId: string;
  userName: string;
  amount: number;
  status: ChargeRequestStatus;
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
}

// ========== KYC (本人確認) ==========

export type KycStatus = "unverified" | "pending" | "verified" | "rejected";

export interface KycRecord {
  merchantId: string;
  status: KycStatus;
  fullName: string;
  address: string;
  dateOfBirth: string;
  expiryDate: string;
  submittedAt?: Timestamp;
  verifiedAt?: Timestamp;
  rejectionReason?: string;
  verifiedBy?: string; // "auto" or 管理者ID
}

export type TransactionType = "payment" | "grant" | "refund" | "referral_reward" | "cash_charge" | "card_charge" | "card_balance_transfer";

export interface Transaction {
  id?: string;
  fromUserId: string;
  toMerchantId: string;
  amount: number;
  type: TransactionType;
  memo: string;
  pointType?: "common" | "local"; // 共通ポイント or 地域限定ポイント
  areaId?: string; // 地域限定の場合のエリアID
  createdAt: Timestamp;
}

export interface PointGrant {
  id?: string;
  toUserId: string;
  amount: number;
  reason: string;
  grantedBy: string;
  pointType?: "common" | "local"; // 共通 or 地域限定
  areaId?: string; // 地域限定の場合のエリアID
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

// ========== Message ==========

export interface Message {
  id?: string;
  threadId: string; // merchantId_userId の組み合わせ
  merchantId: string;
  merchantName: string;
  userId: string;
  userName: string;
  senderType: "merchant" | "citizen";
  senderId: string;
  text: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface MessageThread {
  id?: string; // merchantId_userId
  merchantId: string;
  merchantName: string;
  userId: string;
  userName: string;
  userPictureUrl?: string;
  lastMessage: string;
  lastMessageAt: Timestamp;
  unreadByMerchant: number;
  unreadByCitizen: number;
  visitCount?: number;
  totalSpent?: number;
}

// ========== Customer Note ==========

export interface CustomerNote {
  id?: string;
  merchantId: string;
  userId: string;
  text: string;
  createdAt: Timestamp;
}

// ========== Shop Customer ==========

// ========== Card (紙カード) ==========

export interface Card {
  id?: string;
  cardNumber: string;    // HANIPON-00001 形式
  citizenId: string;     // 紐付けた市民のuserId（未紐付けは""）
  balance: number;       // カード残高
  isActive: boolean;     // 有効/無効
  createdAt: Timestamp;
  linkedAt?: Timestamp;  // 紐付け日時
}

// ========== Product (商品・在庫管理) ==========

export type ProductCategory = "食品" | "日用品" | "服飾" | "その他";

export interface Product {
  id?: string;
  shopId: string;
  shopName: string;
  name: string;
  price: number;
  stock: number;
  description: string;
  category: ProductCategory;
  isActive: boolean;
  createdAt: Timestamp;
}

// ========== Stamp Card ==========

export type StampRewardType = "point" | "coupon";

export interface StampCard {
  id?: string;
  merchantId: string;
  merchantName: string;
  requiredStamps: number;
  rewardType: StampRewardType;
  rewardValue: number;
  rewardDescription: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface UserStamp {
  id?: string; // `${merchantId}_${userId}`
  userId: string;
  merchantId: string;
  stampCardId: string;
  currentStamps: number;
  completedCount: number;
  lastStampAt: Timestamp;
  createdAt: Timestamp;
}

// ========== Reservation ==========

export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface ReservationSettings {
  isEnabled: boolean;
  slotDuration: number; // 分: 30, 60, 90, 120
  maxReservationsPerSlot: number;
  businessHours: { open: string; close: string };
  closedDays: string[]; // ["月", "火"] etc
  cancellationFee: number; // キャンセル料（ポイント）
  prepaymentRequired: boolean;
  prepaymentAmount: number;
  updatedAt: Timestamp;
}

export interface Reservation {
  id?: string;
  merchantId: string;
  merchantName: string;
  userId: string;
  userName: string;
  date: string; // "2026-03-25"
  time: string; // "14:00"
  status: ReservationStatus;
  prepaid: boolean;
  prepaidAmount: number;
  cancellationFee: number;
  memo: string;
  createdAt: Timestamp;
}

// ========== Order (EC注文) ==========

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "delivered" | "cancelled";
export type OrderMethod = "pickup" | "delivery";

export interface Order {
  id?: string;
  productId: string;
  productName: string;
  buyerId: string;
  buyerName: string;
  shopId: string;
  shopName: string;
  amount: number;
  quantity: number;
  method: OrderMethod;
  deliveryAddress: string;
  status: OrderStatus;
  memo: string;
  createdAt: Timestamp;
}

// ========== Shop Customer ==========

// ========== Delivery (配達マッチング) ==========

export type DeliveryStatus = "open" | "accepted" | "picked_up" | "delivered" | "cancelled";

export interface Delivery {
  id?: string;
  requesterId: string;
  requesterName: string;
  driverId: string;
  driverName: string;
  shopId: string;
  orderId: string;
  pickup: string;
  destination: string;
  description: string;
  fee: number;
  platformFee: number;
  status: DeliveryStatus;
  preferredTime: string;
  rating?: number;
  createdAt: Timestamp;
}

export interface Driver {
  id?: string;
  userId: string;
  displayName: string;
  isAvailable: boolean;
  totalDeliveries: number;
  totalEarnings: number;
  rating: number;
  ratingCount: number;
  registeredAt: Timestamp;
}

// ========== Shop Customer ==========

export interface ShopCustomer {
  id?: string;
  merchantId: string;
  userId: string;
  displayName: string;
  pictureUrl?: string;
  firstVisit: Timestamp;
  lastVisit: Timestamp;
  visitCount: number;
  totalSpent: number;
}

// ========== Invoice (BtoB請求書) ==========

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface InvoiceItem {
  name: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id?: string;
  fromShopId: string;
  fromShopName: string;
  toShopId: string;
  toShopName: string;
  items: InvoiceItem[];
  totalAmount: number;
  fee: number;
  feeRate: number;
  dueDate: string; // "2026-04-15"
  status: InvoiceStatus;
  paidAt?: Timestamp;
  createdAt: Timestamp;
}
