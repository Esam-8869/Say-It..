import express from "express";
import { Redis } from "@upstash/redis";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

const hasRedis = !!process.env.UPSTASH_REDIS_REST_URL;
let redis: Redis | null = null;
if (hasRedis) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  });
}

const DB_KEY = "sayit_data";
const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_REGION);
const LOCAL_DATA_FILE = isVercel ? "/tmp/data.json" : path.join(process.cwd(), "data.json");

const getDefaultData = () => ({ users: [], bubbles: [], comments: [], passwordResetRequests: [] });

// Initialize local data file if using fallback
if (!hasRedis && !fs.existsSync(LOCAL_DATA_FILE)) {
  try {
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(getDefaultData()));
  } catch (e) {
    console.error("Local file init error:", e);
  }
}

const readData = async () => {
  try {
    if (hasRedis && redis) {
      const data = await redis.get<any>(DB_KEY);
      if (data) {
        let parsed = data;
        if (typeof data === 'string') {
          try { parsed = JSON.parse(data); } catch (e) { }
        }
        if (!parsed.users) parsed.users = [];
        if (!parsed.bubbles) parsed.bubbles = [];
        if (!parsed.comments) parsed.comments = [];
        if (!parsed.passwordResetRequests) parsed.passwordResetRequests = [];
        return parsed;
      }
    } else {
      if (fs.existsSync(LOCAL_DATA_FILE)) {
        const fileContent = fs.readFileSync(LOCAL_DATA_FILE, "utf-8");
        const parsed = JSON.parse(fileContent);
        if (!parsed.users) parsed.users = [];
        if (!parsed.bubbles) parsed.bubbles = [];
        if (!parsed.comments) parsed.comments = [];
        if (!parsed.passwordResetRequests) parsed.passwordResetRequests = [];
        return parsed;
      }
    }
  } catch (err) {
    console.error("DB read error:", err);
  }
  return getDefaultData();
};

const writeData = async (data: any) => {
  try {
    if (hasRedis && redis) {
       await redis.set(DB_KEY, data);
    } else {
       fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error("DB write error:", e);
  }
};

// --- Routes ---

app.post("/api/password-reset/request", async (req, res) => {
  const { email } = req.body;
  const data = await readData();

  const user = data.users.find((u: any) => u.email === email);
  if (!user) return res.status(404).json({ error: "User not found" });

  const existingRequest = data.passwordResetRequests.find((r: any) => r.email === email);
  if (existingRequest) return res.json({ success: true, message: "Request already pending" });

  data.passwordResetRequests.push({
    id: Math.random().toString(36).substring(2, 15),
    email,
    status: "pending",
    timestamp: Date.now()
  });

  await writeData(data);
  res.json({ success: true });
});

app.get("/api/password-reset/status/:email", async (req, res) => {
  const data = await readData();
  const request = data.passwordResetRequests.find((r: any) => r.email === req.params.email);
  if (!request) return res.json({ status: "none" });
  res.json({ status: request.status });
});

app.post("/api/password-reset/reset", async (req, res) => {
  const { email, newPassword } = req.body;
  const data = await readData();

  const requestIndex = data.passwordResetRequests.findIndex((r: any) => r.email === email && r.status === "approved");
  if (requestIndex === -1) return res.status(400).json({ error: "No approved reset request found" });

  const user = data.users.find((u: any) => u.email === email);
  if (user) user.password = newPassword;

  data.passwordResetRequests.splice(requestIndex, 1);
  await writeData(data);
  res.json({ success: true });
});

app.get("/api/admin/password-resets", async (req, res) => {
  const data = await readData();
  res.json(data.passwordResetRequests);
});

app.post("/api/admin/password-resets/:id/approve", async (req, res) => {
  const data = await readData();
  const request = data.passwordResetRequests.find((r: any) => r.id === req.params.id);
  if (request) {
    request.status = "approved";
    await writeData(data);
  }
  res.json({ success: true });
});

app.post("/api/admin/password-resets/:id/reject", async (req, res) => {
  const data = await readData();
  data.passwordResetRequests = data.passwordResetRequests.filter((r: any) => r.id !== req.params.id);
  await writeData(data);
  res.json({ success: true });
});

app.get("/api/admin/users", async (req, res) => {
  const data = await readData();
  res.json(data.users);
});

app.delete("/api/admin/users/:id", async (req, res) => {
  const data = await readData();
  const userId = req.params.id;

  const user = data.users.find((u: any) => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  data.users = data.users.filter((u: any) => u.id !== userId);
  const userBubbleIds = data.bubbles.filter((b: any) => b.authorId === userId).map((b: any) => b.id);
  data.bubbles = data.bubbles.filter((b: any) => b.authorId !== userId);
  data.comments = data.comments.filter((c: any) => !userBubbleIds.includes(c.bubbleId));
  data.passwordResetRequests = data.passwordResetRequests.filter((r: any) => r.email !== user.email);

  await writeData(data);
  res.json({ success: true });
});

app.delete("/api/admin/wipe-database", async (req, res) => {
  const data = await readData();
  data.users = [];
  data.bubbles = [];
  data.comments = [];
  data.passwordResetRequests = [];
  await writeData(data);
  res.json({ success: true });
});

app.post("/api/register", async (req, res) => {
  const { email, password, displayName, bio, photoURL, instagramId } = req.body;
  const data = await readData();

  if (data.users.find((u: any) => u.email === email)) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const newUser = {
    id: Math.random().toString(36).substring(2, 15),
    email,
    displayName: displayName || "Anonymous",
    password,
    bio: bio || "",
    instagramId: instagramId || "",
    photoURL: photoURL || `https://picsum.photos/seed/${email}/600/800`
  };

  data.users.push(newUser);
  await writeData(data);

  res.json({ success: true, user: { id: newUser.id, email: newUser.email, displayName: newUser.displayName, photoURL: newUser.photoURL, bio: newUser.bio, instagramId: newUser.instagramId } });
});

app.put("/api/users/:id/profile", async (req, res) => {
  const { displayName, bio, photoURL, instagramId } = req.body;
  const data = await readData();

  const user = data.users.find((u: any) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (displayName !== undefined) user.displayName = displayName;
  if (bio !== undefined) user.bio = bio;
  if (photoURL !== undefined) user.photoURL = photoURL;
  if (instagramId !== undefined) user.instagramId = instagramId;

  data.bubbles.forEach((b: any) => {
    if (b.authorId === user.id) {
      if (displayName !== undefined) b.authorName = displayName;
      if (photoURL !== undefined) b.photoURL = photoURL;
      if (bio !== undefined) b.bio = bio;
      if (instagramId !== undefined) b.instagramId = instagramId;
    }
  });

  await writeData(data);
  res.json({ success: true, user: { id: user.id, email: user.email, displayName: user.displayName, photoURL: user.photoURL, bio: user.bio, instagramId: user.instagramId } });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const data = await readData();

  const user = data.users.find((u: any) => u.email === email && u.password === password);

  if (user) {
    res.json({ success: true, user: { id: user.id, email: user.email, displayName: user.displayName, photoURL: user.photoURL, bio: user.bio, instagramId: user.instagramId } });
  } else {
    res.status(401).json({ error: "Invalid email or password" });
  }
});

app.get("/api/bubbles", async (req, res) => {
  const data = await readData();
  res.json(data.bubbles.slice(0, 50));
});

app.post("/api/bubbles", async (req, res) => {
  const data = await readData();
  data.bubbles.unshift(req.body);
  await writeData(data);
  res.json({ success: true });
});

app.post("/api/bubbles/:id/like", async (req, res) => {
  const { userId } = req.body;
  const data = await readData();
  const bubble = data.bubbles.find((b: any) => b.id === req.params.id);
  if (bubble) {
    if (!bubble.likedBy) bubble.likedBy = [];
    if (userId && !bubble.likedBy.includes(userId)) {
      bubble.likedBy.push(userId);
      bubble.likesCount += 1;
      await writeData(data);
    }
  }
  res.json({ success: true });
});

app.post("/api/bubbles/:id/unlike", async (req, res) => {
  const { userId } = req.body;
  const data = await readData();
  const bubble = data.bubbles.find((b: any) => b.id === req.params.id);
  if (bubble && bubble.likedBy && bubble.likedBy.includes(userId)) {
    bubble.likedBy = bubble.likedBy.filter((uid: string) => uid !== userId);
    bubble.likesCount = Math.max(0, bubble.likesCount - 1);
    await writeData(data);
  }
  res.json({ success: true });
});

app.get("/api/comments/:bubbleId", async (req, res) => {
  const data = await readData();
  res.json(data.comments.filter((c: any) => c.bubbleId === req.params.bubbleId));
});

app.post("/api/comments", async (req, res) => {
  const data = await readData();
  data.comments.push(req.body);
  await writeData(data);
  res.json({ success: true });
});

app.get("/api/admin/comments", async (req, res) => {
  const data = await readData();
  const commentsWithBubbleInfo = data.comments.map((c: any) => {
    const bubble = data.bubbles.find((b: any) => b.id === c.bubbleId);
    return { ...c, bubbleAuthorName: bubble ? bubble.authorName : "Unknown" };
  });
  res.json(commentsWithBubbleInfo);
});

app.get("/api/user/:userId/comments", async (req, res) => {
  const data = await readData();
  const userBubbles = data.bubbles.filter((b: any) => b.authorId === req.params.userId);
  const userBubbleIds = userBubbles.map((b: any) => b.id);
  const userComments = data.comments.filter((c: any) => userBubbleIds.includes(c.bubbleId));

  const commentsWithBubbleInfo = userComments.map((c: any) => {
    const bubble = userBubbles.find((b: any) => b.id === c.bubbleId);
    return { ...c, bubbleAuthorName: bubble ? bubble.authorName : "Unknown" };
  });

  res.json(commentsWithBubbleInfo);
});

// Export the app for Vercel
export default app;
