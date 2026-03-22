"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, QrCode, Store, MessageCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const navItems = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/pay", label: "支払う", icon: QrCode },
  { href: "/shops", label: "お店", icon: Store },
  { href: "/messages", label: "メッセージ", icon: MessageCircle },
  { href: "/history", label: "履歴", icon: Clock },
];

export default function Navigation() {
  const pathname = usePathname();
  const { liffUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async (userId: string) => {
    try {
      const q = query(
        collection(db, "messageThreads"),
        where("userId", "==", userId)
      );
      const snap = await getDocs(q);
      let total = 0;
      snap.docs.forEach((doc) => {
        const data = doc.data();
        total += data.unreadByCitizen || 0;
      });
      setUnreadCount(total);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!liffUser || liffUser.userId === "guest") return;
    const userId = liffUser.userId;

    // 即座に1回取得
    fetchUnread(userId);

    // リアルタイムリスナーも設定
    const q = query(
      collection(db, "messageThreads"),
      where("userId", "==", userId)
    );
    const unsub = onSnapshot(q, (snap) => {
      let total = 0;
      snap.docs.forEach((doc) => {
        const data = doc.data();
        total += data.unreadByCitizen || 0;
      });
      setUnreadCount(total);
    }, () => {
      // エラー時は無視
    });

    // 30秒ごとにポーリングも追加（フォールバック）
    const interval = setInterval(() => fetchUnread(userId), 30000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [liffUser, fetchUnread]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const badge = item.href === "/messages" ? unreadCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-2 text-xs transition-colors relative ${
                isActive
                  ? "text-orange-600 font-bold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
