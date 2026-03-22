"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Ticket, MessageCircle, Users, UserCog } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getMerchantByOwner } from "@/lib/firestore";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const navItems = [
  { href: "/merchant", label: "ホーム", icon: LayoutDashboard },
  { href: "/merchant/coupons", label: "クーポン", icon: Ticket },
  { href: "/merchant/messages", label: "メッセージ", icon: MessageCircle },
  { href: "/merchant/customers", label: "顧客", icon: Users },
  { href: "/merchant/profile", label: "プロフィール", icon: UserCog },
];

export default function MerchantNavigation() {
  const pathname = usePathname();
  const { liffUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async (merchantId: string) => {
    try {
      const q = query(
        collection(db, "messageThreads"),
        where("merchantId", "==", merchantId)
      );
      const snap = await getDocs(q);
      let total = 0;
      snap.docs.forEach((doc) => {
        const data = doc.data();
        total += data.unreadByMerchant || 0;
      });
      setUnreadCount(total);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!liffUser || liffUser.userId === "guest") return;

    let unsub = () => {};
    let interval: ReturnType<typeof setInterval>;

    getMerchantByOwner(liffUser.userId).then((m) => {
      if (!m) return;
      const merchantId = m.id;

      // 即座に1回取得
      fetchUnread(merchantId);

      // リアルタイムリスナー
      const q = query(
        collection(db, "messageThreads"),
        where("merchantId", "==", merchantId)
      );
      unsub = onSnapshot(q, (snap) => {
        let total = 0;
        snap.docs.forEach((doc) => {
          const data = doc.data();
          total += data.unreadByMerchant || 0;
        });
        setUnreadCount(total);
      }, () => {});

      // 30秒ごとにポーリング
      interval = setInterval(() => fetchUnread(merchantId), 30000);
    });

    return () => {
      unsub();
      if (interval) clearInterval(interval);
    };
  }, [liffUser, fetchUnread]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/merchant"
              ? pathname === "/merchant"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const badge = item.href === "/merchant/messages" ? unreadCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-2 text-xs transition-colors relative ${
                isActive
                  ? "text-blue-600 font-bold"
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
