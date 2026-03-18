import { Bubble, Comment } from "../types";

export const db = {
  registerUser: async (userData: any) => {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Registration failed");
    }
    return res.json();
  },

  loginUser: async (credentials: any) => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Login failed");
    }
    return res.json();
  },

  getBubbles: async (): Promise<Bubble[]> => {
    const res = await fetch("/api/bubbles");
    return res.json();
  },

  addBubble: async (bubble: Bubble) => {
    await fetch("/api/bubbles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bubble),
    });
  },

  likeBubble: async (id: string, userId: string) => {
    await fetch(`/api/bubbles/${id}/like`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });
  },

  getComments: async (bubbleId: string): Promise<Comment[]> => {
    const res = await fetch(`/api/comments/${bubbleId}`);
    return res.json();
  },

  addComment: async (comment: Comment) => {
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(comment),
    });
  },

  getAllCommentsAdmin: async (): Promise<Comment[]> => {
    const res = await fetch("/api/admin/comments");
    return res.json();
  },

  getUserComments: async (userId: string): Promise<Comment[]> => {
    const res = await fetch(`/api/user/${userId}/comments`);
    return res.json();
  },

  requestPasswordReset: async (username: string) => {
    const res = await fetch("/api/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to request password reset");
    }
    return res.json();
  },

  getPasswordResetStatus: async (username: string) => {
    const res = await fetch(`/api/password-reset/status/${username}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to get status");
    }
    return res.json();
  },

  resetPassword: async (data: any) => {
    const res = await fetch("/api/password-reset/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to reset password");
    }
    return res.json();
  },

  getAdminPasswordResets: async () => {
    const res = await fetch("/api/admin/password-resets");
    return res.json();
  },

  approvePasswordReset: async (id: string) => {
    const res = await fetch(`/api/admin/password-resets/${id}/approve`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to approve");
    return res.json();
  },

  rejectPasswordReset: async (id: string) => {
    const res = await fetch(`/api/admin/password-resets/${id}/reject`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to reject");
    return res.json();
  },

  getAdminUsers: async () => {
    const res = await fetch("/api/admin/users");
    return res.json();
  },

  deleteUser: async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete user");
    return res.json();
  }
};
