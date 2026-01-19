import { useEffect, useRef, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import Webcam from 'react-webcam';

interface PoseCanvasProps {
  onPoseDetected: (pose: poseDetection.Pose) => void;
  width?: number;
  height?: number;
}

export function PoseCanvas({ onPoseDetected, width = 640, height = 480 }: PoseCanvasProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<poseDetection.PoseDetector | null>(null);
  const requestRef = useRef<number>();

  useEffect(() => {
    const loadModel = async () => {
      await tf.ready();
      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.BlazePose,
        {
          runtime: 'tfjs',
          modelType: 'lite', // 'lite', 'full', 'heavy'
        }
      );
      setModel(detector);
    };
    loadModel();
    return () => {
      if (model) {
        model.dispose();
      }
    };
  }, []);

  const detect = async () => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video?.readyState === 4 &&
      model &&
      canvasRef.current
    ) {
      const video = webcamRef.current.video;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      const poses = await model.estimatePoses(video);
      
      if (poses.length > 0 && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          onPoseDetected(poses[0]);
          drawSkeleton(poses[0], ctx);
        }
      }
    }
    requestRef.current = requestAnimationFrame(detect);
  };

  useEffect(() => {
    if (model) {
      requestRef.current = requestAnimationFrame(detect);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [model]);

  const drawSkeleton = (pose: poseDetection.Pose, ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, width, height);
    
    // Draw keypoints
    pose.keypoints.forEach((keypoint) => {
      if ((keypoint.score || 0) > 0.5) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#a855f7'; // purple-500
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw connections (simplified skeleton for Blazepose)
    // Add logic here to draw lines between keypoints based on Blazepose topology
  };

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
