import { useAuth } from "@/hooks/use-auth";
import { usePracticeHistory } from "@/hooks/use-practice";
import { useProfile } from "@/hooks/use-profile";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, Calendar, Trophy, Zap } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: history, isLoading } = usePracticeHistory();

  if (!user || !profile) return null; // Or loading state

  // Calculate stats
  const totalSessions = history?.length || 0;
  const totalDuration = history?.reduce((acc, sess) => acc + (sess.durationPlayed || 0), 0) || 0;
  const avgAccuracy = history?.length 
    ? Math.round(history.reduce((acc, sess) => acc + (sess.accuracy || 0), 0) / history.length) 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back, {profile.displayName}</h1>
            <p className="text-muted-foreground">Ready to break a sweat today?</p>
          </div>
          <div className="bg-card border border-white/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Level</div>
              <div className="text-2xl font-black text-primary">{profile.level}</div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total XP</div>
              <div className="text-2xl font-black text-accent">{profile.xp}</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            icon={Zap} 
            label="Total Sessions" 
            value={totalSessions} 
            color="text-yellow-400" 
            bg="bg-yellow-400/10" 
          />
          <StatCard 
            icon={Clock} 
            label="Time Danced" 
            value={`${Math.round(totalDuration / 60)}m`} 
            color="text-blue-400" 
            bg="bg-blue-400/10" 
          />
          <StatCard 
            icon={Activity} 
            label="Avg Accuracy" 
            value={`${avgAccuracy}%`} 
            color="text-green-400" 
            bg="bg-green-400/10" 
          />
          <StatCard 
            icon={Trophy} 
            label="Streak" 
            value="3 Days" 
            color="text-orange-400" 
            bg="bg-orange-400/10" 
          />
        </div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="md:col-span-2 glass-card">
            <CardHeader>
              <CardTitle>Recent Practice</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
                </div>
              ) : history?.length ? (
                <div className="space-y-4">
                  {history.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-lg bg-black/20 overflow-hidden">
                          {session.video?.thumbnailUrl && (
                            <img src={session.video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{session.video?.title || "Unknown Video"}</h4>
                          <p className="text-xs text-muted-foreground">{new Date(session.createdAt!).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Score</div>
                          <div className="font-mono font-bold text-primary">{session.score}</div>
                        </div>
                        <div className="w-16">
                           <div className="text-xs text-muted-foreground mb-1 text-right">{session.accuracy}%</div>
                           <Progress value={session.accuracy || 0} className="h-1.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No practice sessions yet. Get moving!
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Weekly Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative size-40 flex items-center justify-center">
                  <svg className="size-full rotate-[-90deg]">
                    <circle cx="80" cy="80" r="70" className="stroke-muted fill-none stroke-[8]" />
                    <circle cx="80" cy="80" r="70" className="stroke-primary fill-none stroke-[8]" strokeDasharray="440" strokeDashoffset={440 - (440 * 0.65)} strokeLinecap="round" />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-black">65%</span>
                    <span className="text-xs text-muted-foreground uppercase font-bold">Complete</span>
                  </div>
                </div>
                <p className="mt-6 text-center text-muted-foreground">
                  You've danced for <span className="text-white font-bold">45 mins</span> this week. Keep it up to reach your 60 min goal!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: any) {
  return (
    <div className="bg-card border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:border-white/10 transition-colors">
      <div className={`size-10 rounded-full ${bg} ${color} flex items-center justify-center mb-3`}>
        <Icon className="size-5" />
      </div>
      <div className="text-sm text-muted-foreground font-medium mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

import { Clock } from "lucide-react";
