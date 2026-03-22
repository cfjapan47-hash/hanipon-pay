"use client";

import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  getMerchantCustomers,
  sendMessage,
  addCustomerNote,
  getCustomerNotes,
} from "@/lib/firestore";
import { formatPoints, formatDate } from "@/lib/utils";
import type { Merchant, ShopCustomer, CustomerNote } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Users,
  MessageCircle,
  Send,
  X,
  StickyNote,
  Plus,
} from "lucide-react";
import Link from "next/link";
import MerchantNavigation from "@/components/MerchantNavigation";

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

  // メモ関連
  const [noteTarget, setNoteTarget] = useState<ShopCustomer | null>(null);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

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

  const handleOpenNotes = async (customer: ShopCustomer) => {
    if (!merchant) return;
    setNoteTarget(customer);
    setNotesLoading(true);
    try {
      const fetched = await getCustomerNotes(merchant.id, customer.userId);
      setNotes(fetched);
    } catch (e) {
      console.error(e);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!merchant || !noteTarget || !noteText.trim()) return;
    setNoteSaving(true);
    try {
      await addCustomerNote(merchant.id, noteTarget.userId, noteText.trim());
      const fetched = await getCustomerNotes(merchant.id, noteTarget.userId);
      setNotes(fetched);
      setNoteText("");
    } catch (e) {
      console.error(e);
    } finally {
      setNoteSaving(false);
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
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">顧客リスト</h1>

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

      {/* 顧客メモモーダル */}
      {noteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <StickyNote size={18} className="text-orange-500" />
                {noteTarget.displayName} さんのメモ
              </h3>
              <button
                onClick={() => {
                  setNoteTarget(null);
                  setNoteText("");
                  setNotes([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* メモ入力 */}
            <div className="px-5 py-3 border-b bg-gray-50">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="メモを入力..."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={noteSaving || !noteText.trim()}
                className="mt-2 w-full bg-orange-500 text-white rounded-xl px-4 py-2.5 font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {noteSaving ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Plus size={16} />
                )}
                {noteSaving ? "保存中..." : "メモを追加"}
              </button>
            </div>

            {/* メモ履歴 */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {notesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-orange-500" size={24} />
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8">
                  <StickyNote className="mx-auto text-gray-300 mb-2" size={32} />
                  <p className="text-sm text-gray-400">メモはまだありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-gray-50 rounded-xl px-4 py-3"
                    >
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {note.text}
                      </p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {note.createdAt ? formatDate(note.createdAt) : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
              className="bg-white rounded-xl px-4 py-3 shadow-sm cursor-pointer hover:bg-orange-50 transition-colors"
              onClick={() => handleOpenNotes(customer)}
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMessageTarget(customer);
                    }}
                    className="text-purple-500 hover:text-purple-700 p-2"
                    title="メッセージを送る"
                  >
                    <MessageCircle size={20} />
                  </button>
                  <StickyNote size={16} className="text-gray-300" />
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2 pl-13">
                最終来店: {customer.lastVisit ? formatDate(customer.lastVisit) : "-"}
              </div>
            </div>
          ))}
        </div>
      )}
      <MerchantNavigation />
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
