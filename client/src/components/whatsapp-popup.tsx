import { motion, AnimatePresence } from "framer-motion";
import { SiTelegram, SiWhatsapp } from "react-icons/si";
import { MessageCircle, X } from "lucide-react";

interface WhatsAppPopupProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappLink: string;
  telegramGroupLink: string;
}

export function WhatsAppPopup({
  isOpen,
  onClose,
  whatsappLink,
  telegramGroupLink,
}: WhatsAppPopupProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          data-testid="community-popup-backdrop"
        >
          <motion.button
            type="button"
            aria-label="Fermer la fenêtre des canaux"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 cursor-default bg-black/60"
          />
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="community-popup-title"
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl"
            data-testid="community-popup"
          >
            <div className="relative flex flex-col px-6 pb-6 pt-8">
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f1f5f9]">
                  <MessageCircle className="h-7 w-7 text-[#315e4d]" />
                </div>
              </div>

              <h2 id="community-popup-title" className="mb-2 text-center text-xl font-bold text-gray-800">
                Rejoignez nos canaux officiels
              </h2>
              <p className="mb-5 text-center text-sm leading-relaxed text-gray-600">
                Choisissez un canal pour recevoir les actualités et échanger avec la communauté.
              </p>

              <div className="space-y-3">
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-14 items-center gap-3 rounded-xl bg-[#25D366] px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#1fb95a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#128C4A] focus-visible:ring-offset-2"
                    data-testid="link-whatsapp-channel"
                  >
                    <SiWhatsapp className="h-6 w-6 shrink-0" aria-hidden="true" />
                    <span className="flex-1">Chaîne WhatsApp</span>
                    <span className="text-sm font-medium text-white/90">Rejoindre</span>
                  </a>
                )}

                {telegramGroupLink && (
                  <a
                    href={telegramGroupLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-14 items-center gap-3 rounded-xl bg-[#229ED9] px-4 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[#168ac1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147eac] focus-visible:ring-offset-2"
                    data-testid="link-telegram-group"
                  >
                    <SiTelegram className="h-6 w-6 shrink-0" aria-hidden="true" />
                    <span className="flex-1">Groupe de discussion Telegram</span>
                    <span className="text-sm font-medium text-white/90">Rejoindre</span>
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}