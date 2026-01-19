
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerAudioRoutes } from "./replit_integrations/audio/routes";
import { openai } from "./replit_integrations/audio/client";
import { spawn } from "child_process";
import path from "path";
import { insertDanceVideoSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === AUTHENTICATION SETUP ===
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // === AI INTEGRATIONS SETUP ===
  registerChatRoutes(app);
  registerImageRoutes(app);
  registerAudioRoutes(app);

  // === PROTECTED ROUTE MIDDLEWARE ===
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // === USER PROFILE ROUTES ===
  app.get(api.profile.get.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    let profile = await storage.getUserProfile(userId);
    
    // Create profile if it doesn't exist for a logged-in user
    if (!profile) {
      profile = await storage.createUserProfile({
        userId,
        displayName: req.user.claims.name || "Dancer",
        avatarConfig: {},
      });
    }
    res.json(profile);
  });

  app.patch(api.profile.update.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    try {
      const input = api.profile.update.input.parse(req.body);
      const profile = await storage.updateUserProfile(userId, input);
      res.json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // === VIDEO ROUTES ===
  app.get(api.videos.list.path, async (req, res) => {
    const videos = await storage.getAllVideos();
    res.json(videos);
  });

  app.get(api.videos.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const video = await storage.getVideo(id);
    if (!video) return res.status(404).json({ message: "Video not found" });
    res.json(video);
  });

  app.post("/api/videos", requireAuth, async (req: any, res) => {
    try {
      const input = insertDanceVideoSchema.parse(req.body);
      const video = await storage.createVideo(input);
      res.status(201).json(video);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === PRACTICE ROUTES ===
  app.post(api.practice.start.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    try {
      const input = api.practice.start.input.parse(req.body);
      const session = await storage.createPracticeSession({
        userId,
        videoId: input.videoId,
        completed: false,
        durationPlayed: 0,
        score: 0,
        accuracy: 0,
      });
      res.status(201).json(session);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post(api.practice.finish.path, requireAuth, async (req: any, res) => {
    const id = Number(req.params.id);
    try {
      const input = api.practice.finish.input.parse(req.body);
      const session = await storage.updatePracticeSession(id, {
        ...input,
        completed: true,
      });
      res.json(session);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.practice.history.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const history = await storage.getUserPracticeHistory(userId);
    res.json(history);
  });

  // === COACHING ROUTES ===
  app.post(api.coaching.analyze.path, requireAuth, async (req: any, res) => {
    try {
      const input = api.coaching.analyze.input.parse(req.body);
      
      // Call Python analyzer
      const pythonProcess = spawn('python3', [path.join(process.cwd(), 'server', 'motion_analyzer.py')]);
      
      let outputData = '';
      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stdin.write(JSON.stringify(input));
      pythonProcess.stdin.end();

      pythonProcess.on('close', async (code) => {
        if (code !== 0) {
          // Fallback to OpenAI if Python fails
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are an expert dance coach. Analyze the user's performance and provide constructive, encouraging feedback. Keep it brief and actionable."
              },
              {
                role: "user",
                content: `
                  Dance Context: ${input.videoContext}
                  User Performance: ${input.userPerformance}
                  
                  Provide a JSON response with:
                  - feedback: overall assessment
                  - tips: array of 3 specific improvement tips
                  - encouragement: a short motivational phrase
                `
              }
            ],
            response_format: { type: "json_object" },
          });

          const result = JSON.parse(response.choices[0].message.content || "{}");
          return res.json(result);
        }

        try {
          const result = JSON.parse(outputData);
          res.json(result);
        } catch (e) {
          res.status(500).json({ message: "Failed to parse analyzer output" });
        }
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to generate coaching feedback" });
    }
  });

  // === FAVORITES ROUTES ===
  app.get(api.favorites.list.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const favorites = await storage.getUserFavorites(userId);
    res.json(favorites);
  });

  app.post(api.favorites.toggle.path, requireAuth, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const videoId = Number(req.params.videoId);
    const isFavorite = await storage.toggleFavorite(userId, videoId);
    res.json({ isFavorite });
  });

  // === SEED DATA ===
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const videos = await storage.getAllVideos();
  if (videos.length === 0) {
    await storage.createVideo({
      title: "Hip Hop Basics: The Two-Step",
      artist: "Dance Academy",
      description: "Learn the fundamental two-step move essential for all hip hop dance.",
      videoUrl: "https://www.youtube.com/embed/Z6q1wXqT7nU", // Placeholder
      thumbnailUrl: "https://images.unsplash.com/photo-1535525153412-5a42439a210d?q=80&w=2070&auto=format&fit=crop",
      difficulty: "beginner",
      duration: 180,
      category: "hip-hop",
      steps: ["Step right", "Tap left", "Step left", "Tap right"],
    });

    await storage.createVideo({
      title: "Salsa 101: Basic Step",
      artist: "Latin Flow",
      description: "Master the basic forward and backward step of Salsa.",
      videoUrl: "https://www.youtube.com/embed/0uM917-r16U", // Placeholder
      thumbnailUrl: "https://images.unsplash.com/photo-1516641396056-0ce60a85d49f?q=80&w=2070&auto=format&fit=crop",
      difficulty: "beginner",
      duration: 240,
      category: "latin",
      steps: ["Forward left", "Step in place right", "Together left", "Back right", "Step in place left", "Together right"],
    });

    await storage.createVideo({
      title: "Contemporary Flow",
      artist: "Modern Moves",
      description: "Expressive movements focusing on fluidity and emotion.",
      videoUrl: "https://www.youtube.com/embed/z1X_KzXyB6I", // Placeholder
      thumbnailUrl: "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?q=80&w=2070&auto=format&fit=crop",
      difficulty: "intermediate",
      duration: 300,
      category: "contemporary",
      steps: ["Reach up", "Fall forward", "Roll up", "Spin"],
    });
    
    await storage.createVideo({
      title: "K-Pop Routine: Energy",
      artist: "Seoul Star",
      description: "High energy routine inspired by popular K-Pop choreography.",
      videoUrl: "https://www.youtube.com/embed/z1X_KzXyB6I", // Placeholder
      thumbnailUrl: "https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?q=80&w=2070&auto=format&fit=crop",
      difficulty: "advanced",
      duration: 210,
      category: "k-pop",
      steps: ["Jump turn", "Arm wave", "Body roll", "Snap"],
    });
  }
}
