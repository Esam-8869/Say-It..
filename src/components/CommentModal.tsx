import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../services/db";
import { X, Loader2, Send } from "lucide-react";

interface Props {
  bubbleId: string;
  currentUser: string;
  onClose: () => void;
}

export default function CommentModal({ bubbleId, currentUser, onClose }: Props) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSubmitting(true);
    setMessage("");
    setIsError(false);

    await db.addComment({
      id: Math.random().toString(36).substring(7),
      bubbleId,
      text,
      timestamp: Date.now(),
      authorName: "Anonymous",
    });
    
    setMessage("Comment posted! 🫧");
    setTimeout(() => onClose(), 2000);
    setIsSubmitting(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-yellow-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between p-4 border-b border-yellow-50 dark:border-gray-700">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-50">Leave a Secret Compliment ✨</h3>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Say something kind anonymously..."
              className="w-full h-32 p-3 bg-yellow-50/50 dark:bg-gray-700 border-none rounded-2xl resize-none focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-700 dark:text-gray-100"
              disabled={isSubmitting}
            />

            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 p-3 rounded-xl text-sm ${
                  isError ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                }`}
              >
                {message}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !text.trim()}
              className="mt-4 w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 dark:disabled:bg-yellow-900/50 text-yellow-900 font-medium py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Compliment
                </>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
