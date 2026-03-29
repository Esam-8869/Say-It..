import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bubble, Comment } from "./types";
import { db } from "./services/db";
import SwipeCard from "./components/SwipeCard";
import CommentModal from "./components/CommentModal";
import { Sparkles, Image as ImageIcon, CheckCircle2, Moon, Sun, ShieldCheck, LogIn, UserPlus, Camera, Upload, User, Menu } from "lucide-react";

type ViewState = "landing" | "create_account" | "profile_setup" | "login" | "forgot_password" | "feed" | "admin_login" | "admin_dashboard" | "profile";

export default function App() {
  const [currentUserData, setCurrentUserData] = useState<{ id: string; email: string; displayName: string; photoURL: string; bio: string; instagramId?: string } | null>(() => {
    const saved = localStorage.getItem("sayit_current_session");
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState<ViewState>(() => {
    const savedUser = localStorage.getItem("sayit_current_session");
    if (savedUser) return "feed";
    return "landing";
  });

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeCommentBubble, setActiveCommentBubble] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasSwiped, setHasSwiped] = useState(() => {
    return localStorage.getItem("sayit_has_swiped") === "true";
  });
  
  // User Session
  const [currentUser, setCurrentUser] = useState<string>(() => {
    const saved = localStorage.getItem("sayit_current_session");
    return saved ? JSON.parse(saved).displayName : "Anonymous";
  });
  
  const [userId] = useState(() => {
    let id = localStorage.getItem("bubble_user_id");
    if (!id) {
      id = Math.random().toString(36).substring(2, 15);
      localStorage.setItem("bubble_user_id", id);
    }
    return id;
  });

  // Forms
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminComments, setAdminComments] = useState<Comment[]>([]);
  const [userComments, setUserComments] = useState<Comment[]>([]);

  // Forgot Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetStatus, setResetStatus] = useState<"none" | "pending" | "approved" | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  // Profile Editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editInstagramId, setEditInstagramId] = useState("");
  const [editPhotoDataUrl, setEditPhotoDataUrl] = useState<string | null>(null);
  
  // Admin Dashboard
  const [adminTab, setAdminTab] = useState<"comments" | "password_requests" | "users">("users");
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const loadBubbles = async () => {
    const data = await db.getBubbles();
    setBubbles(data);
  };

  useEffect(() => {
    if (view === "feed") {
      loadBubbles();
    } else if (view === "admin_dashboard") {
      db.getAllCommentsAdmin().then(setAdminComments);
      db.getAdminPasswordResets().then(setPasswordRequests);
      db.getAdminUsers().then(setAdminUsers);
    } else if (view === "profile" && currentUserData) {
      db.getUserComments(currentUserData.id).then(setUserComments);
    }
  }, [view, currentUserData]);

  const handleLike = async (bubbleId: string) => {
    const bubble = bubbles.find(b => b.id === bubbleId);
    if (!bubble) return;
    
    const hasLiked = (bubble.likedBy || []).includes(userId);
    if (!hasLiked) {
      setBubbles(prev => prev.map(b => 
        b.id === bubbleId
          ? { ...b, likesCount: b.likesCount + 1, likedBy: [...(b.likedBy || []), userId] } 
          : b
      ));
      await db.likeBubble(bubbleId, userId);
    }
  };

  const handleSwipe = async (direction: "left" | "right") => {
    if (bubbles.length === 0) return;
    
    if (!hasSwiped) {
      setHasSwiped(true);
      localStorage.setItem("sayit_has_swiped", "true");
    }

    const topIndex = currentIndex % bubbles.length;
    const currentBubble = bubbles[topIndex];

    if (direction === "right") {
      await handleLike(currentBubble.id);
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      const res = await db.registerUser({
        email,
        password
      });

      setCurrentUserData(res.user);
      localStorage.setItem("sayit_current_session", JSON.stringify(res.user));
      setView("profile_setup");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !bio || !currentUserData) return;

    const finalPhotoUrl = photoDataUrl || `https://picsum.photos/seed/${currentUserData.email}/600/800`;

    try {
      const res = await db.updateProfile(currentUserData.id, {
        displayName,
        bio,
        instagramId,
        photoURL: finalPhotoUrl
      });

      const newBubble: Bubble = {
        id: Math.random().toString(36).substring(7),
        authorId: res.user.id,
        authorName: displayName,
        photoURL: finalPhotoUrl,
        bio,
        likesCount: 0,
      };

      await db.addBubble(newBubble);
      setCurrentUser(displayName);
      setCurrentUserData(res.user);
      localStorage.setItem("sayit_current_session", JSON.stringify(res.user));
      setView("feed");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Please upload an image smaller than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.9));
        } else {
          setPhotoDataUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    
    try {
      const res = await db.loginUser({ email: loginEmail, password: loginPassword });
      setCurrentUser(res.user.displayName);
      setCurrentUserData(res.user);
      localStorage.setItem("sayit_current_session", JSON.stringify(res.user));
      setView("feed");
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail === "admin@gmail.com" && adminPassword === "let me in") {
      setView("admin_dashboard");
    } else {
      alert("Invalid credentials");
    }
  };

  const TopBar = () => (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50">
      <div className="w-24"></div> {/* Spacer for perfect centering */}
      <div className="text-3xl font-black text-yellow-500 cursor-pointer tracking-wide absolute left-1/2 -translate-x-1/2 drop-shadow-sm" onClick={() => setView("landing")}>
        Say It
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md text-yellow-600 dark:text-yellow-400 hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {view === "feed" && currentUser === "Anonymous" && (
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md text-yellow-600 dark:text-yellow-400 hover:bg-white dark:hover:bg-gray-800 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col z-50">
                <button
                  onClick={() => { setView("login"); setIsMenuOpen(false); }}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full text-left"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-700 w-full" />
                <button
                  onClick={() => { setView("create_account"); setIsMenuOpen(false); }}
                  className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors w-full text-left"
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </button>
              </div>
            )}
          </div>
        )}
        {currentUserData && (
          <button
            onClick={() => setView("profile")}
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-yellow-400 hover:opacity-80 transition-opacity ml-1"
          >
            <img src={currentUserData.photoURL} alt="Profile" className="w-full h-full object-cover" />
          </button>
        )}
      </div>
    </div>
  );

  if (view === "landing") {
    return (
      <div className="min-h-screen bg-yellow-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 font-sans transition-colors">
        <TopBar />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl w-full max-w-md border border-yellow-100 dark:border-gray-700"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-full text-yellow-500 dark:text-yellow-400">
              <Sparkles className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-yellow-900 dark:text-yellow-50 mb-8 font-fraunces tracking-wide">Welcome to Say It 🫧</h1>
          
          <div className="space-y-4">
            <button
              onClick={() => setView("create_account")}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Make an Account
            </button>
            <button
              onClick={() => setView("login")}
              className="w-full bg-white dark:bg-gray-700 hover:bg-yellow-50 dark:hover:bg-gray-600 text-yellow-700 dark:text-yellow-200 border-2 border-yellow-200 dark:border-gray-600 font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Login
            </button>
            <button
              onClick={() => {
                setCurrentUser("Anonymous");
                setView("feed");
              }}
              className="w-full text-sm text-gray-500 dark:text-gray-400 mt-2 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Browse Anonymously
            </button>
            <div className="pt-4 border-t border-yellow-100 dark:border-gray-700">
              <button
                onClick={() => setView("admin_login")}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                Administrator Login
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === "login") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 font-sans transition-colors">
        <TopBar />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-sm shadow-sm w-full max-w-sm border border-gray-300 dark:border-gray-700 flex flex-col items-center mt-8"
        >
          <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-gray-50 mb-8 font-fraunces">Say It</h1>
          <form onSubmit={handleLogin} className="w-full space-y-3" noValidate>
            <div>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                placeholder="Email Address"
                required
              />
            </div>
            <div>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                placeholder="Password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold py-2 rounded-lg mt-4 transition-colors text-sm"
            >
              Log in
            </button>
          </form>
          
          <button 
            onClick={() => {
              setView("forgot_password");
              setResetStatus(null);
              setForgotEmail("");
              setResetMessage("");
            }} 
            className="mt-4 text-sm text-yellow-600 dark:text-yellow-400 hover:underline"
          >
            Forgot Password?
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-4 rounded-sm shadow-sm w-full max-w-sm border border-gray-300 dark:border-gray-700 mt-4 text-center text-sm"
        >
          <span className="text-gray-600 dark:text-gray-400">Don't have an account? </span>
          <button type="button" onClick={() => setView("create_account")} className="text-yellow-600 dark:text-yellow-400 font-semibold hover:underline">
            Sign up
          </button>
        </motion.div>
      </div>
    );
  }

  if (view === "forgot_password") {
    const handleCheckStatus = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const res = await db.getPasswordResetStatus(forgotEmail);
        setResetStatus(res.status);
        if (res.status === "none") {
          await db.requestPasswordReset(forgotEmail);
          setResetStatus("pending");
          setResetMessage("Password reset requested. Please wait for an administrator to approve it.");
        } else if (res.status === "pending") {
          setResetMessage("Your password reset request is still pending approval.");
        } else if (res.status === "approved") {
          setResetMessage("Your request has been approved! You can now reset your password.");
        }
      } catch (error: any) {
        setResetMessage(error.message);
      }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await db.resetPassword({ email: forgotEmail, newPassword });
        alert("Password reset successfully! You can now log in.");
        setView("login");
      } catch (error: any) {
        setResetMessage(error.message);
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 font-sans transition-colors">
        <TopBar />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-sm shadow-sm w-full max-w-sm border border-gray-300 dark:border-gray-700 flex flex-col items-center mt-8"
        >
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-50 mb-4 font-serif">Reset Password</h1>
          
          {resetStatus !== "approved" ? (
            <form onSubmit={handleCheckStatus} className="w-full space-y-3" noValidate>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
                Enter your email address to request a password reset or check the status of an existing request.
              </p>
              <div>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                  placeholder="Email Address"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold py-2 rounded-lg mt-4 transition-colors text-sm"
              >
                Check Status / Request Reset
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="w-full space-y-3">
              <div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                  placeholder="New Password"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold py-2 rounded-lg mt-4 transition-colors text-sm"
              >
                Reset Password
              </button>
            </form>
          )}

          {resetMessage && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 text-center w-full">
              {resetMessage}
            </div>
          )}

          <button 
            onClick={() => setView("login")} 
            className="mt-6 text-sm text-gray-500 dark:text-gray-400 hover:underline"
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    );
  }

  if (view === "create_account") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 font-sans transition-colors">
        <TopBar />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-sm shadow-sm w-full max-w-sm border border-gray-300 dark:border-gray-700 flex flex-col items-center mt-8"
        >
          <h1 className="text-4xl font-bold text-center text-gray-900 dark:text-gray-50 mb-4 font-fraunces">Say It</h1>
          <p className="text-center text-gray-500 dark:text-gray-400 font-medium mb-6 text-sm">
            Sign up to share your thoughts and see what others are saying.
          </p>

          <form onSubmit={handleRegister} className="w-full space-y-3" noValidate>
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                placeholder="Email Address"
                required
              />
            </div>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                placeholder="Password"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold py-2 rounded-lg mt-4 transition-colors text-sm"
            >
              Sign Up
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-4 rounded-sm shadow-sm w-full max-w-sm border border-gray-300 dark:border-gray-700 mt-4 text-center text-sm"
        >
          <span className="text-gray-600 dark:text-gray-400">Have an account? </span>
          <button type="button" onClick={() => setView("login")} className="text-yellow-600 dark:text-yellow-400 font-semibold hover:underline">
            Log in
          </button>
        </motion.div>
      </div>
    );
  }

  if (view === "profile_setup") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 font-sans transition-colors">
        <TopBar />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-sm shadow-sm w-full max-w-sm border border-gray-300 dark:border-gray-700 flex flex-col items-center mt-8"
        >
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-50 mb-4 font-serif">Setup Profile</h1>
          <p className="text-center text-gray-500 dark:text-gray-400 font-medium mb-6 text-sm">
            Customize your profile to get started.
          </p>

          <form onSubmit={handleProfileSetup} className="w-full space-y-3">
            {/* Photo Upload */}
            <div className="flex flex-col items-center justify-center mb-4">
              <label htmlFor="photo-upload" className="cursor-pointer relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                  {photoDataUrl ? (
                    <img src={photoDataUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-gray-400 group-hover:text-gray-500 transition-colors" />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 bg-yellow-400 rounded-full p-1.5 border-2 border-white dark:border-gray-800 shadow-sm">
                  <Upload className="w-3 h-3 text-yellow-900" />
                </div>
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            <div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                placeholder="Display Name (e.g. John Doe)"
                required
              />
            </div>
            <div>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2.5 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                placeholder="Short Bio"
                required
              />
            </div>
            <div>
              <input
                type="text"
                value={instagramId}
                onChange={(e) => setInstagramId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                placeholder="Instagram ID (Optional, e.g. @zuck)"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold py-2 rounded-lg mt-4 transition-colors text-sm"
            >
              Complete Setup
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (view === "admin_login") {
    return (
      <div className="min-h-screen bg-yellow-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 font-sans transition-colors">
        <TopBar />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl w-full max-w-md border border-yellow-100 dark:border-gray-700"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full text-gray-600 dark:text-gray-300">
              <ShieldCheck className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center text-gray-900 dark:text-gray-50 mb-6">Administrator Login</h2>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-400 outline-none transition-all"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-3 rounded-xl mt-6 transition-colors"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setView("landing")}
              className="w-full text-sm text-gray-500 dark:text-gray-400 mt-4 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Back
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (view === "profile") {
    const handleEditProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUserData) return;
      try {
        const finalPhotoUrl = editPhotoDataUrl || currentUserData.photoURL;
        const res = await db.updateProfile(currentUserData.id, {
          displayName: editDisplayName,
          bio: editBio,
          instagramId: editInstagramId,
          photoURL: finalPhotoUrl
        });
        setCurrentUserData(res.user);
        setCurrentUser(res.user.displayName);
        setIsEditingProfile(false);
        loadBubbles();
      } catch (error: any) {
        alert(error.message);
      }
    };

    const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Please upload an image smaller than 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setEditPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.9));
          } else {
            setEditPhotoDataUrl(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 font-sans transition-colors">
        <TopBar />
        <div className="max-w-2xl mx-auto mt-20">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col items-center mb-8">
            {isEditingProfile ? (
              <form onSubmit={handleEditProfile} className="w-full max-w-sm space-y-4 flex flex-col items-center">
                <div className="flex flex-col items-center justify-center mb-4">
                  <label htmlFor="edit-photo-upload" className="cursor-pointer relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 border-4 border-yellow-400 flex items-center justify-center">
                      <img src={editPhotoDataUrl || currentUserData?.photoURL} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute bottom-0 right-0 bg-yellow-400 rounded-full p-2 border-2 border-white dark:border-gray-800 shadow-sm">
                      <Camera className="w-4 h-4 text-yellow-900" />
                    </div>
                  </label>
                  <input
                    id="edit-photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleEditPhotoUpload}
                  />
                </div>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                  placeholder="Display Name"
                  required
                />
                <input
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                  placeholder="Bio"
                  required
                />
                <input
                  type="text"
                  value={editInstagramId}
                  onChange={(e) => setEditInstagramId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none transition-all"
                  placeholder="Instagram ID (Optional, e.g. @zuck)"
                />
                <div className="flex gap-2 w-full">
                  <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg transition-colors text-sm font-medium">Save</button>
                </div>
              </form>
            ) : (
              <>
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-yellow-400 mb-4">
                  <img src={currentUserData?.photoURL} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{currentUserData?.displayName}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{currentUserData?.email}</p>
                {currentUserData?.bio && <p className="text-gray-700 dark:text-gray-300 mt-4 text-center max-w-md">{currentUserData.bio}</p>}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setEditDisplayName(currentUserData?.displayName || "");
                      setEditBio(currentUserData?.bio || "");
                      setEditInstagramId(currentUserData?.instagramId || "");
                      setEditPhotoDataUrl(null);
                      setIsEditingProfile(true);
                    }}
                    className="px-6 py-2 bg-yellow-400 text-yellow-900 rounded-full hover:bg-yellow-500 transition-colors font-medium text-sm"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      setCurrentUser("Anonymous");
                      setCurrentUserData(null);
                      localStorage.removeItem("sayit_current_session");
                      setView("landing");
                    }}
                    className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
                  >
                    Log Out
                  </button>
                </div>
              </>
            )}
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Anonymous Comments on Your Bubbles
          </h2>

          <div className="space-y-4">
            {userComments.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl text-center border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">No one has commented on your bubbles yet.</p>
              </div>
            ) : (
              userComments.map((comment) => (
                <div key={comment.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-gray-700 flex items-center justify-center text-lg">
                        🫧
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{comment.authorName}</span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(comment.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mt-3 pl-10">{comment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === "admin_dashboard") {
    const handleApproveReset = async (id: string) => {
      try {
        await db.approvePasswordReset(id);
        const updated = await db.getAdminPasswordResets();
        setPasswordRequests(updated);
      } catch (e) {
        alert("Failed to approve");
      }
    };

    const handleRejectReset = async (id: string) => {
      try {
        await db.rejectPasswordReset(id);
        const updated = await db.getAdminPasswordResets();
        setPasswordRequests(updated);
      } catch (e) {
        alert("Failed to reject");
      }
    };

    const handleDeleteUser = async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this user? This will also delete all their bubbles and comments.")) return;
      try {
        await db.deleteUser(id);
        const updated = await db.getAdminUsers();
        setAdminUsers(updated);
      } catch (e) {
        alert("Failed to delete user");
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 font-sans transition-colors">
        <TopBar />
        <div className="max-w-4xl mx-auto mt-16">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Admin Dashboard</h1>
            <button
              onClick={() => setView("landing")}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2">
            <button
              onClick={() => setAdminTab("users")}
              className={`px-4 py-2 font-medium text-sm transition-colors ${adminTab === "users" ? "text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              Users
            </button>
            <button
              onClick={() => setAdminTab("comments")}
              className={`px-4 py-2 font-medium text-sm transition-colors ${adminTab === "comments" ? "text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              Comments
            </button>
            <button
              onClick={() => setAdminTab("password_requests")}
              className={`px-4 py-2 font-medium text-sm transition-colors ${adminTab === "password_requests" ? "text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              Password Requests
            </button>
          </div>

          {adminTab === "users" ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Avatar</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Email</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Display Name</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="p-4">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
                          <img src={user.photoURL} alt={user.email} className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{user.email}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{user.displayName}</td>
                      <td className="p-4 text-sm">
                        <button onClick={() => handleDeleteUser(user.id)} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs transition-colors">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {adminUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : adminTab === "comments" ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Commenter</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Comment</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">On Bubble By</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {adminComments.map((comment) => (
                    <tr key={comment.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="p-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{comment.authorName}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{comment.text}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{comment.bubbleAuthorName}</td>
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-500">{new Date(comment.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                  {adminComments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">No comments yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Email</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Status</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Date</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {passwordRequests.map((req) => (
                    <tr key={req.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="p-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{req.email}</td>
                      <td className="p-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${req.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-500">{new Date(req.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-sm">
                        {req.status === "pending" && (
                          <div className="flex gap-2">
                            <button onClick={() => handleApproveReset(req.id)} className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors">Approve</button>
                            <button onClick={() => handleRejectReset(req.id)} className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs transition-colors">Reject</button>
                          </div>
                        )}
                        {req.status === "approved" && (
                          <span className="text-gray-400 text-xs italic">Awaiting user reset</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {passwordRequests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">No password reset requests.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-yellow-50 dark:bg-gray-900 flex flex-col items-center justify-center overflow-hidden font-sans transition-colors">
      <TopBar />
      <div className="w-full max-w-md h-[80vh] relative mt-12">
        <AnimatePresence>
          {(() => {
            if (bubbles.length === 0) return null;
            const visibleCards = [];
            
            // Determine how many cards to show (up to 3)
            const cardsToShow = Math.min(bubbles.length, 3);
            
            // Push cards from back to front
            for (let i = cardsToShow - 1; i >= 0; i--) {
              const currentOffsetIndex = (currentIndex + i) % bubbles.length;
              visibleCards.push(
                <SwipeCard
                  key={`${bubbles[currentOffsetIndex].id}-${currentIndex + i}`}
                  bubble={bubbles[currentOffsetIndex]}
                  isTop={i === 0}
                  indexOffset={i}
                  userId={userId}
                  onSwipe={handleSwipe}
                  onLikeClick={() => handleLike(bubbles[currentOffsetIndex].id)}
                  onCommentClick={() => setActiveCommentBubble(bubbles[currentOffsetIndex].id)}
                />
              );
            }
            
            return visibleCards;
          })()}
        </AnimatePresence>

        {!hasSwiped && bubbles.length > 0 && (
          <motion.div
            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center text-white drop-shadow-md w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex items-center gap-4 text-4xl"
              animate={{ x: [-15, 15, -15] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <span>👈</span>
              <span>👉</span>
            </motion.div>
            <span className="text-sm font-medium mt-3 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm shadow-lg text-center">
              Swipe left or right to see other photos
            </span>
          </motion.div>
        )}

        {bubbles.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-yellow-600 dark:text-yellow-400">
            <Sparkles className="w-12 h-12 mb-4 opacity-50 animate-pulse" />
            <p className="font-medium">Loading bubbles... 🫧</p>
          </div>
        )}
      </div>

      {activeCommentBubble && (
        <CommentModal
          bubbleId={activeCommentBubble}
          currentUser={currentUser}
          onClose={() => setActiveCommentBubble(null)}
        />
      )}
    </div>
  );
}
