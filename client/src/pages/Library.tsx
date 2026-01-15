import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useVideos } from "@/hooks/use-videos";
import { VideoCard } from "@/components/ui/VideoCard";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Library() {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  
  const { data: videos, isLoading } = useVideos({ search, difficulty, category });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dance Library</h1>
            <p className="text-muted-foreground">Browse our collection and start learning today.</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search songs, styles, artists..." 
                className="pl-10 bg-white/5 border-white/10 rounded-full focus:bg-white/10 transition-colors"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full border-white/10 bg-white/5 gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-white/10">
                <DropdownMenuLabel>Difficulty</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked={difficulty === 'beginner'} onCheckedChange={(c) => setDifficulty(c ? 'beginner' : undefined)}>Beginner</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={difficulty === 'intermediate'} onCheckedChange={(c) => setDifficulty(c ? 'intermediate' : undefined)}>Intermediate</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={difficulty === 'advanced'} onCheckedChange={(c) => setDifficulty(c ? 'advanced' : undefined)}>Advanced</DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Category</DropdownMenuLabel>
                <DropdownMenuCheckboxItem checked={category === 'hip-hop'} onCheckedChange={(c) => setCategory(c ? 'hip-hop' : undefined)}>Hip Hop</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={category === 'k-pop'} onCheckedChange={(c) => setCategory(c ? 'k-pop' : undefined)}>K-Pop</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={category === 'contemporary'} onCheckedChange={(c) => setCategory(c ? 'contemporary' : undefined)}>Contemporary</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : videos?.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-500">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-xl text-muted-foreground">No videos found matching your filters.</p>
            <Button variant="link" onClick={() => { setSearch(""); setDifficulty(undefined); setCategory(undefined); }} className="text-primary mt-2">
              Clear all filters
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
