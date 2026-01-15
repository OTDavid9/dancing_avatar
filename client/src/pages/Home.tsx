import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { ArrowRight, Sparkles, Activity, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-mesh flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col justify-center relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] pointer-events-none" />

        <div className="container mx-auto px-4 py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-sm font-medium text-primary animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <Sparkles className="size-4" />
              <span>AI-Powered Dance Coaching</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
              Master Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">
                Rhythm & Flow
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              Learn to dance with real-time AI feedback. Practice popular moves, track your progress, and level up your avatar.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <Link href={user ? "/library" : "/api/login"}>
                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-white text-black hover:bg-white/90 shadow-xl shadow-white/10 hover:shadow-white/20 transition-all hover:-translate-y-1">
                  Start Dancing Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/library">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white transition-all hover:-translate-y-1">
                  Browse Library
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="container mx-auto px-4 pb-24">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Activity,
                title: "Real-time Feedback",
                desc: "Our AI analyzes your moves instantly via camera and gives you specific corrections."
              },
              {
                icon: Trophy,
                title: "Gamified Learning",
                desc: "Earn XP, unlock avatar items, and compete on leaderboards as you improve."
              },
              {
                icon: Sparkles,
                title: "Personalized Coaching",
                desc: "Get tailored tips and encouragement based on your unique dance style."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl bg-card/40 backdrop-blur-md border border-white/5 hover:border-primary/30 transition-all duration-300 hover:transform hover:-translate-y-2 group">
                <div className="size-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="size-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
