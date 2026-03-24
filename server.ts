import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json({ limit: '10mb' }));

const DATA_FILE = path.join(process.cwd(), "data.json");

// Initialize data
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ 
    users: [],
    bubbles: [], 
    comments: [] 
  }));
}

const readData = () => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  if (!data.users) data.users = []; // Migration for existing data
  if (!data.passwordResetRequests) data.passwordResetRequests = [];
  return data;
};
const writeData = (data: any) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

app.post("/api/password-reset/request", (req, res) => {
  const { email } = req.body;
  const data = readData();
  
  const user = data.users.find((u: any) => u.email === email);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const existingRequest = data.passwordResetRequests.find((r: any) => r.email === email);
  if (existingRequest) {
    return res.json({ success: true, message: "Request already pending" });
  }

  data.passwordResetRequests.push({
    id: Math.random().toString(36).substring(2, 15),
    email,
    status: "pending",
    timestamp: Date.now()
  });
  
  writeData(data);
  res.json({ success: true });
});

app.get("/api/password-reset/status/:email", (req, res) => {
  const data = readData();
  const request = data.passwordResetRequests.find((r: any) => r.email === req.params.email);
  
  if (!request) {
    return res.json({ status: "none" });
  }
  res.json({ status: request.status });
});

app.post("/api/password-reset/reset", (req, res) => {
  const { email, newPassword } = req.body;
  const data = readData();
  
  const requestIndex = data.passwordResetRequests.findIndex((r: any) => r.email === email && r.status === "approved");
  if (requestIndex === -1) {
    return res.status(400).json({ error: "No approved reset request found" });
  }
  
  const user = data.users.find((u: any) => u.email === email);
  if (user) {
    user.password = newPassword;
  }
  
  data.passwordResetRequests.splice(requestIndex, 1);
  writeData(data);
  res.json({ success: true });
});

app.get("/api/admin/password-resets", (req, res) => {
  const data = readData();
  res.json(data.passwordResetRequests);
});

app.post("/api/admin/password-resets/:id/approve", (req, res) => {
  const data = readData();
  const request = data.passwordResetRequests.find((r: any) => r.id === req.params.id);
  if (request) {
    request.status = "approved";
    writeData(data);
  }
  res.json({ success: true });
});

app.post("/api/admin/password-resets/:id/reject", (req, res) => {
  const data = readData();
  data.passwordResetRequests = data.passwordResetRequests.filter((r: any) => r.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.get("/api/admin/users", (req, res) => {
  const data = readData();
  // Return users without passwords
  const safeUsers = data.users.map((u: any) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    bio: u.bio,
    photoURL: u.photoURL
  }));
  res.json(safeUsers);
});

app.delete("/api/admin/users/:id", (req, res) => {
  const data = readData();
  const userId = req.params.id;
  
  const user = data.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Remove user
  data.users = data.users.filter((u: any) => u.id !== userId);
  
  // Remove user's bubbles
  const userBubbleIds = data.bubbles.filter((b: any) => b.authorId === userId).map((b: any) => b.id);
  data.bubbles = data.bubbles.filter((b: any) => b.authorId !== userId);
  
  // Remove comments on those bubbles
  data.comments = data.comments.filter((c: any) => !userBubbleIds.includes(c.bubbleId));
  
  // Remove password reset requests for this user
  data.passwordResetRequests = data.passwordResetRequests.filter((r: any) => r.email !== user.email);

  writeData(data);
  res.json({ success: true });
});

app.post("/api/register", (req, res) => {
  const { email, password } = req.body;
  const data = readData();
  
  if (data.users.find((u: any) => u.email === email)) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const newUser = {
    id: Math.random().toString(36).substring(2, 15),
    email,
    displayName: "Anonymous",
    password, // In a real app, this should be hashed
    bio: "",
    photoURL: `https://picsum.photos/seed/${email}/600/800`
  };

  data.users.push(newUser);
  writeData(data);
  
  res.json({ success: true, user: { id: newUser.id, email: newUser.email, displayName: newUser.displayName, photoURL: newUser.photoURL, bio: newUser.bio } });
});

app.put("/api/users/:id/profile", (req, res) => {
  const { displayName, bio, photoURL } = req.body;
  const data = readData();
  
  const user = data.users.find((u: any) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (displayName) user.displayName = displayName;
  if (bio !== undefined) user.bio = bio;
  if (photoURL) user.photoURL = photoURL;

  // Update authorName and photoURL in user's existing bubbles
  data.bubbles.forEach((b: any) => {
    if (b.authorId === user.id) {
      if (displayName) b.authorName = displayName;
      if (photoURL) b.photoURL = photoURL;
      if (bio !== undefined) b.bio = bio;
    }
  });

  writeData(data);
  res.json({ success: true, user: { id: user.id, email: user.email, displayName: user.displayName, photoURL: user.photoURL, bio: user.bio } });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const data = readData();
  
  const user = data.users.find((u: any) => u.email === email && u.password === password);
  
  if (user) {
    res.json({ success: true, user: { id: user.id, email: user.email, displayName: user.displayName, photoURL: user.photoURL, bio: user.bio } });
  } else {
    res.status(401).json({ error: "Invalid email or password" });
  }
});

app.get("/api/bubbles", (req, res) => {
  res.json(readData().bubbles);
});

app.post("/api/bubbles", (req, res) => {
  const data = readData();
  data.bubbles.unshift(req.body);
  writeData(data);
  res.json({ success: true });
});

app.post("/api/bubbles/:id/like", (req, res) => {
  const { userId } = req.body;
  const data = readData();
  const bubble = data.bubbles.find((b: any) => b.id === req.params.id);
  if (bubble) {
    if (!bubble.likedBy) bubble.likedBy = [];
    if (userId && !bubble.likedBy.includes(userId)) {
      bubble.likedBy.push(userId);
      bubble.likesCount += 1;
      writeData(data);
    }
  }
  res.json({ success: true });
});

app.get("/api/comments/:bubbleId", (req, res) => {
  const data = readData();
  res.json(data.comments.filter((c: any) => c.bubbleId === req.params.bubbleId));
});

app.post("/api/comments", (req, res) => {
  const data = readData();
  data.comments.push(req.body);
  writeData(data);
  res.json({ success: true });
});

app.get("/api/admin/comments", (req, res) => {
  const data = readData();
  // We need to join with bubbles to get bubble author name
  const commentsWithBubbleInfo = data.comments.map((c: any) => {
    const bubble = data.bubbles.find((b: any) => b.id === c.bubbleId);
    return {
      ...c,
      bubbleAuthorName: bubble ? bubble.authorName : "Unknown",
    };
  });
  res.json(commentsWithBubbleInfo);
});

app.get("/api/user/:userId/comments", (req, res) => {
  const data = readData();
  const userBubbles = data.bubbles.filter((b: any) => b.authorId === req.params.userId);
  const userBubbleIds = userBubbles.map((b: any) => b.id);
  
  const userComments = data.comments.filter((c: any) => userBubbleIds.includes(c.bubbleId));
  
  const commentsWithBubbleInfo = userComments.map((c: any) => {
    const bubble = userBubbles.find((b: any) => b.id === c.bubbleId);
    return {
      ...c,
      bubbleAuthorName: bubble ? bubble.authorName : "Unknown",
    };
  });
  
  res.json(commentsWithBubbleInfo);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
  });
}

startServer();
