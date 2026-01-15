
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

// User Profiles (extends basic auth user)
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // Links to auth.users.id
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  level: integer("level").default(1),
  xp: integer("xp").default(0),
  avatarConfig: jsonb("avatar_config").$type<{
    hairStyle?: string;
    hairColor?: string;
    topStyle?: string;
    topColor?: string;
    bottomStyle?: string;
    bottomColor?: string;
    shoesStyle?: string;
    skinColor?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dance Videos Library
export const danceVideos = pgTable("dance_videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist"),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  difficulty: text("difficulty").notNull(), // 'beginner', 'intermediate', 'advanced'
  duration: integer("duration").notNull(), // in seconds
  category: text("category").notNull(), // 'hip-hop', 'salsa', 'ballet', etc.
  bpm: integer("bpm"),
  steps: jsonb("steps").$type<string[]>(), // Array of step descriptions
  createdAt: timestamp("created_at").defaultNow(),
});

// Practice Sessions
export const practiceSessions = pgTable("practice_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  videoId: integer("video_id").notNull(),
  score: integer("score"), // 0-100
  accuracy: integer("accuracy"), // 0-100 percentage
  feedback: text("feedback"), // AI generated feedback
  durationPlayed: integer("duration_played"), // seconds practiced
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Favorites
export const userFavorites = pgTable("user_favorites", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  videoId: integer("video_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const danceVideosRelations = relations(danceVideos, ({ many }) => ({
  sessions: many(practiceSessions),
  favorites: many(userFavorites),
}));

export const practiceSessionsRelations = relations(practiceSessions, ({ one }) => ({
  video: one(danceVideos, {
    fields: [practiceSessions.videoId],
    references: [danceVideos.id],
  }),
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  video: one(danceVideos, {
    fields: [userFavorites.videoId],
    references: [danceVideos.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertDanceVideoSchema = createInsertSchema(danceVideos).omit({ 
  id: true, 
  createdAt: true 
});

export const insertPracticeSessionSchema = createInsertSchema(practiceSessions).omit({ 
  id: true, 
  createdAt: true 
});

export const insertUserFavoriteSchema = createInsertSchema(userFavorites).omit({ 
  id: true, 
  createdAt: true 
});

// === EXPLICIT API CONTRACT TYPES ===

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UpdateUserProfile = Partial<InsertUserProfile>;

export type DanceVideo = typeof danceVideos.$inferSelect;
export type InsertDanceVideo = z.infer<typeof insertDanceVideoSchema>;

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type InsertPracticeSession = z.infer<typeof insertPracticeSessionSchema>;
export type UpdatePracticeSession = Partial<InsertPracticeSession>;

export type UserFavorite = typeof userFavorites.$inferSelect;

// Request Types
export type CreateProfileRequest = InsertUserProfile;
export type UpdateProfileRequest = UpdateUserProfile;
export type CreateSessionRequest = InsertPracticeSession;
export type UpdateSessionRequest = UpdatePracticeSession;
export type ToggleFavoriteRequest = { videoId: number };

// Response Types
export type ProfileResponse = UserProfile;
export type VideoResponse = DanceVideo;
export type SessionResponse = PracticeSession & { video?: DanceVideo };
export type FavoriteResponse = UserFavorite & { video?: DanceVideo };

// Special Types
export type MotionAnalysisRequest = {
  landmarks: any[]; // Pose landmarks from MediaPipe/TensorFlow.js
  timestamp: number;
  videoId: number;
};

export type MotionAnalysisResponse = {
  score: number;
  feedback: string;
  correction: string;
};
