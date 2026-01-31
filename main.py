import os
import json
import math
import asyncio
import random
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from pydantic import BaseModel
import uvicorn

# Initialize FastAPI app
app = FastAPI(
    title="MJ Dance Avatar",
    description="Real-time Michael Jackson avatar dance with music synchronization",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/models", StaticFiles(directory="models"), name="models")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Create directories if they don't exist
Path("static").mkdir(exist_ok=True)
Path("templates").mkdir(exist_ok=True)
Path("music").mkdir(exist_ok=True)
Path("models").mkdir(exist_ok=True)

# Global state
class DanceState:
    def __init__(self):
        self.connected_clients: List[WebSocket] = []
        self.current_music: Optional[str] = None
        self.music_playing: bool = False
        self.current_time: float = 0.0
        self.last_pose_time: float = 0.0
        self.is_paused: bool = False
        self.pause_time: float = 0.0
        self.avatar_loaded: bool = False

state = DanceState()

# Data models
class MusicTrack(BaseModel):
    id: str
    name: str
    path: str
    duration: Optional[float] = None

class DancePose(BaseModel):
    timestamp: float
    joints: Dict[str, List[float]]

# MJ Dance move definitions for humanoid skeleton (compatible with GLTF)
MJ_DANCE_MOVES = {
    "moonwalk": {
        "description": "Michael's iconic backward slide",
        "intensity": 0.8,
        "speed": 2.0
    },
    "crotch_grab": {
        "description": "The famous grab move",
        "intensity": 0.9,
        "speed": 1.5
    },
    "spin": {
        "description": "360-degree spin",
        "intensity": 1.0,
        "speed": 0.5
    },
    "kick": {
        "description": "High kick move",
        "intensity": 0.7,
        "speed": 2.5
    },
    "lean": {
        "description": "Anti-gravity lean",
        "intensity": 0.6,
        "speed": 1.0
    },
    "arm_wave": {
        "description": "Smooth arm wave",
        "intensity": 0.5,
        "speed": 3.0
    }
}

def generate_mj_pose(move_name: str, timestamp: float, intensity: float = 1.0) -> Dict[str, List[float]]:
    """Generate MJ-style dance pose for GLTF humanoid skeleton"""
    t = timestamp % 2.0  # Loop every 2 seconds
    phase = t * math.pi * 2
    speed = MJ_DANCE_MOVES[move_name]["speed"] if move_name in MJ_DANCE_MOVES else 1.0
    
    # GLTF humanoid skeleton joint names (typical)
    base_pose = {
        # Core body
        "hips": [0, 0, 0, 0, 0, 0],  # position x,y,z, rotation x,y,z
        "spine": [0, 0, 0, 0, 0, 0],
        "chest": [0, 0, 0, 0, 0, 0],
        "upperChest": [0, 0, 0, 0, 0, 0],
        "neck": [0, 0, 0, 0, 0, 0],
        "head": [0, 0, 0, 0, 0, 0],
        
        # Left arm
        "leftShoulder": [0, 0, 0, 0, 0, 0],
        "leftUpperArm": [0, 0, 0, 0, 0, 0],
        "leftLowerArm": [0, 0, 0, 0, 0, 0],
        "leftHand": [0, 0, 0, 0, 0, 0],
        
        # Right arm
        "rightShoulder": [0, 0, 0, 0, 0, 0],
        "rightUpperArm": [0, 0, 0, 0, 0, 0],
        "rightLowerArm": [0, 0, 0, 0, 0, 0],
        "rightHand": [0, 0, 0, 0, 0, 0],
        
        # Left leg
        "leftUpperLeg": [0, 0, 0, 0, 0, 0],
        "leftLowerLeg": [0, 0, 0, 0, 0, 0],
        "leftFoot": [0, 0, 0, 0, 0, 0],
        "leftToes": [0, 0, 0, 0, 0, 0],
        
        # Right leg
        "rightUpperLeg": [0, 0, 0, 0, 0, 0],
        "rightLowerLeg": [0, 0, 0, 0, 0, 0],
        "rightFoot": [0, 0, 0, 0, 0, 0],
        "rightToes": [0, 0, 0, 0, 0, 0]
    }
    
    # Apply MJ dance move
    if move_name == "moonwalk":
        # Moonwalk: alternating leg slides
        slide = math.sin(phase * speed) * 0.5 * intensity
        base_pose["hips"][2] = slide * 0.2  # Move hips back/forward
        base_pose["leftUpperLeg"][1] = math.sin(phase * speed + math.pi) * 45 * intensity  # Hip rotation
        base_pose["rightUpperLeg"][1] = math.sin(phase * speed) * 45 * intensity
        base_pose["leftLowerLeg"][1] = math.sin(phase * speed + math.pi) * 30 * intensity  # Knee bend
        base_pose["rightLowerLeg"][1] = math.sin(phase * speed) * 30 * intensity
        base_pose["leftFoot"][0] = math.sin(phase * speed + math.pi) * 25 * intensity  # Ankle tilt
        base_pose["rightFoot"][0] = math.sin(phase * speed) * 25 * intensity
        
    elif move_name == "crotch_grab":
        # Crotch grab: torso movement
        grab = math.sin(phase * speed) * 0.8 * intensity
        base_pose["hips"][0] = grab * 15  # Hip forward/back
        base_pose["spine"][0] = -grab * 10  # Spine bend
        base_pose["leftUpperArm"][0] = -grab * 60  # Arm forward
        base_pose["rightUpperArm"][0] = -grab * 60
        base_pose["leftLowerArm"][1] = grab * 90  # Elbow bend
        base_pose["rightLowerArm"][1] = grab * 90
        
    elif move_name == "spin":
        # Spin: rotating torso
        spin_angle = (t * 180 * speed) % 360
        base_pose["hips"][4] = spin_angle  # Rotate around Y axis
        base_pose["spine"][4] = spin_angle * 0.7
        base_pose["chest"][4] = spin_angle * 0.5
        
    elif move_name == "kick":
        # Kick: high leg extension
        kick = max(0, math.sin(phase * speed * 2)) * intensity
        base_pose["rightUpperLeg"][0] = kick * 60  # Lift leg
        base_pose["rightLowerLeg"][1] = -kick * 45  # Extend knee
        base_pose["rightFoot"][1] = kick * 30  # Point toe
        base_pose["hips"][0] = -kick * 10  # Lean back
        
    elif move_name == "lean":
        # Lean: anti-gravity style
        lean = math.sin(phase * speed) * 0.7 * intensity
        base_pose["hips"][0] = lean * 25  # Lean forward/back
        base_pose["spine"][0] = lean * 15
        base_pose["leftFoot"][0] = -lean * 20  # Ankle adjustment
        base_pose["rightFoot"][0] = -lean * 20
        base_pose["neck"][0] = lean * 10  # Head tilt
        
    elif move_name == "arm_wave":
        # Arm wave: smooth wave motion
        wave_offset = phase * speed
        base_pose["leftUpperArm"][2] = math.sin(wave_offset) * 45 * intensity  # Shoulder rotation
        base_pose["rightUpperArm"][2] = math.sin(wave_offset + math.pi) * 45 * intensity
        base_pose["leftLowerArm"][1] = math.sin(wave_offset + 0.5) * 60 * intensity  # Elbow
        base_pose["rightLowerArm"][1] = math.sin(wave_offset + math.pi + 0.5) * 60 * intensity
        base_pose["leftHand"][2] = math.sin(wave_offset + 1.0) * 30 * intensity  # Wrist
        base_pose["rightHand"][2] = math.sin(wave_offset + math.pi + 1.0) * 30 * intensity
    
    return base_pose

def generate_dance_sequence(duration: float = 300.0) -> List[DancePose]:
    """Generate a sequence of MJ dance poses"""
    poses = []
    timestamp = 0.0
    frame_rate = 30.0  # 30 FPS
    frame_interval = 1.0 / frame_rate
    
    move_cycle = list(MJ_DANCE_MOVES.keys())
    move_duration = 2.0  # Each move lasts 2 seconds
    
    while timestamp < duration:
        move_index = int((timestamp / move_duration)) % len(move_cycle)
        move_name = move_cycle[move_index]
        
        # Generate pose for current move
        joints = generate_mj_pose(move_name, timestamp, MJ_DANCE_MOVES[move_name]["intensity"])
        
        poses.append(DancePose(
            timestamp=timestamp,
            joints=joints
        ))
        
        timestamp += frame_interval
    
    return poses

# Pre-generate dance poses
DANCE_POSES = generate_dance_sequence(600)  # 10 minutes of dancing

def get_idle_pose() -> DancePose:
    """Get neutral/standing pose"""
    return DancePose(
        timestamp=0.0,
        joints={
            "hips": [0, 0, 0, 0, 0, 0],
            "spine": [0, 0, 0, 0, 0, 0],
            "chest": [0, 0, 0, 0, 0, 0],
            "upperChest": [0, 0, 0, 0, 0, 0],
            "neck": [0, 0, 0, 0, 0, 0],
            "head": [0, 0, 0, 0, 0, 0],
            "leftShoulder": [0, 0, 0, 0, 0, 0],
            "leftUpperArm": [0, 0, 0, 0, 0, 0],
            "leftLowerArm": [0, 0, 0, 0, 0, 0],
            "leftHand": [0, 0, 0, 0, 0, 0],
            "rightShoulder": [0, 0, 0, 0, 0, 0],
            "rightUpperArm": [0, 0, 0, 0, 0, 0],
            "rightLowerArm": [0, 0, 0, 0, 0, 0],
            "rightHand": [0, 0, 0, 0, 0, 0],
            "leftUpperLeg": [0, 0, 0, 0, 0, 0],
            "leftLowerLeg": [0, 0, 0, 0, 0, 0],
            "leftFoot": [0, 0, 0, 0, 0, 0],
            "leftToes": [0, 0, 0, 0, 0, 0],
            "rightUpperLeg": [0, 0, 0, 0, 0, 0],
            "rightLowerLeg": [0, 0, 0, 0, 0, 0],
            "rightFoot": [0, 0, 0, 0, 0, 0],
            "rightToes": [0, 0, 0, 0, 0, 0]
        }
    )

def get_pose_at_time(timestamp: float) -> DancePose:
    """Get dance pose at specific timestamp"""
    if not DANCE_POSES or timestamp < 0:
        return get_idle_pose()
    
    frame_index = int(timestamp * 30)  # 30 FPS
    if frame_index >= len(DANCE_POSES):
        # Loop back to beginning
        frame_index = frame_index % len(DANCE_POSES)
        state.current_time = frame_index / 30.0
    
    return DANCE_POSES[frame_index]

# API Endpoints
@app.get("/", response_class=HTMLResponse)
async def serve_homepage(request: Request):
    """Serve the main application page"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/music")
async def get_music_tracks():
    """Get list of available music files"""
    music_files = []
    music_dir = Path("music")
    
    if music_dir.exists():
        for mp3_file in music_dir.glob("*.mp3"):
            music_files.append({
                "id": mp3_file.stem,
                "name": mp3_file.stem.replace("_", " ").title(),
                "path": f"/music/{mp3_file.name}",
                "size": mp3_file.stat().st_size
            })
    
    # If no music files found, create sample entries
    if not music_files:
        for i in range(1, 6):
            music_files.append({
                "id": f"file_{i}",
                "name": f"Michael Jackson Track {i}",
                "path": f"/music/file_{i}.mp3",
                "size": 1024000
            })
    
    return JSONResponse(content=music_files)

@app.get("/music/{filename}")
async def serve_music_file(filename: str):
    """Serve music files"""
    music_path = Path("music") / filename
    
    if not music_path.exists():
        # Return a placeholder if file doesn't exist
        raise HTTPException(status_code=404, detail="Music file not found")
    
    return FileResponse(
        path=music_path,
        media_type="audio/mpeg",
        filename=filename
    )

@app.get("/models/Michele.glb")
async def serve_avatar_model():
    """Serve the GLB avatar model"""
    model_path = Path("models") / "Michele.glb"
    
    if not model_path.exists():
        # Create a placeholder or download the model
        raise HTTPException(status_code=404, detail="Avatar model not found. Please place Michele.glb in the models/ directory.")
    
    return FileResponse(
        path=model_path,
        media_type="model/gltf-binary",
        filename="Michele.glb"
    )

@app.post("/api/play/{music_id}")
async def play_music(music_id: str):
    """Start playing specific music"""
    state.current_music = music_id
    state.music_playing = True
    state.is_paused = False
    state.current_time = 0.0
    
    # Notify all connected clients
    for client in state.connected_clients:
        try:
            await client.send_json({
                "type": "music_start",
                "music_id": music_id,
                "timestamp": datetime.now().isoformat()
            })
        except:
            continue
    
    return {
        "status": "playing",
        "music_id": music_id,
        "timestamp": state.current_time
    }

@app.post("/api/pause")
async def pause_music():
    """Pause music and dancing"""
    state.music_playing = False
    state.is_paused = True
    state.pause_time = state.current_time
    
    # Send pause notification
    for client in state.connected_clients:
        try:
            await client.send_json({
                "type": "music_pause",
                "timestamp": datetime.now().isoformat()
            })
        except:
            continue
    
    return {
        "status": "paused",
        "pause_time": state.pause_time
    }

@app.post("/api/resume")
async def resume_music():
    """Resume music and dancing"""
    state.music_playing = True
    state.is_paused = False
    
    # Send resume notification
    for client in state.connected_clients:
        try:
            await client.send_json({
                "type": "music_resume",
                "timestamp": datetime.now().isoformat()
            })
        except:
            continue
    
    return {
        "status": "resumed",
        "resume_from": state.pause_time
    }

@app.post("/api/reset")
async def reset_dance():
    """Reset avatar to idle pose"""
    state.music_playing = False
    state.current_music = None
    state.current_time = 0.0
    state.is_paused = False
    
    # Send reset notification
    for client in state.connected_clients:
        try:
            await client.send_json({
                "type": "reset",
                "pose": "idle",
                "timestamp": datetime.now().isoformat()
            })
        except:
            continue
    
    return {"status": "reset", "pose": "idle"}

@app.get("/api/status")
async def get_status():
    """Get current dance status"""
    return {
        "music_playing": state.music_playing,
        "current_music": state.current_music,
        "current_time": state.current_time,
        "is_paused": state.is_paused,
        "connected_clients": len(state.connected_clients),
        "avatar_loaded": state.avatar_loaded
    }

# @app.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     """WebSocket endpoint for real-time pose streaming"""
#     await websocket.accept()
#     state.connected_clients.append(websocket)
    
#     try:
#         # Send initial connection info
#         await websocket.send_json({
#             "type": "connected",
#             "message": "Connected to MJ Dance Server",
#             "timestamp": datetime.now().isoformat()
#         })
        
#         # Send initial idle pose
#         idle_pose = get_idle_pose()
#         await websocket.send_json(idle_pose.dict())
        
#         while True:
#             # Wait for client to request pose
#             try:
#                 data = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
#                 if data == "get_pose":
#                     if state.music_playing and not state.is_paused:
#                         pose = get_pose_at_time(state.current_time)
#                         await websocket.send_json(pose.dict())
#                         state.current_time += 0.033  # Increment by one frame (30 FPS)
#                     elif state.is_paused:
#                         # Send paused pose (last pose before pause)
#                         pose = get_pose_at_time(state.pause_time)
#                         await websocket.send_json(pose.dict())
#                     else:
#                         # Send idle pose
#                         idle_pose = get_idle_pose()
#                         await websocket.send_json(idle_pose.dict())
#             except asyncio.TimeoutError:
#                 # Keep connection alive with ping
#                 try:
#                     await websocket.send_json({
#                         "type": "ping",
#                         "timestamp": datetime.now().isoformat()
#                     })
#                 except:
#                     break
            
#             # Small delay to control frame rate
#             await asyncio.sleep(0.033)  # ~30 FPS
            
#     except WebSocketDisconnect:
#         state.connected_clients.remove(websocket)
#     except Exception as e:
#         print(f"WebSocket error: {e}")
#         state.connected_clients.remove(websocket)

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    print("\n" + "="*60)
    print("🎭 MICHAEL JACKSON DANCE AVATAR SERVER 🕺")
    print("="*60)
    print("\nServer is running!")
    print(f"\nAccess the application at: http://localhost:8000")
    print("\nRequirements:")
    print("  • Place 'Michele.glb' in the 'models/' directory")
    print("  • Place MP3 files in the 'music/' directory")
    print("\nEndpoints:")
    print("  • GET  /              - Main application")
    print("  • GET  /api/music     - List music tracks")
    print("  • GET  /models/Michele.glb - Avatar model")
    print("  • WS   /ws            - Real-time pose streaming")
    print("\n" + "="*60)

# if __name__ == "__main__":
#     uvicorn.run(
#         "main:app",
#         host="0.0.0.0",
#         port=8000,
#         reload=True,
#         log_level="info"
#     )