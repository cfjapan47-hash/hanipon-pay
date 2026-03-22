import { Timestamp } from "firebase/firestore";

export function formatPoints(amount: number): string {
  return amount.toLocaleString("ja-JP");
}

export function formatDate(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateQrCodeId(): string {
  return `hp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
