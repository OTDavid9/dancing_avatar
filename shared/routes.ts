
import { z } from 'zod';
import { 
  insertUserProfileSchema, 
  insertPracticeSessionSchema,
  userProfiles,
  danceVideos,
  practiceSessions,
  userFavorites
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  profile: {
    get: {
      method: 'GET' as const,
      path: '/api/profile',
      responses: {
        200: z.custom<typeof userProfiles.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/profile',
      input: insertUserProfileSchema.partial(),
      responses: {
        200: z.custom<typeof userProfiles.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  videos: {
    list: {
      method: 'GET' as const,
      path: '/api/videos',
      input: z.object({
        category: z.string().optional(),
        difficulty: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof danceVideos.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/videos/:id',
      responses: {
        200: z.custom<typeof danceVideos.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  practice: {
    start: {
      method: 'POST' as const,
      path: '/api/practice/start',
      input: z.object({
        videoId: z.number(),
      }),
      responses: {
        201: z.custom<typeof practiceSessions.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    finish: {
      method: 'POST' as const,
      path: '/api/practice/:id/finish',
      input: z.object({
        score: z.number(),
        accuracy: z.number(),
        durationPlayed: z.number(),
        feedback: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof practiceSessions.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    history: {
      method: 'GET' as const,
      path: '/api/practice/history',
      responses: {
        200: z.array(z.custom<typeof practiceSessions.$inferSelect & { video: typeof danceVideos.$inferSelect }>()),
        401: errorSchemas.unauthorized,
      },
    },
  },
  coaching: {
    analyze: {
      method: 'POST' as const,
      path: '/api/coaching/analyze',
      input: z.object({
        videoContext: z.string(), // Description of what should be happening
        userPerformance: z.string(), // Description of what user did (derived from pose data)
      }),
      responses: {
        200: z.object({
          feedback: z.string(),
          tips: z.array(z.string()),
          encouragement: z.string(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  favorites: {
    list: {
      method: 'GET' as const,
      path: '/api/favorites',
      responses: {
        200: z.array(z.custom<typeof userFavorites.$inferSelect & { video: typeof danceVideos.$inferSelect }>()),
        401: errorSchemas.unauthorized,
      },
    },
    toggle: {
      method: 'POST' as const,
      path: '/api/favorites/:videoId',
      responses: {
        200: z.object({ isFavorite: z.boolean() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
};

// ============================================
// HELPERS
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
