"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, QrCode, Store, MessageCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { onCitizenThreads } from "@/lib/firestore";
import type { MessageThread } from "@/types";

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

  useEffect(() => {
    if (!liffUser || liffUser.userId === "guest") return;
    const unsub = onCitizenThreads(liffUser.userId, (threads: MessageThread[]) => {
      const total = threads.reduce((sum, t) => sum + (t.unreadByCitizen || 0), 0);
      setUnreadCount(total);
    });
    return () => unsub();
  }, [liffUser]);

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
