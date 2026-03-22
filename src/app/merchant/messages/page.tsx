"use client";

import { useEffect, useState, useRef } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getMerchantByOwner,
  getMerchantThreads,
  getThreadMessages,
  sendMessage,
  markThreadRead,
} from "@/lib/firestore";
import { formatDate } from "@/lib/utils";
import type { Merchant, MessageThread, Message } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Send,
  MessageCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import MerchantNavigation from "@/components/MerchantNavigation";

function MessagesContent() {
  const { liffUser, loading } = useAuth();
  const [merchant, setMerchant] = useState<{
    id: string;
    data: Merchant;
  } | null>(null);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [fetching, setFetching] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!liffUser) return;
    getMerchantByOwner(liffUser.userId)
      .then(async (m) => {
        setMerchant(m);
        if (m) {
          const t = await getMerchantThreads(m.id);
          setThreads(t);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [liffUser]);

  const openThread = async (thread: MessageThread) => {
    if (!merchant) return;
    setSelectedThread(thread);
    const msgs = await getThreadMessages(merchant.id, thread.userId);
    setMessages(msgs);
    // 既読にする
    await markThreadRead(merchant.id, thread.userId, "merchant");
    // スレッドの未読を更新
    setThreads((prev) =>
      prev.map((t) =>
        t.id === thread.id ? { ...t, unreadByMerchant: 0 } : t
      )
    );
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  const handleSend = async () => {
    if (!merchant || !selectedThread || !newMessage.trim()) return;
    setSending(true);
    try {
      await sendMessage({
        merchantId: merchant.id,
        merchantName: merchant.data.name,
        userId: selectedThread.userId,
        userName: selectedThread.userName,
        senderType: "merchant",
        senderId: merchant.id,
        text: newMessage.trim(),
      });
      setNewMessage("");
      // メッセージを再取得
      const msgs = await getThreadMessages(merchant.id, selectedThread.userId);
      setMessages(msgs);
      // スレッドリストも更新
      const t = await getMerchantThreads(merchant.id);
      setThreads(t);
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
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

  // チャット画面
  if (selectedThread) {
    return (
      <div className="max-w-md mx-auto flex flex-col h-screen">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSelectedThread(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="font-bold text-gray-800">
              {selectedThread.userName}
            </p>
            <p className="text-xs text-gray-400">
              {merchant.data.name}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 text-sm mt-8">
              メッセージはまだありません
              <br />
              最初のメッセージを送りましょう
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.senderType === "merchant" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    msg.senderType === "merchant"
                      ? "bg-blue-500 text-white rounded-tr-sm"
                      : "bg-white text-gray-800 shadow-sm rounded-tl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.senderType === "merchant"
                        ? "text-blue-200"
                        : "text-gray-400"
                    }`}
                  >
                    {msg.createdAt ? formatDate(msg.createdAt) : ""}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t px-4 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="メッセージを入力..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="bg-blue-500 text-white p-2.5 rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // スレッド一覧
  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">メッセージ</h1>

      {threads.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <MessageCircle className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">メッセージはまだありません</p>
          <p className="text-xs text-gray-400 mt-2">
            お客様からメッセージが届くとここに表示されます
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => openThread(thread)}
              className="w-full bg-white rounded-xl px-4 py-3 shadow-sm text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Users size={18} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-800 truncate">
                    {thread.userName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {thread.lastMessageAt
                      ? formatDate(thread.lastMessageAt)
                      : ""}
                  </p>
                </div>
                <p className="text-sm text-gray-500 truncate mt-0.5">
                  {thread.lastMessage}
                </p>
              </div>
              {(thread.unreadByMerchant || 0) > 0 && (
                <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {thread.unreadByMerchant}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <MerchantNavigation />
    </div>
  );
}

export default function MerchantMessagesPage() {
  return (
    <AuthProvider>
      <MessagesContent />
    </AuthProvider>
  );
}
