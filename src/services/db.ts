import { Bubble, Comment } from "../types";

const API_BASE = "/api";

const apiFetch = async (url: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};

export const db = {
  registerUser: async (userData: { email: string; password: string; displayName?: string; bio?: string; photoURL?: string; instagramId?: string }) => {
    return apiFetch("/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  updateProfile: async (userId: string, profileData: any) => {
    return apiFetch(`/users/${userId}/profile`, {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  loginUser: async (credentials: { email: string; password: string }) => {
    return apiFetch("/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  getBubbles: async (): Promise<Bubble[]> => {
    return apiFetch("/bubbles");
  },

  addBubble: async (bubble: Bubble) => {
    return apiFetch("/bubbles", {
      method: "POST",
      body: JSON.stringify(bubble),
    });
  },

  likeBubble: async (id: string, userId: string) => {
    return apiFetch(`/bubbles/${id}/like`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },

  unlikeBubble: async (id: string, userId: string) => {
    return apiFetch(`/bubbles/${id}/unlike`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  },

  getComments: async (bubbleId: string): Promise<Comment[]> => {
    return apiFetch(`/comments/${bubbleId}`);
  },

  addComment: async (comment: Comment) => {
    return apiFetch("/comments", {
      method: "POST",
      body: JSON.stringify(comment),
    });
  },

  getAllCommentsAdmin: async (): Promise<Comment[]> => {
    return apiFetch("/admin/comments");
  },

  getUserComments: async (userId: string): Promise<Comment[]> => {
    return apiFetch(`/user/${userId}/comments`);
  },

  requestPasswordReset: async (email: string) => {
    return apiFetch("/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  getPasswordResetStatus: async (email: string) => {
    return apiFetch(`/password-reset/status/${email}`);
  },

  resetPassword: async (reqData: { email: string; newPassword: string }) => {
    return apiFetch("/password-reset/reset", {
      method: "POST",
      body: JSON.stringify(reqData),
    });
  },

  getAdminPasswordResets: async () => {
    return apiFetch("/admin/password-resets");
  },

  approvePasswordReset: async (id: string) => {
    return apiFetch(`/admin/password-resets/${id}/approve`, { method: "POST" });
  },

  rejectPasswordReset: async (id: string) => {
    return apiFetch(`/admin/password-resets/${id}/reject`, { method: "POST" });
  },

  getAdminUsers: async () => {
    return apiFetch("/admin/users");
  },

  deleteUser: async (id: string) => {
    return apiFetch(`/admin/users/${id}`, { method: "DELETE" });
  },
};
