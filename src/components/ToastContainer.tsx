import { motion, AnimatePresence } from "motion/react";
import { Check, Info, AlertTriangle } from "lucide-react";
import { ToastMessage } from "../types";

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            onAnimationComplete={() => {
              setTimeout(() => onRemove(toast.id), 3000);
            }}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-full shadow-lg text-white text-xs font-bold ${
              toast.type === "success"
                ? "bg-emerald-500 shadow-emerald-500/20"
                : toast.type === "error"
                ? "bg-rose-500 shadow-rose-500/20"
                : "bg-indigo-500 shadow-indigo-500/20"
            }`}
          >
            {toast.type === "success" && <Check className="w-4 h-4" />}
            {toast.type === "error" && <AlertTriangle className="w-4 h-4" />}
            {toast.type === "info" && <Info className="w-4 h-4" />}
            <span>{toast.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
