"use client";

import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatThreadSummary {
  id: string;
  buyerId: string;
  sellerShop: {
    name: string;
  };
  buyer: {
    displayName: string;
  };
  product: {
    title: string;
  };
  messages: Array<{
    body: string;
    createdAt: string | Date;
    sender: {
      displayName: string;
    };
  }>;
  _count: {
    messages: number;
  };
}

interface ChatMessageItem {
  id: string;
  body: string;
  createdAt: string | Date;
  senderId: string;
  sender: {
    displayName: string;
    role: string;
  };
}

interface ChatPanelProps {
  currentUserId: string;
  initialThreads: ChatThreadSummary[];
}

const formatTime = (value: string | Date) =>
  new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

const ChatPanel = ({ currentUserId, initialThreads }: ChatPanelProps) => {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState(initialThreads[0]?.id ?? "");
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [body, setBody] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedThreadId) {
        setMessages([]);
        return;
      }

      const response = await fetch(`/api/chat/messages?threadId=${selectedThreadId}`, { cache: "no-store" });
      const result = (await response.json()) as { ok: boolean; messages?: ChatMessageItem[] };

      if (response.ok && result.ok && result.messages) {
        setMessages(result.messages);
      }
    };

    void loadMessages();
  }, [selectedThreadId]);

  useEffect(() => {
    if (typeof window === "undefined" || !("EventSource" in window)) {
      return;
    }

    const eventSource = new EventSource("/api/notifications/stream");
    eventSource.addEventListener("notification", () => {
      if (selectedThreadId) {
        void fetch(`/api/chat/messages?threadId=${selectedThreadId}`, { cache: "no-store" })
          .then((response) => response.json())
          .then((result: { ok: boolean; messages?: ChatMessageItem[] }) => {
            if (result.ok && result.messages) {
              setMessages(result.messages);
            }
          });
      }
    });

    return () => {
      eventSource.close();
    };
  }, [selectedThreadId]);

  const sendMessage = async () => {
    if (!selectedThreadId || body.trim().length === 0) {
      return;
    }

    setStatusMessage("");
    const response = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: selectedThreadId, body }),
    });
    const result = (await response.json()) as { ok: boolean; message?: ChatMessageItem; error?: { message: string } };

    if (!response.ok || !result.ok || !result.message) {
      setStatusMessage(result.error?.message ?? "ส่งข้อความไม่สำเร็จ");
      return;
    }

    setMessages((current) => [...current, result.message as ChatMessageItem]);
    setThreads((current) =>
      current.map((thread) =>
        thread.id === selectedThreadId
          ? {
              ...thread,
              messages: [
                {
                  body,
                  createdAt: result.message?.createdAt ?? new Date().toISOString(),
                  sender: { displayName: result.message?.sender.displayName ?? "" },
                },
              ],
            }
          : thread,
      ),
    );
    setBody("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>ห้องสนทนา</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {threads.length === 0 ? (
            <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
              แชทจะเปิดหลังผู้ชนะประมูลหรือผู้ซื้อชำระเงินแล้ว
            </div>
          ) : (
            threads.map((thread) => {
              const latestMessage = thread.messages[0];

              return (
                <button
                  key={thread.id}
                  type="button"
                  className={cn(
                    "rounded-md border bg-background p-3 text-left transition hover:bg-muted",
                    selectedThreadId === thread.id && "border-primary bg-primary/5",
                  )}
                  onClick={() => setSelectedThreadId(thread.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong>{thread.sellerShop.name}</strong>
                    {thread._count.messages > 0 ? <Badge>{thread._count.messages} ใหม่</Badge> : null}
                  </div>
                  <span className="mt-1 block text-xs text-muted-foreground">{thread.product.title}</span>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {latestMessage ? latestMessage.body : "ยังไม่มีข้อความ"}
                  </p>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{selectedThread ? selectedThread.product.title : "เลือกห้องแชท"}</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-[420px] flex-col gap-4">
          <div className="flex flex-1 flex-col gap-3 rounded-md bg-muted p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">ยังไม่มีข้อความในห้องนี้</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[80%] rounded-md bg-background p-3 text-sm",
                    message.senderId === currentUserId && "ml-auto bg-primary text-primary-foreground",
                  )}
                >
                  <p>{message.body}</p>
                  <span className="mt-1 block text-[11px] opacity-70">
                    {message.sender.displayName} · {formatTime(message.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="พิมพ์ข้อความ..."
              disabled={!selectedThreadId}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void sendMessage();
                }
              }}
            />
            <Button type="button" disabled={!selectedThreadId || body.trim().length === 0} onClick={sendMessage}>
              <Send data-icon="inline-start" />
              ส่ง
            </Button>
          </div>
          {statusMessage ? <p className="text-xs text-muted-foreground">{statusMessage}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
};

export { ChatPanel };
