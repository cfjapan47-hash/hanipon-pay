"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  getMerchantCustomers,
  sendMessage,
} from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import type { Merchant, ShopCustomer } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Users,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";

function CustomersContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [customers, setCustomers] = useState<ShopCustomer[]>([]);
  const [fetching, setFetching] = useState(true);
  const [messageTarget, setMessageTarget] = useState<ShopCustomer | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState("");

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          const c = await getMerchantCustomers(m.id);
          setCustomers(c);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const handleSendMessage = async () => {
    if (!merchant || !messageTarget || !messageText.trim()) return;
    setSending(true);
    try {
      await sendMessage({
        merchantId: merchant.id,
        merchantName: merchant.data.name,
        userId: messageTarget.userId,
        userName: messageTarget.displayName,
        senderType: "merchant",
        senderId: merchant.id,
        text: messageText.trim(),
      });
      setSentMessage(`${messageTarget.displayName}さんにメッセージを送信しました`);
      setMessageTarget(null);
      setMessageText("");
      setTimeout(() => setSentMessage(""), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6">
        <p className="text-gray-600 text-center">
          加盟店として登録されていません
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/merchant" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">顧客リスト</h1>
      </div>

      {sentMessage && (
        <div className="mb-4 p-3 rounded-xl text-sm bg-green-50 text-green-700">
          {sentMessage}
        </div>
      )}

      {/* メッセージ送信モーダル */}
      {messageTarget && (
        <div className="bg-white rounded-2xl p-5 shadow-lg mb-4 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">
              {messageTarget.displayName} さんにメッセージ
            </h3>
            <button
              onClick={() => {
                setMessageTarget(null);
                setMessageText("");
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="メッセージを入力..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !messageText.trim()}
            className="mt-2 w-full bg-purple-500 text-white rounded-xl px-4 py-2.5 font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sending ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Send size={16} />
            )}
            {sending ? "送信中..." : "送信"}
          </button>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-3">
        お客様: {customers.length}人
      </p>

      {customers.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <Users className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">お客様はまだいません</p>
          <p className="text-xs text-gray-400 mt-2">
            お支払いが発生するとお客様が自動で登録されます
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white rounded-xl px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">
                  {customer.displayName.slice(0, 1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {customer.displayName}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span>来店 {customer.visitCount}回</span>
                    <span>累計 {formatPoints(customer.totalSpent)}pt</span>
                  </div>
                </div>
                <button
                  onClick={() => setMessageTarget(customer)}
                  className="text-purple-500 hover:text-purple-700 p-2"
                  title="メッセージを送る"
                >
                  <MessageCircle size={20} />
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-2 pl-13">
                最終来店: {customer.lastVisit ? formatDate(customer.lastVisit) : "-"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MerchantCustomersPage() {
  return (
    <AuthProvider>
      <CustomersContent />
    </AuthProvider>
  );
}
