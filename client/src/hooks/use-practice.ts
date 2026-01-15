import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useStartPractice() {
  return useMutation({
    mutationFn: async (videoId: number) => {
      const res = await fetch(api.practice.start.path, {
        method: api.practice.start.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to start session");
      return api.practice.start.responses[201].parse(await res.json());
    },
  });
}

export function useFinishPractice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId, ...data }: { sessionId: number; score: number; accuracy: number; durationPlayed: number; feedback?: string }) => {
      const url = buildUrl(api.practice.finish.path, { id: sessionId });
      const res = await fetch(url, {
        method: api.practice.finish.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to finish session");
      return api.practice.finish.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.practice.history.path] });
      toast({
        title: "Practice Complete!",
        description: "Your session has been saved.",
      });
    },
  });
}

export function usePracticeHistory() {
  return useQuery({
    queryKey: [api.practice.history.path],
    queryFn: async () => {
      const res = await fetch(api.practice.history.path, { credentials: "include" });
      if (!res.ok) {
         if (res.status === 401) return null;
         throw new Error("Failed to fetch history");
      }
      return api.practice.history.responses[200].parse(await res.json());
    },
  });
}

export function useCoachingAnalysis() {
  return useMutation({
    mutationFn: async (data: { videoContext: string; userPerformance: string }) => {
      const res = await fetch(api.coaching.analyze.path, {
        method: api.coaching.analyze.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to analyze motion");
      return api.coaching.analyze.responses[200].parse(await res.json());
    },
  });
}
