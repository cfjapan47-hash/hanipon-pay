"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, QrCode, Ticket, MessageCircle, Users } from "lucide-react";

const navItems = [
  { href: "/merchant", label: "ホーム", icon: LayoutDashboard },
  { href: "/merchant/coupons", label: "クーポン", icon: Ticket },
  { href: "/merchant/messages", label: "メッセージ", icon: MessageCircle },
  { href: "/merchant/customers", label: "顧客", icon: Users },
];

export default function MerchantNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/merchant"
              ? pathname === "/merchant"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-2 text-xs transition-colors ${
                isActive
                  ? "text-blue-600 font-bold"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
