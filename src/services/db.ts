import { Bubble, Comment } from "../types";

const DB_KEY = "sayit_permanent_database";

export const getDb = () => {
  const data = localStorage.getItem(DB_KEY);
  if (data) return JSON.parse(data);
  return { users: [], bubbles: [], comments: [], passwordResetRequests: [] };
};

const saveDb = (data: any) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
};

export const db = {
  registerUser: async (userData: any) => {
    const data = getDb();
    if (data.users.find((u: any) => u.email === userData.email)) {
      throw new Error("Email already exists");
    }
    const newUser = {
      id: Math.random().toString(36).substring(2, 15),
      email: userData.email,
      displayName: "Anonymous",
      password: userData.password,
      bio: "",
      photoURL: `https://picsum.photos/seed/${userData.email}/600/800`,
      instagramId: ""
    };
    data.users.push(newUser);
    saveDb(data);
    return { success: true, user: newUser };
  },

  updateProfile: async (userId: string, profileData: any) => {
    const data = getDb();
    const user = data.users.find((u: any) => u.id === userId);
    if (!user) throw new Error("User not found");

    if (profileData.displayName !== undefined) user.displayName = profileData.displayName;
    if (profileData.bio !== undefined) user.bio = profileData.bio;
    if (profileData.photoURL !== undefined) user.photoURL = profileData.photoURL;
    if (profileData.instagramId !== undefined) user.instagramId = profileData.instagramId;

    data.bubbles.forEach((b: any) => {
      if (b.authorId === user.id) {
        if (profileData.displayName !== undefined) b.authorName = profileData.displayName;
        if (profileData.photoURL !== undefined) b.photoURL = profileData.photoURL;
        if (profileData.bio !== undefined) b.bio = profileData.bio;
        if (profileData.instagramId !== undefined) b.instagramId = profileData.instagramId;
      }
    });

    saveDb(data);
    return { success: true, user };
  },

  loginUser: async (credentials: any) => {
    const data = getDb();
    const user = data.users.find((u: any) => u.email === credentials.email && u.password === credentials.password);
    if (!user) throw new Error("Invalid email or password");
    return { success: true, user };
  },

  getBubbles: async (): Promise<Bubble[]> => {
    return getDb().bubbles;
  },

  addBubble: async (bubble: Bubble) => {
    const data = getDb();
    data.bubbles.unshift(bubble);
    saveDb(data);
  },

  likeBubble: async (id: string, userId: string) => {
    const data = getDb();
    const bubble = data.bubbles.find((b: any) => b.id === id);
    if (bubble) {
      if (!bubble.likedBy) bubble.likedBy = [];
      if (!bubble.likedBy.includes(userId)) {
        bubble.likedBy.push(userId);
        bubble.likesCount += 1;
        saveDb(data);
      }
    }
  },

  unlikeBubble: async (id: string, userId: string) => {
    const data = getDb();
    const bubble = data.bubbles.find((b: any) => b.id === id);
    if (bubble && bubble.likedBy && bubble.likedBy.includes(userId)) {
      bubble.likedBy = bubble.likedBy.filter((uid: string) => uid !== userId);
      bubble.likesCount = Math.max(0, bubble.likesCount - 1);
      saveDb(data);
    }
  },

  getComments: async (bubbleId: string): Promise<Comment[]> => {
    const data = getDb();
    return data.comments.filter((c: any) => c.bubbleId === bubbleId);
  },

  addComment: async (comment: Comment) => {
    const data = getDb();
    data.comments.push(comment);
    saveDb(data);
  },

  getAllCommentsAdmin: async (): Promise<Comment[]> => {
    const data = getDb();
    return data.comments.map((c: any) => {
      const bubble = data.bubbles.find((b: any) => b.id === c.bubbleId);
      return { ...c, bubbleAuthorName: bubble ? bubble.authorName : "Unknown" };
    });
  },

  getUserComments: async (userId: string): Promise<Comment[]> => {
    const data = getDb();
    const userBubbles = data.bubbles.filter((b: any) => b.authorId === userId);
    const userBubbleIds = userBubbles.map((b: any) => b.id);
    const userComments = data.comments.filter((c: any) => userBubbleIds.includes(c.bubbleId));
    
    return userComments.map((c: any) => {
      const bubble = userBubbles.find((b: any) => b.id === c.bubbleId);
      return { ...c, bubbleAuthorName: bubble ? bubble.authorName : "Unknown" };
    });
  },

  requestPasswordReset: async (email: string) => {
    const data = getDb();
    const user = data.users.find((u: any) => u.email === email);
    if (!user) throw new Error("User not found");

    const existingRequest = data.passwordResetRequests.find((r: any) => r.email === email);
    if (existingRequest) return { success: true, message: "Request already pending" };

    data.passwordResetRequests.push({
      id: Math.random().toString(36).substring(2, 15),
      email,
      status: "pending",
      timestamp: Date.now()
    });
    saveDb(data);
    return { success: true };
  },

  getPasswordResetStatus: async (email: string) => {
    const data = getDb();
    const request = data.passwordResetRequests.find((r: any) => r.email === email);
    if (!request) return { status: "none" };
    return { status: request.status };
  },

  resetPassword: async (reqData: any) => {
    const data = getDb();
    const requestIndex = data.passwordResetRequests.findIndex((r: any) => r.email === reqData.email && r.status === "approved");
    if (requestIndex === -1) throw new Error("No approved reset request found");
    
    const user = data.users.find((u: any) => u.email === reqData.email);
    if (user) user.password = reqData.newPassword;
    
    data.passwordResetRequests.splice(requestIndex, 1);
    saveDb(data);
    return { success: true };
  },

  getAdminPasswordResets: async () => {
    return getDb().passwordResetRequests;
  },

  approvePasswordReset: async (id: string) => {
    const data = getDb();
    const request = data.passwordResetRequests.find((r: any) => r.id === id);
    if (request) { request.status = "approved"; saveDb(data); }
    return { success: true };
  },

  rejectPasswordReset: async (id: string) => {
    const data = getDb();
    data.passwordResetRequests = data.passwordResetRequests.filter((r: any) => r.id !== id);
    saveDb(data);
    return { success: true };
  },

  getAdminUsers: async () => {
    const data = getDb();
    return data.users.map((u: any) => ({
      id: u.id, email: u.email, displayName: u.displayName, bio: u.bio, photoURL: u.photoURL
    }));
  },

  deleteUser: async (id: string) => {
    const data = getDb();
    const user = data.users.find((u: any) => u.id === id);
    if (!user) throw new Error("User not found");

    data.users = data.users.filter((u: any) => u.id !== id);
    const userBubbleIds = data.bubbles.filter((b: any) => b.authorId === id).map((b: any) => b.id);
    data.bubbles = data.bubbles.filter((b: any) => b.authorId !== id);
    data.comments = data.comments.filter((c: any) => !userBubbleIds.includes(c.bubbleId));
    data.passwordResetRequests = data.passwordResetRequests.filter((r: any) => r.email !== user.email);
    saveDb(data);
    return { success: true };
  }
};
