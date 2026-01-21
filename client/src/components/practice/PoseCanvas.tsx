import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Holistic } from '@mediapipe/holistic';

interface PoseCanvasProps {
  onPoseDetected: (pose: any) => void;
  width?: number;
  height?: number;
}

export function PoseCanvas({ onPoseDetected, width = 640, height = 480 }: PoseCanvasProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [holistic, setHolistic] = useState<any>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    let holisticInstance: any = null;
    
    // Use dynamic import or global access for Holistic to avoid SSR issues if any
    const setupHolistic = async () => {
      holisticInstance = new Holistic({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
        },
      });

      holisticInstance.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        refineFaceLandmarks: true,
      });

      holisticInstance.onResults((results: any) => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        drawResults(results, ctx);
        onPoseDetected(results);
      });

      setHolistic(holisticInstance);
    };

    setupHolistic();

    return () => {
      if (holisticInstance) {
        holisticInstance.close();
      }
    };
  }, []);

  const drawResults = (results: any, ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Draw Pose
    if (results.poseLandmarks) {
      results.poseLandmarks.forEach((landmark: any) => {
        ctx.beginPath();
        ctx.arc(landmark.x * width, landmark.y * height, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#a855f7';
        ctx.fill();
      });
    }

    // Draw Hands
    if (results.leftHandLandmarks) {
      results.leftHandLandmarks.forEach((landmark: any) => {
        ctx.beginPath();
        ctx.arc(landmark.x * width, landmark.y * height, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
      });
    }
    if (results.rightHandLandmarks) {
      results.rightHandLandmarks.forEach((landmark: any) => {
        ctx.beginPath();
        ctx.arc(landmark.x * width, landmark.y * height, 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
      });
    }

    ctx.restore();
  };

  useEffect(() => {
    const detect = async () => {
      if (
        webcamRef.current?.video?.readyState === 4 &&
        holistic
      ) {
        const video = webcamRef.current.video;
        await holistic.send({ image: video });
      }
      requestRef.current = requestAnimationFrame(detect);
    };

    requestRef.current = requestAnimationFrame(detect);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [holistic]);

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
      <Webcam
        ref={webcamRef}
        mirrored
        className="absolute inset-0 w-full h-full object-cover"
        width={width}
        height={height}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover z-10"
        width={width}
        height={height}
      />
    </div>
  );
}
