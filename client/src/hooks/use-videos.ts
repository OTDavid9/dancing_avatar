import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type VideoFilters = z.infer<NonNullable<typeof api.videos.list.input>>;

export function useVideos(filters?: VideoFilters) {
  return useQuery({
    queryKey: [api.videos.list.path, filters],
    queryFn: async () => {
      // Build query string manually or via helper
      const params = new URLSearchParams();
      if (filters?.category) params.append("category", filters.category);
      if (filters?.difficulty) params.append("difficulty", filters.difficulty);
      if (filters?.search) params.append("search", filters.search);

      const url = `${api.videos.list.path}?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      
      if (!res.ok) throw new Error("Failed to fetch videos");
      return api.videos.list.responses[200].parse(await res.json());
    },
  });
}

export function useVideo(id: number) {
  return useQuery({
    queryKey: [api.videos.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.videos.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      
      if (res.status === 404) throw new Error("Video not found");
      if (!res.ok) throw new Error("Failed to fetch video");
      
      return api.videos.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}
