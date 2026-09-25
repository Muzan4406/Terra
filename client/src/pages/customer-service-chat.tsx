import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Headphones, Loader2, MessageSquareText } from "lucide-react";
import { useLocation } from "wouter";
import { SupportChatThread, type SupportMessageView } from "@/components/support-chat-thread";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

async function postSupportMessage(body: string, files: File[]) {
  const formData = new FormData();
  formData.append("message", body);
  files.forEach((file) => formData.append("attachments", file, file.name));

  const response = await fetch("/api/support/messages", {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Le message n’a pas pu être envoyé.");
  }
  return result;
}

export default function CustomerServiceChatPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const messagesQuery = useQuery<SupportMessageView[]>({
    queryKey: ["/api/support/messages"],
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
  });

  const sendMutation = useMutation({
    mutationFn: ({ body, files }: { body: string; files: File[] }) => postSupportMessage(body, files),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/support/messages"] });
      toast({
        title: "Message envoyé",
        description: "Une confirmation automatique vient d’être ajoutée à la conversation.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Envoi impossible", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-[100dvh] bg-[#f1f3ec]">
      <div className="mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-[#f7f8f3]">
        <header className="flex shrink-0 items-center gap-3 border-b border-[#e0e8df] bg-white px-4 py-3.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate("/account")}
            aria-label="Retour au compte"
            data-testid="button-support-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f1e8] text-[#245943]">
            <Headphones className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-[#1d3f31]">Service client</h1>
            <p className="truncate text-xs text-[#6b7a70]">Discussion directe avec l’équipe Terra</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f4ed] text-[#50745d]">
            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          </span>
        </header>

        <main className="min-h-0 flex-1 p-3">
          {messagesQuery.isError ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-6 text-center">
              <p className="font-semibold text-red-700">La conversation est indisponible</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {messagesQuery.error instanceof Error ? messagesQuery.error.message : "Réessayez dans un instant."}
              </p>
              <Button className="mt-4" onClick={() => messagesQuery.refetch()} disabled={messagesQuery.isFetching}>
                {messagesQuery.isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Réessayer
              </Button>
            </div>
          ) : (
            <SupportChatThread
              messages={messagesQuery.data || []}
              myRole="user"
              isSending={sendMutation.isPending}
              onSend={(body, files) => sendMutation.mutateAsync({ body, files }).then(() => undefined)}
              emptyTitle="Écrivez à l’équipe Terra"
              emptyDescription="Envoyez votre question ou une capture d’écran. Une confirmation automatique apparaîtra après chaque envoi."
            />
          )}
        </main>

        <footer className="shrink-0 border-t border-[#e0e8df] bg-white px-4 py-2 text-center">
          <button
            type="button"
            onClick={() => navigate("/customer-service")}
            className="min-h-9 text-xs font-semibold text-[#315d43] underline-offset-2 hover:underline"
          >
            Voir les autres moyens de contact
          </button>
        </footer>
      </div>
    </div>
  );
}