"use client";

import { useEffect, useState, useRef } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import {
  getCitizenThreads,
  sendMessage,
  markThreadRead,
  onThreadMessages,
  onCitizenThreads,
} from "@/lib/firestore";
import { formatDate } from "@/lib/utils";
import type { MessageThread, Message } from "@/types";
import {
  Loader2,
  ArrowLeft,
  Send,
  MessageCircle,
  Store,
} from "lucide-react";
import Navigation from "@/components/Navigation";

function CitizenMessagesContent() {
  const { liffUser, user, loading } = useAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(
    null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [fetching, setFetching] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // スレッド一覧をリアルタイム監視
  useEffect(() => {
    if (!liffUser) return;
    const unsub = onCitizenThreads(liffUser.userId, (t) => {
      setThreads(t);
      setFetching(false);
    });
    return () => unsub();
  }, [liffUser]);

  // 選択中スレッドのメッセージをリアルタイム監視
  useEffect(() => {
    if (!liffUser || !selectedThread) return;
    const unsub = onThreadMessages(
      selectedThread.merchantId,
      liffUser.userId,
      (msgs) => {
        setMessages(msgs);
        setTimeout(
          () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );
      }
    );
    markThreadRead(selectedThread.merchantId, liffUser.userId, "citizen");
    return () => unsub();
  }, [liffUser, selectedThread]);

  const openThread = async (thread: MessageThread) => {
    if (!liffUser) return;
    setSelectedThread(thread);
    await markThreadRead(thread.merchantId, liffUser.userId, "citizen");
    setThreads((prev) =>
      prev.map((t) =>
        t.id === thread.id ? { ...t, unreadByCitizen: 0 } : t
      )
    );
  };

  const handleSend = async () => {
    if (!liffUser || !user || !selectedThread || !newMessage.trim()) return;
    setSending(true);
    try {
      await sendMessage({
        merchantId: selectedThread.merchantId,
        merchantName: selectedThread.merchantName,
        userId: liffUser.userId,
        userName: user.displayName,
        senderType: "citizen",
        senderId: liffUser.userId,
        text: newMessage.trim(),
      });
      setNewMessage("");
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

  // チャット画面
  if (selectedThread) {
    return (
      <div className="max-w-md mx-auto flex flex-col h-screen">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSelectedThread(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Store size={14} className="text-blue-500" />
          </div>
          <p className="font-bold text-gray-800">
            {selectedThread.merchantName}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 space-y-3">
          {messages.length === 0 ? (
            <p className="text-center text-gray-400 text-sm mt-8">
              メッセージはまだありません
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.senderType === "citizen" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    msg.senderType === "citizen"
                      ? "bg-orange-500 text-white rounded-tr-sm"
                      : "bg-white text-gray-800 shadow-sm rounded-tl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.senderType === "citizen"
                        ? "text-orange-200"
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

        <div className="bg-white border-t px-4 py-3 mb-16">
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
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="bg-orange-500 text-white p-2.5 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>

        <Navigation />
      </div>
    );
  }

  // スレッド一覧
  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-1">メッセージ</h1>
      <p className="text-sm text-gray-500 mb-4">加盟店とのやり取り</p>

      {threads.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <MessageCircle className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">メッセージはまだありません</p>
          <p className="text-xs text-gray-400 mt-2">
            加盟店からメッセージが届くとここに表示されます
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
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Store size={18} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-800 truncate">
                    {thread.merchantName}
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
              {(thread.unreadByCitizen || 0) > 0 && (
                <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {thread.unreadByCitizen}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <Navigation />
    </div>
  );
}

export default function CitizenMessagesPage() {
  return (
    <AuthProvider>
      <CitizenMessagesContent />
    </AuthProvider>
  );
}
