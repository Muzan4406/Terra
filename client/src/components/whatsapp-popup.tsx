import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SiWhatsapp } from "react-icons/si";
import { MessageCircle } from "lucide-react";

interface WhatsAppPopupProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappLink: string;
}

export function WhatsAppPopup({ isOpen, onClose, whatsappLink }: WhatsAppPopupProps) {
  const [timeLeft, setTimeLeft] = useState(8);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(8);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          onClose();
          return 8;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  const handleFollow = () => {
    window.open(whatsappLink, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          data-testid="whatsapp-popup-backdrop"
        >
          <motion.button
            type="button"
            aria-label="Fermer la fenêtre WhatsApp"
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
            className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl bg-white opacity-100 shadow-xl"
            style={{ backgroundColor: "#ffffff" }}
            data-testid="whatsapp-popup"
          >
            <div className="relative flex flex-col items-center px-6 pb-6 pt-8">
              <div className="absolute right-4 top-4">
                <MessageCircle className="h-8 w-8 text-[#25D366]" />
              </div>

              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#36D66F] to-[#128C4A] shadow-lg">
                <SiWhatsapp className="h-12 w-12 text-white" />
              </div>

              <h2 className="mb-3 text-center text-xl font-bold text-gray-800">
                Rejoignez notre WhatsApp officiel
              </h2>
              <p className="mb-6 text-center text-sm leading-relaxed text-gray-600">
                Recevez nos actualités et informations directement sur WhatsApp.
              </p>

              <button
                onClick={handleFollow}
                className="w-full rounded-full bg-gradient-to-r from-[#36D66F] to-[#128C4A] py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:opacity-95 hover:shadow-lg active:scale-[0.98]"
                data-testid="button-follow-whatsapp"
              >
                Rejoindre maintenant
              </button>
              <span className="sr-only" aria-live="polite">{timeLeft}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}