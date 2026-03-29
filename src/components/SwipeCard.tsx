import React from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { Bubble } from "../types";
import { Heart, X, Instagram } from "lucide-react";

interface Props {
  key?: React.Key;
  bubble: Bubble;
  onSwipe: (direction: "left" | "right") => void;
  onCommentClick: () => void;
  onLikeClick: () => void;
  isTop: boolean;
  indexOffset: number; // 0 for top, 1 for next, 2 for the one after
  userId: string;
}

export default function SwipeCard({ bubble, onSwipe, onCommentClick, onLikeClick, isTop, indexOffset, userId }: Props) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

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
        y: isTop ? 0 : indexOffset * 15,
        rotate: isTop ? rotate : 0,
        opacity: isTop ? opacity : 1 - (indexOffset * 0.2),
        zIndex: 10 - indexOffset,
        scale: isTop ? 1 : 1 - (indexOffset * 0.05),
        willChange: isTop ? "transform, opacity" : "auto",
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
      
      {/* Info Gradient */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-20 text-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl font-bold text-yellow-50">{bubble.authorName}</h2>
          {bubble.instagramId && (
            <a 
              href={`https://instagram.com/${bubble.instagramId.replace('@', '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="bg-pink-500/20 hover:bg-pink-500/40 text-pink-300 p-2 rounded-full backdrop-blur-md transition-colors border border-pink-500/30"
            >
              <Instagram className="w-5 h-5" />
            </a>
          )}
        </div>
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
            Leave an anonymous comment
          </button>
        </div>
      </div>
    </motion.div>
  );
}
