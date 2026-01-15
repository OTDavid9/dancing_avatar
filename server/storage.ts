
import { db } from "./db";
import { 
  userProfiles, danceVideos, practiceSessions, userFavorites,
  type UserProfile, type InsertUserProfile, type UpdateUserProfile,
  type DanceVideo, type InsertDanceVideo,
  type PracticeSession, type InsertPracticeSession, type UpdatePracticeSession,
  type UserFavorite
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User Profile
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: UpdateUserProfile): Promise<UserProfile>;

  // Dance Videos
  getAllVideos(): Promise<DanceVideo[]>;
  getVideo(id: number): Promise<DanceVideo | undefined>;
  getVideosByCategory(category: string): Promise<DanceVideo[]>;
  createVideo(video: InsertDanceVideo): Promise<DanceVideo>;

  // Practice Sessions
  createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession>;
  updatePracticeSession(id: number, updates: UpdatePracticeSession): Promise<PracticeSession>;
  getUserPracticeHistory(userId: string): Promise<(PracticeSession & { video: DanceVideo })[]>;

  // Favorites
  getUserFavorites(userId: string): Promise<(UserFavorite & { video: DanceVideo })[]>;
  toggleFavorite(userId: string, videoId: number): Promise<boolean>; // returns true if favored, false if unfavored
}

export class DatabaseStorage implements IStorage {
  // User Profile
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [newProfile] = await db.insert(userProfiles).values(profile).returning();
    return newProfile;
  }

  async updateUserProfile(userId: string, updates: UpdateUserProfile): Promise<UserProfile> {
    const [updated] = await db.update(userProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  }

  // Dance Videos
  async getAllVideos(): Promise<DanceVideo[]> {
    return await db.select().from(danceVideos).orderBy(desc(danceVideos.createdAt));
  }

  async getVideo(id: number): Promise<DanceVideo | undefined> {
    const [video] = await db.select().from(danceVideos).where(eq(danceVideos.id, id));
    return video;
  }

  async getVideosByCategory(category: string): Promise<DanceVideo[]> {
    return await db.select().from(danceVideos).where(eq(danceVideos.category, category));
  }

  async createVideo(video: InsertDanceVideo): Promise<DanceVideo> {
    const [newVideo] = await db.insert(danceVideos).values(video).returning();
    return newVideo;
  }

  // Practice Sessions
  async createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession> {
    const [newSession] = await db.insert(practiceSessions).values(session).returning();
    return newSession;
  }

  async updatePracticeSession(id: number, updates: UpdatePracticeSession): Promise<PracticeSession> {
    const [updated] = await db.update(practiceSessions)
      .set(updates)
      .where(eq(practiceSessions.id, id))
      .returning();
    return updated;
  }

  async getUserPracticeHistory(userId: string): Promise<(PracticeSession & { video: DanceVideo })[]> {
    const rows = await db.select({
      session: practiceSessions,
      video: danceVideos
    })
    .from(practiceSessions)
    .innerJoin(danceVideos, eq(practiceSessions.videoId, danceVideos.id))
    .where(eq(practiceSessions.userId, userId))
    .orderBy(desc(practiceSessions.createdAt));

    return rows.map(row => ({ ...row.session, video: row.video }));
  }

  // Favorites
  async getUserFavorites(userId: string): Promise<(UserFavorite & { video: DanceVideo })[]> {
    const rows = await db.select({
      favorite: userFavorites,
      video: danceVideos
    })
    .from(userFavorites)
    .innerJoin(danceVideos, eq(userFavorites.videoId, danceVideos.id))
    .where(eq(userFavorites.userId, userId));

    return rows.map(row => ({ ...row.favorite, video: row.video }));
  }

  async toggleFavorite(userId: string, videoId: number): Promise<boolean> {
    const [existing] = await db.select()
      .from(userFavorites)
      .where(and(eq(userFavorites.userId, userId), eq(userFavorites.videoId, videoId)));

    if (existing) {
      await db.delete(userFavorites)
        .where(eq(userFavorites.id, existing.id));
      return false;
    } else {
      await db.insert(userFavorites)
        .values({ userId, videoId });
      return true;
    }
  }
}

export const storage = new DatabaseStorage();
