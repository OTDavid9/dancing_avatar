import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useVideos } from "@/hooks/use-videos";
import { VideoCard } from "@/components/ui/VideoCard";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Library() {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<string | undefined>();
  const [category, setCategory] = useState<string | undefined>();
  const [isOpen, setIsOpen] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  
  const { data: videos, isLoading } = useVideos({ search, difficulty, category });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const addVideoMutation = useMutation({
    mutationFn: async (data: { title: string, videoUrl: string }) => {
      const res = await apiRequest("POST", "/api/videos", {
        ...data,
        artist: "User Upload",
        description: "AI-Generated training session",
        difficulty: "beginner",
        category: "custom",
        duration: 180,
        thumbnailUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2070&auto=format&fit=crop"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      setIsOpen(false);
      setNewVideoUrl("");
      setNewVideoTitle("");
      toast({ title: "Video added", description: "AI is ready to analyze your video." });
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dance Library</h1>
            <p className="text-muted-foreground">Browse our collection or add your own for AI training.</p>
          </div>
          
          <div className="flex gap-4 w-full md:w-auto">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full gap-2">
                  <Plus className="h-4 w-4" />
                  Add Video
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-card border-white/10">
                <DialogHeader>
                  <DialogTitle>Add Training Video</DialogTitle>
                  <DialogDescription>
                    Paste a YouTube URL and our AI will extract dance moves for you.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input 
                      id="title" 
                      placeholder="My Dance Routine" 
                      value={newVideoTitle}
                      onChange={(e) => setNewVideoTitle(e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="url">YouTube URL</Label>
                    <Input 
                      id="url" 
                      placeholder="https://www.youtube.com/watch?v=..." 
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => addVideoMutation.mutate({ title: newVideoTitle, videoUrl: newVideoUrl })}
                    disabled={addVideoMutation.isPending || !newVideoUrl || !newVideoTitle}
                  >
                    {addVideoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add & Analyze
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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
            <Button variant="ghost" onClick={() => { setSearch(""); setDifficulty(undefined); setCategory(undefined); }} className="text-primary mt-2">
              Clear all filters
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
