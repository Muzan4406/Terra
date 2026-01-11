import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SiTelegram } from "react-icons/si";
import { MessageCircle } from "lucide-react";

interface TelegramPopupProps {
  isOpen: boolean;
  onClose: () => void;
  telegramLink: string;
}

export function TelegramPopup({ isOpen, onClose, telegramLink }: TelegramPopupProps) {
  const [timeLeft, setTimeLeft] = useState(8);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(8);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onClose();
          return 8;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFollow = () => {
    window.open(telegramLink, "_blank");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={handleBackdropClick}
          data-testid="telegram-popup-backdrop"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
            data-testid="telegram-popup"
          >
            <div className="relative pt-8 pb-6 px-6 flex flex-col items-center">
              <div className="absolute top-4 right-4">
                <MessageCircle className="h-8 w-8 text-[#4FC3F7]" />
              </div>
              
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#29B6F6] to-[#0288D1] flex items-center justify-center shadow-lg mb-6">
                <SiTelegram className="h-12 w-12 text-white" />
              </div>

              <h2 className="text-xl font-bold text-gray-800 text-center mb-3">
                Diffusion d'Informations Officielle
              </h2>
              
              <p className="text-gray-600 text-center text-sm leading-relaxed mb-6">
                Suivez notre canal officiel Telegram pour obtenir les dernières nouvelles et informations sur les avantages.
              </p>

              <button
                onClick={handleFollow}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#29B6F6] to-[#0288D1] text-white font-semibold text-base shadow-md hover:shadow-lg transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
                data-testid="button-follow-telegram"
              >
                Suivre Maintenant
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
