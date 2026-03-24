export interface User {
  id: string;
  displayName: string;
  photoURL: string;
  bio: string;
}

export interface Bubble {
  id: string;
  authorId: string;
  authorName: string;
  photoURL: string;
  bio: string;
  likesCount: number;
  likedBy?: string[];
}

export interface Comment {
  id: string;
  bubbleId: string;
  text: string;
  timestamp: number;
  authorName: string;
  bubbleAuthorName?: string;
}
