import { useEffect, useState, useRef } from "react";
import { useRoute } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { useVideo } from "@/hooks/use-videos";
import { useStartPractice, useFinishPractice, useCoachingAnalysis } from "@/hooks/use-practice";
import { PoseCanvas } from "@/components/practice/PoseCanvas";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RefreshCw, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import * as poseDetection from '@tensorflow-models/pose-detection';

export default function Practice() {
  const [, params] = useRoute("/practice/:id");
  const videoId = parseInt(params?.id || "0");
  
  const { data: video } = useVideo(videoId);
  const { mutate: startPractice } = useStartPractice();
  const { mutate: finishPractice } = useFinishPractice();
  const { mutate: analyzeMotion } = useCoachingAnalysis();
  const [extractedMoves, setExtractedMoves] = useState<string[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("Get ready to move!");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (video) {
      // AI "Choosing" moves based on the video
      analyzeMotion({
        videoContext: `User selecting ${video.title} for AI training. Extract key dance moves.`,
        userPerformance: "Initial selection",
        // @ts-ignore - added to support the new python logic
        requestedMoves: true
      }, {
        onSuccess: (data: any) => {
          if (data.moves) setExtractedMoves(data.moves);
        }
      });
    }
  }, [video, analyzeMotion]);

  if (!video) return null;

  useEffect(() => {
    if (videoId && !sessionId) {
      startPractice(videoId, {
        onSuccess: (data) => {
          setSessionId(data.id);
          setStartTime(Date.now());
        }
      });
    }
  }, [videoId, sessionId, startPractice]);

  const handlePoseDetected = (pose: poseDetection.Pose) => {
    if (!isPlaying) return;

    // SCORING LOGIC
    const visibleKeypoints = pose.keypoints.filter(kp => (kp.score || 0) > 0.5).length;
    const accuracy = Math.min(100, Math.round((visibleKeypoints / 17) * 100));
    
    setScore(prev => Math.max(prev, accuracy));

    // AI Feedback Trigger - significantly more frequent for "synchronization" feel
    if (Math.random() > 0.90) {
       analyzeMotion({
         videoContext: `User practicing ${video?.title}`,
         userPerformance: `Accuracy score ${accuracy}% with ${visibleKeypoints} visible joints. The user is attempting to synchronize with the moves.`
       }, {
         onSuccess: (data) => {
           if (data.feedback) setFeedback(data.feedback);
         }
       });
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleFinish = () => {
    if (sessionId) {
      const durationPlayed = Math.round((Date.now() - startTime) / 1000);
      finishPractice({
        sessionId,
        score: score * 100, // mock xp calculation
        accuracy: score,
        durationPlayed,
        feedback
      });
    }
  };

  if (!video) return null;

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/10 bg-card z-10">
        <div className="flex items-center gap-4">
          <Link href="/library">
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-white">{video.title}</h1>
            <div className="text-xs text-muted-foreground">Practice Mode</div>
          </div>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Score</div>
            <div className="text-2xl font-black text-primary font-mono">{score}</div>
          </div>
          <Button 
            variant="destructive" 
            onClick={handleFinish}
            className="rounded-full px-6"
          >
            End Session
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex relative">
        {/* Reference Video */}
        <div className="flex-1 bg-black relative flex items-center justify-center border-r border-white/10">
          <iframe
            src={video.videoUrl.replace("watch?v=", "embed/") + "?autoplay=1&mute=1&enablejsapi=1"}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* User Camera */}
        <div className="flex-1 bg-black relative flex items-center justify-center">
          <PoseCanvas 
            onPoseDetected={handlePoseDetected}
            width={640}
            height={480}
          />
          
          {/* AI Coach Overlay */}
          <div className="absolute bottom-8 left-8 right-8">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 animate-in slide-in-from-bottom-4">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                  <div className="size-2 bg-white rounded-full animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">AI Coach</div>
                  <p className="text-white text-sm font-medium">{feedback}</p>
                  {extractedMoves.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {extractedMoves.map(move => (
                        <span key={move} className="text-[10px] bg-primary/20 text-primary-foreground px-2 py-0.5 rounded-full border border-primary/30">
                          {move}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Controls Footer */}
      <footer className="h-20 bg-card border-t border-white/10 px-6 flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full" onClick={() => {
           if (videoRef.current) { videoRef.current.currentTime = 0; }
        }}>
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button 
          size="icon" 
          className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 ml-1 fill-current" />}
        </Button>
      </footer>
    </div>
  );
}
