import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useFavorites() {
  return useQuery({
    queryKey: [api.favorites.list.path],
    queryFn: async () => {
      const res = await fetch(api.favorites.list.path, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch favorites");
      return api.favorites.list.responses[200].parse(await res.json());
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (videoId: number) => {
      const url = buildUrl(api.favorites.toggle.path, { videoId });
      const res = await fetch(url, {
        method: api.favorites.toggle.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return api.favorites.toggle.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.favorites.list.path] });
      toast({
        title: data.isFavorite ? "Added to Favorites" : "Removed from Favorites",
        duration: 2000,
      });
    },
  });
}
