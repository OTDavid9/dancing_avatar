import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shirt, Smile, Palette } from "lucide-react";

// Mock Avatar Component (would be replaced by SVG composer)
const AvatarPreview = ({ config }: { config: any }) => (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-blue-500/20 to-purple-500/20 rounded-full border-4 border-white/10 relative overflow-hidden">
    <div className="relative z-10 text-9xl">
      {/* Simple emoji representation for prototype */}
      🕺
    </div>
    {/* Dynamic Background */}
    <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
  </div>
);

export default function AvatarPage() {
  const { data: profile, isLoading } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  
  const [config, setConfig] = useState(profile?.avatarConfig || {});

  const handleSave = () => {
    updateProfile({ avatarConfig: config });
  };

  if (isLoading || !profile) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          
          {/* Preview Section */}
          <div className="sticky top-24">
             <div className="aspect-square w-full max-w-md mx-auto rounded-full p-4 border-2 border-dashed border-white/10 mb-8">
               <AvatarPreview config={config} />
             </div>
             <div className="text-center">
               <h2 className="text-2xl font-bold mb-2">{profile.displayName}</h2>
               <p className="text-muted-foreground">Level {profile.level} Dancer</p>
             </div>
          </div>

          {/* Controls Section */}
          <div className="bg-card border border-white/5 rounded-2xl p-6">
            <h1 className="text-2xl font-bold mb-6">Customize Look</h1>
            
            <Tabs defaultValue="style">
              <TabsList className="w-full mb-8 bg-white/5">
                <TabsTrigger value="style" className="flex-1">
                  <Smile className="mr-2 h-4 w-4" /> Style
                </TabsTrigger>
                <TabsTrigger value="outfit" className="flex-1">
                  <Shirt className="mr-2 h-4 w-4" /> Outfit
                </TabsTrigger>
                <TabsTrigger value="colors" className="flex-1">
                  <Palette className="mr-2 h-4 w-4" /> Colors
                </TabsTrigger>
              </TabsList>

              <TabsContent value="style" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Hair Style</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {['Short', 'Long', 'Bun', 'Ponytail', 'Buzz', 'Afro'].map((style) => (
                      <button 
                        key={style}
                        onClick={() => setConfig({ ...config, hairStyle: style })}
                        className={`p-4 rounded-xl border transition-all ${config.hairStyle === style ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 hover:border-white/30'}`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="outfit" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Top</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {['T-Shirt', 'Tank', 'Hoodie'].map((style) => (
                      <button 
                        key={style}
                        onClick={() => setConfig({ ...config, topStyle: style })}
                        className={`p-4 rounded-xl border transition-all ${config.topStyle === style ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 hover:border-white/30'}`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
              <Button onClick={handleSave} disabled={isPending} className="w-full md:w-auto">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
