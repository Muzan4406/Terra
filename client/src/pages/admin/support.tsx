import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Headphones, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { SupportChatThread, type SupportMessageView } from "@/components/support-chat-thread";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface SupportConversation {
  userId: string;
  fullName: string;
  phone: string;
  country: string;
  lastMessage: string;
  lastSenderType: "user" | "admin" | "system";
  lastMessageAt: string | Date;
  unreadCount: number;
}

async function postAdminReply(userId: string, body: string, files: File[]) {
  const formData = new FormData();
  formData.append("message", body);
  files.forEach((file) => formData.append("attachments", file, file.name));

  const response = await fetch(`/api/admin/support/conversations/${userId}/messages`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "La réponse n’a pas pu être envoyée.");
  }
  return result;
}

function formatConversationTime(value: string | Date) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminSupportPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);
  const readThreadUserId = useRef<string | null>(null);

  const conversationsQuery = useQuery<SupportConversation[]>({
    queryKey: ["/api/admin/support/conversations"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const conversations = conversationsQuery.data || [];
  const totalUnreadCount = conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
  const selectedConversation = conversations.find((conversation) => conversation.userId === selectedUserId);
  const messageQueryKey = selectedUserId
    ? `/api/admin/support/conversations/${selectedUserId}/messages`
    : "/api/admin/support/conversations/none/messages";

  const messagesQuery = useQuery<SupportMessageView[]>({
    queryKey: [messageQueryKey],
    enabled: !!selectedUserId,
    refetchInterval: selectedUserId ? 4000 : false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!selectedUserId) {
      readThreadUserId.current = null;
      return;
    }
    if (messagesQuery.dataUpdatedAt > 0 && readThreadUserId.current !== selectedUserId) {
      readThreadUserId.current = selectedUserId;
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/conversations"] });
    }
  }, [messagesQuery.dataUpdatedAt, selectedUserId]);

  useEffect(() => {
    if (!selectedUserId && conversations.length > 0) {
      setSelectedUserId(conversations[0].userId);
    }
  }, [conversations, selectedUserId]);

  const replyMutation = useMutation({
    mutationFn: ({ userId, body, files }: { userId: string; body: string; files: File[] }) =>
      postAdminReply(userId, body, files),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [`/api/admin/support/conversations/${variables.userId}/messages`],
        }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/support/conversations"] }),
      ]);
      toast({ title: "Réponse envoyée" });
    },
    onError: (error: Error) => {
      toast({ title: "Envoi impossible", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-[100dvh] bg-[#f1f3ec]">
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col bg-[#f7f8f3]">
        <header className="flex shrink-0 items-center gap-3 border-b border-[#e0e8df] bg-white px-4 py-3.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
            aria-label="Retour à l’administration"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f1e8] text-[#245943]">
            <Headphones className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-[#1d3f31]">Messages du service client</h1>
            <p className="text-xs text-[#6b7a70]">Répondez directement aux utilisateurs</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => conversationsQuery.refetch()}
            disabled={conversationsQuery.isFetching}
            aria-label="Actualiser les conversations"
          >
            {conversationsQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </header>

        <main className="grid min-h-0 flex-1 gap-3 p-3 md:grid-cols-[19rem_minmax(0,1fr)]">
          <aside
            className={`min-h-0 flex-col overflow-hidden rounded-2xl border border-[#e1e8df] bg-white shadow-sm ${
              showThreadOnMobile ? "hidden md:flex" : "flex"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[#e8ece6] px-4 py-3">
              <h2 className="font-semibold text-[#203d31]">Conversations</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#edf3eb] px-2.5 py-1 text-xs font-bold text-[#365c43]">
                  {conversations.length}
                </span>
                <span className="rounded-full bg-[#dff1df] px-2.5 py-1 text-xs font-bold text-[#24603b]">
                  {totalUnreadCount} en attente
                </span>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {conversationsQuery.isLoading ? (
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((key) => <div key={key} className="h-16 animate-pulse rounded-xl bg-[#f0f3ed]" />)}
                </div>
              ) : conversationsQuery.isError ? (
                <div className="p-4 text-sm text-red-700">Impossible de charger la boîte de réception.</div>
              ) : conversations.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center px-5 text-center">
                  <MessageSquare className="mb-2 h-6 w-6 text-[#8a9a8e]" />
                  <p className="font-semibold text-[#405449]">Aucun message pour le moment</p>
                  <p className="mt-1 text-xs text-[#7b897f]">Les nouveaux échanges apparaîtront ici.</p>
                </div>
              ) : (
                conversations.map((conversation) => {
                  const isSelected = conversation.userId === selectedUserId;
                  const preview = conversation.lastSenderType === "system"
                    ? "Confirmation automatique envoyée"
                    : conversation.lastMessage || "Capture d’écran jointe";
                  return (
                    <button
                      key={conversation.userId}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(conversation.userId);
                        setShowThreadOnMobile(true);
                      }}
                      className={`w-full border-b border-[#edf0eb] px-4 py-3 text-left transition-colors ${
                        isSelected ? "bg-[#edf4eb]" : "hover:bg-[#f7f9f5]"
                      }`}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#243c30]">{conversation.fullName}</p>
                          <p className="mt-0.5 truncate text-xs text-[#738078]">
                            {conversation.phone} · {conversation.country}
                          </p>
                        </div>
                        <time className="shrink-0 text-[10px] text-[#849088]">
                          {formatConversationTime(conversation.lastMessageAt)}
                        </time>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-xs text-[#65746a]">{preview}</p>
                        {conversation.unreadCount > 0 && (
                          <span className="shrink-0 rounded-full bg-[#dff1df] px-2 py-0.5 text-[10px] font-bold text-[#24603b]">
                            Nouveau · {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <section className={`min-h-0 flex-col ${showThreadOnMobile ? "flex" : "hidden md:flex"}`}>
            {selectedConversation ? (
              <>
                <div className="mb-2 flex shrink-0 items-center gap-3 rounded-xl border border-[#e1e8df] bg-white px-3 py-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setShowThreadOnMobile(false)}
                    aria-label="Retour aux conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-bold text-[#203d31]">{selectedConversation.fullName}</h2>
                    <p className="truncate text-xs text-[#748078]">
                      {selectedConversation.phone} · {selectedConversation.country}
                    </p>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  {messagesQuery.isLoading ? (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-[#e1e8df] bg-white text-sm text-[#6b7a70]">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement de la conversation…
                    </div>
                  ) : messagesQuery.isError ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-5 text-center">
                      <p className="font-semibold text-red-700">Impossible de charger cette conversation</p>
                      <Button className="mt-3" variant="outline" onClick={() => messagesQuery.refetch()}>
                        Réessayer
                      </Button>
                    </div>
                  ) : (
                    <SupportChatThread
                      key={selectedConversation.userId}
                      messages={messagesQuery.data || []}
                      myRole="admin"
                      isSending={replyMutation.isPending}
                      onSend={(body, files) =>
                        replyMutation.mutateAsync({ userId: selectedConversation.userId, body, files }).then(() => undefined)
                      }
                      emptyTitle="Aucun message"
                      emptyDescription="Répondez à l’utilisateur pour démarrer la conversation."
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[#ccd8cb] bg-white p-6 text-center">
                {conversationsQuery.isError ? (
                  <>
                    <p className="font-semibold text-[#405449]">La boîte de réception est indisponible</p>
                    <Button className="mt-3" onClick={() => conversationsQuery.refetch()}>Réessayer</Button>
                  </>
                ) : (
                  <>
                    <MessageSquare className="mb-3 h-8 w-8 text-[#8a9a8e]" />
                    <p className="font-semibold text-[#405449]">Choisissez une conversation</p>
                    <p className="mt-1 text-sm text-[#7b897f]">Les messages et captures de l’utilisateur s’afficheront ici.</p>
                  </>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}