import React from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { Bubble } from "../types";
import { Heart, X } from "lucide-react";

interface Props {
  key?: React.Key;
  bubble: Bubble;
  onSwipe: (direction: "left" | "right") => void;
  onCommentClick: () => void;
  onLikeClick: () => void;
  isTop: boolean;
  userId: string;
}

export default function SwipeCard({ bubble, onSwipe, onCommentClick, onLikeClick, isTop, userId }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) {
      onSwipe("right");
    } else if (info.offset.x < -100) {
      onSwipe("left");
    }
  };

  const hasLiked = (bubble.likedBy || []).includes(userId);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full rounded-3xl shadow-xl overflow-hidden bg-white"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 1,
        zIndex: isTop ? 10 : 0,
        scale: isTop ? 1 : 0.95,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={isTop ? { cursor: "grabbing" } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
    >
      <img
        src={bubble.photoURL}
        alt={bubble.authorName}
        className="w-full h-full object-cover pointer-events-none"
        referrerPolicy="no-referrer"
      />
      
      {/* Overlays for Like/Nope */}
      <motion.div
        className="absolute top-10 left-10 border-4 border-emerald-400 text-emerald-400 font-bold text-4xl px-4 py-2 rounded-xl rotate-[-15deg] drop-shadow-md"
        style={{ opacity: likeOpacity }}
      >
        LIKE
      </motion.div>
      <motion.div
        className="absolute top-10 right-10 border-4 border-rose-400 text-rose-400 font-bold text-4xl px-4 py-2 rounded-xl rotate-[15deg] drop-shadow-md"
        style={{ opacity: nopeOpacity }}
      >
        NOPE
      </motion.div>

      {/* Info Gradient */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-20 text-white">
        <h2 className="text-3xl font-bold mb-2 text-yellow-50">{bubble.authorName}</h2>
        <p className="text-sm text-yellow-100/90 mb-4">{bubble.bio}</p>
        
        <div className="flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onLikeClick();
            }}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-md border transition-colors ${
              hasLiked 
                ? "bg-yellow-400/30 text-yellow-200 border-yellow-400/50" 
                : "bg-black/20 text-white border-white/20 hover:bg-black/40"
            }`}
          >
            <Heart className={`w-5 h-5 ${hasLiked ? "text-yellow-400 fill-yellow-400" : "text-white"}`} />
            {bubble.likesCount}
          </motion.button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommentClick();
            }}
            className="bg-yellow-400/20 hover:bg-yellow-400/40 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium text-yellow-100 transition-colors border border-yellow-400/30"
          >
            Leave a compliment ✨
          </button>
        </div>
      </div>
    </motion.div>
  );
}
