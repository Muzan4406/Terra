import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { SiTelegram } from "react-icons/si";

interface TelegramChannelPopupProps {
  isOpen: boolean;
  onClose: () => void;
  telegramLink: string;
}

export function TelegramChannelPopup({
  isOpen,
  onClose,
  telegramLink,
}: TelegramChannelPopupProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          data-testid="telegram-invite-backdrop"
        >
          <motion.button
            type="button"
            aria-label="Fermer la fenêtre Telegram"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 cursor-default bg-[#0b241b]/65 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="telegram-invite-title"
            className="community-popup-panel relative z-10 w-full max-w-sm overflow-hidden rounded-[1.5rem] bg-[#fbfff8] shadow-2xl ring-1 ring-black/10"
            data-testid="telegram-invite"
          >
            <div className="relative px-6 pb-6 pt-8">
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[#668078] transition-colors hover:bg-[#eaf3e6] hover:text-[#14392f]"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4 flex justify-center">
                <div className="grid h-16 w-16 place-items-center rounded-[1.35rem] bg-[#e4f4fc] text-[#229ED9]">
                  <SiTelegram className="h-8 w-8" aria-hidden="true" />
                </div>
              </div>

              <h2 id="telegram-invite-title" className="mb-2 text-center text-xl font-extrabold text-[#14392f]">
                Rejoignez la chaîne Telegram de Beko
              </h2>
              <p className="mb-5 text-center text-sm leading-relaxed text-[#668078]">
                Recevez nos actualités et informations officielles directement sur Telegram.
              </p>

              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#229ED9] px-4 py-3 font-bold text-white shadow-[0_8px_18px_rgba(34,158,217,.23)] transition hover:bg-[#168ac1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147eac] focus-visible:ring-offset-2"
                data-testid="link-telegram-channel"
              >
                <SiTelegram className="h-6 w-6 shrink-0" aria-hidden="true" />
                <span className="flex-1">Rejoindre la chaîne</span>
                <ArrowUpRight className="h-5 w-5 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}