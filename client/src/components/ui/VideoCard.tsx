import { Play, Heart, Clock, BarChart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "./button";
import type { DanceVideo } from "@shared/schema";
import { useToggleFavorite, useFavorites } from "@/hooks/use-favorites";

interface VideoCardProps {
  video: DanceVideo;
}

export function VideoCard({ video }: VideoCardProps) {
  const { mutate: toggleFavorite } = useToggleFavorite();
  const { data: favorites } = useFavorites();
  const isFavorite = favorites?.some(f => f.videoId === video.id);

  const difficultyColors = {
    beginner: "bg-green-500/20 text-green-400 border-green-500/30",
    intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    advanced: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <div className="group relative rounded-2xl bg-card border border-white/5 overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10">
      {/* Thumbnail */}
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={video.thumbnailUrl || "https://images.unsplash.com/photo-1545959828-4b779a52a32c?w=800&q=80"} 
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm">
          <Link href={`/practice/${video.id}`}>
            <Button size="icon" className="h-14 w-14 rounded-full bg-primary text-white shadow-xl hover:scale-110 transition-transform duration-300">
              <Play className="h-6 w-6 ml-1 fill-current" />
            </Button>
          </Link>
        </div>
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={`px-2 py-1 rounded-md text-xs font-medium uppercase tracking-wider border backdrop-blur-md ${difficultyColors[video.difficulty as keyof typeof difficultyColors]}`}>
            {video.difficulty}
          </span>
        </div>
        
        <button 
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(video.id);
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 transition-colors"
        >
          <Heart className={`h-4 w-4 transition-colors ${isFavorite ? "fill-accent text-accent" : "text-white"}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors line-clamp-1">{video.title}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-1">{video.artist}</p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-white/5 pt-4">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BarChart className="h-3.5 w-3.5" />
            <span>{video.bpm} BPM</span>
          </div>
          <div className="uppercase tracking-wider font-medium text-white/60">
            {video.category}
          </div>
        </div>
      </div>
    </div>
  );
}
