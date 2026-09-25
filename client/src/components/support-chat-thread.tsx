import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { Image, Loader2, Paperclip, Send, X } from "lucide-react";

export interface SupportAttachmentView {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
}

export interface SupportMessageView {
  id: string;
  senderType: "user" | "admin" | "system";
  body: string;
  createdAt: string | Date;
  attachments: SupportAttachmentView[];
}

interface SupportChatThreadProps {
  messages: SupportMessageView[];
  myRole: "user" | "admin";
  isSending: boolean;
  onSend: (body: string, files: File[]) => Promise<void>;
  emptyTitle?: string;
  emptyDescription?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 4;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatMessageTime(value: string | Date) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SupportChatThread({
  messages,
  myRole,
  isSending,
  onSend,
  emptyTitle = "Démarrez la discussion",
  emptyDescription = "Écrivez votre message ou joignez une capture d’écran.",
}: SupportChatThreadProps) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const latestMessageId = messages[messages.length - 1]?.id;
  const previousLatestMessageId = useRef<string | undefined>(undefined);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  useEffect(() => {
    if (!latestMessageId || latestMessageId === previousLatestMessageId.current) return;
    const container = messagesContainerRef.current;
    const isInitialLoad = previousLatestMessageId.current === undefined;
    const isNearBottom = !container || container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    previousLatestMessageId.current = latestMessageId;
    if (isInitialLoad || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [latestMessageId]);

  useEffect(() => () => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (selected.length === 0) return;

    const valid = selected.filter((file) => ACCEPTED_IMAGE_TYPES.has(file.type) && file.size <= MAX_FILE_SIZE);
    const rejected = valid.length !== selected.length;
    const remainingSlots = Math.max(0, MAX_FILES - files.length);
    const nextFiles = valid.slice(0, remainingSlots);

    setFiles((current) => [...current, ...nextFiles]);
    setFileError(
      rejected
        ? "Choisissez des images JPG, PNG ou WebP de 5 Mo maximum."
        : nextFiles.length < valid.length
          ? `Vous pouvez joindre jusqu’à ${MAX_FILES} images.`
          : "",
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedBody = body.trim();
    if ((!trimmedBody && files.length === 0) || isSending) return;

    try {
      await onSend(trimmedBody, files);
      setBody("");
      setFiles([]);
      setFileError("");
    } catch {
      // The sending page reports the failure; keep the draft and attachments available for retry.
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#e1e8df] bg-white shadow-sm">
      <div
        ref={messagesContainerRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4"
        role="log"
        aria-live="polite"
        aria-label="Messages du service client"
      >
        {messages.length === 0 ? (
          <div className="m-auto max-w-xs text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#e9f1e9] text-[#245943]">
              <Image className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="font-semibold text-[#203d31]">{emptyTitle}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#6b7b70]">{emptyDescription}</p>
          </div>
        ) : (
          messages.map((message) => {
            const isSystem = message.senderType === "system";
            const isMine = message.senderType === myRole;
            const senderName = isSystem
              ? "Terra · message automatique"
              : isMine
                ? "Vous"
                : myRole === "user"
                  ? "Équipe Terra"
                  : "Utilisateur";

            return (
              <div
                key={message.id}
                className={`flex ${isSystem ? "justify-center" : isMine ? "justify-end" : "justify-start"}`}
              >
                <article
                  className={`max-w-[88%] rounded-2xl px-3.5 py-3 shadow-sm ${
                    isSystem
                      ? "border border-[#dce8dc] bg-[#eef5ed] text-[#355641]"
                      : isMine
                        ? "rounded-br-md bg-[#174f3d] text-white"
                        : "rounded-bl-md border border-[#e8ece6] bg-[#fbfcfa] text-[#24382e]"
                  }`}
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] opacity-75">
                    {senderName}
                  </p>
                  {message.body && (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
                  )}
                  {message.attachments.length > 0 && (
                    <div className={`mt-2 grid gap-2 ${message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {message.attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          href={`/api/support/attachments/${attachment.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-xl border border-black/10"
                          aria-label={`Ouvrir la capture ${attachment.fileName}`}
                        >
                          <img
                            src={`/api/support/attachments/${attachment.id}`}
                            alt={`Capture d’écran : ${attachment.fileName}`}
                            loading="lazy"
                            className="max-h-56 w-full object-contain"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  <time className="mt-1.5 block text-right text-[10px] opacity-70">
                    {formatMessageTime(message.createdAt)}
                  </time>
                </article>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={submit} className="shrink-0 border-t border-[#e8ece6] bg-[#fbfcfa] p-3">
        {previews.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {previews.map(({ file, url }, index) => (
              <div key={`${file.name}-${index}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#dce5db]">
                <img src={url} alt={`Aperçu de ${file.name}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                  disabled={isSending}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white disabled:opacity-50"
                  aria-label={`Retirer ${file.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {fileError && <p className="mb-2 text-xs text-red-600" role="alert">{fileError}</p>}
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Écrivez votre message…"
          disabled={isSending}
          className="mb-2 max-h-32 min-h-12 w-full resize-y rounded-xl border border-[#dce5db] bg-white px-3 py-2.5 text-sm text-[#24382e] outline-none placeholder:text-[#87948b] focus:border-[#56826a] focus:ring-2 focus:ring-[#56826a]/15 disabled:bg-[#f3f5f1] disabled:text-[#87948b]"
          aria-label="Votre message"
        />
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor={inputId}
            aria-disabled={isSending}
            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[#315d43] transition-colors ${
              isSending ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[#eaf2e9]"
            }`}
          >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
            <span>Capture</span>
            <input
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={addFiles}
              disabled={isSending}
              className="sr-only"
            />
          </label>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-[#849088]">{body.length}/2000 · 5 Mo max/image</span>
            <button
              type="submit"
              disabled={isSending || (!body.trim() && files.length === 0)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#174f3d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#103f30] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Envoyer</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}