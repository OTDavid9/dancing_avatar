from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import math
import random
import time
import asyncio
import json

app = FastAPI(title="3D Dance Pose Generator")

# Static & templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# =========================
# STYLE PROFILES
# =========================
STYLE_PROFILES = {
    "afrobeats": {
        "speed": 3.0,
        "arm_amp": 0.8,
        "leg_amp": 0.7,
        "torso_sway": 0.25,
        "bounce": 0.12,
        "color": "#FF6B35"
    },
    "hiphop": {
        "speed": 2.5,
        "arm_amp": 1.0,
        "leg_amp": 0.9,
        "torso_sway": 0.18,
        "bounce": 0.06,
        "color": "#004E89"
    },
    "electro": {
        "speed": 4.0,
        "arm_amp": 0.6,
        "leg_amp": 0.4,
        "torso_sway": 0.12,
        "bounce": 0.15,
        "color": "#EF476F"
    },
    "salsa": {
        "speed": 2.0,
        "arm_amp": 1.2,
        "leg_amp": 1.0,
        "torso_sway": 0.35,
        "bounce": 0.1,
        "color": "#06D6A0"
    },
    "robot": {
        "speed": 1.5,
        "arm_amp": 0.3,
        "leg_amp": 0.25,
        "torso_sway": 0.05,
        "bounce": 0.02,
        "color": "#5A189A"
    }
}

# =========================
# POSE GENERATION
# =========================
def generate_pose_3d(style: str, t: float):
    profile = STYLE_PROFILES.get(style, STYLE_PROFILES["afrobeats"])

    s = profile["speed"]
    arm_amp = profile["arm_amp"]
    leg_amp = profile["leg_amp"]
    sway = profile["torso_sway"]
    bounce = profile["bounce"]

    noise = lambda v=0.02: random.uniform(-v, v)

    # Core waves
    arm_wave = math.sin(t * s)
    leg_wave = math.sin(t * s + math.pi)
    sway_wave = math.sin(t * s * 0.5)
    bounce_wave = abs(math.sin(t * s))

    # =========================
    # BODY & HEAD
    # =========================
    body_x = sway_wave * sway
    body_y = 1.2 + bounce_wave * bounce

    head = {
        "x": body_x * 0.5 + noise(),
        "y": body_y + 0.5,
        "z": 0
    }

    body = {
        "x": body_x,
        "y": body_y,
        "z": 0
    }

    # =========================
    # ARM JOINTS
    # =========================
    def arm_chain(side=1):
        shoulder_x = side * 0.45
        shoulder_y = body_y + 0.2

        shoulder_angle = arm_wave * arm_amp * side
        elbow_angle = math.sin(t * s + math.pi / 4) * arm_amp * 1.2

        upper_len = 0.35
        lower_len = 0.3

        elbow_x = shoulder_x + math.cos(shoulder_angle) * upper_len
        elbow_y = shoulder_y - math.sin(shoulder_angle) * upper_len

        hand_x = elbow_x + math.cos(shoulder_angle + elbow_angle) * lower_len
        hand_y = elbow_y - math.sin(shoulder_angle + elbow_angle) * lower_len

        return {
            "shoulder": {"x": shoulder_x, "y": shoulder_y, "z": noise()},
            "elbow": {"x": elbow_x, "y": elbow_y, "z": noise()},
            "hand": {"x": hand_x, "y": hand_y, "z": noise()}
        }

    # =========================
    # LEG JOINTS
    # =========================
    def leg_chain(side=1):
        hip_x = side * 0.25
        hip_y = body_y - 0.4

        hip_angle = leg_wave * leg_amp * side
        knee_angle = abs(math.sin(t * s)) * leg_amp * 1.5

        upper_len = 0.45
        lower_len = 0.45

        knee_x = hip_x + math.sin(hip_angle) * upper_len
        knee_y = hip_y - math.cos(hip_angle) * upper_len

        foot_x = knee_x + math.sin(hip_angle + knee_angle) * lower_len
        foot_y = knee_y - math.cos(hip_angle + knee_angle) * lower_len

        return {
            "hip": {"x": hip_x, "y": hip_y, "z": 0},
            "knee": {"x": knee_x, "y": knee_y, "z": 0},
            "foot": {"x": foot_x, "y": foot_y, "z": 0}
        }

    # =========================
    # FINAL POSE
    # =========================
    return {
        "head": head,
        "body": body,
        "leftArm": arm_chain(-1),
        "rightArm": arm_chain(1),
        "leftLeg": leg_chain(-1),
        "rightLeg": leg_chain(1),
        "style": style,
        "timestamp": t,
        "color": profile["color"]
    }

# =========================
# ROUTES
# =========================
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/styles")
async def get_styles():
    return list(STYLE_PROFILES.keys())

# =========================
# WEBSOCKETS
# =========================
@app.websocket("/ws/dance")
async def dance_socket(ws: WebSocket):
    await ws.accept()

    try:
        init = await ws.receive_json()
        style = init.get("style", "afrobeats")
        duration = init.get("duration", 10)

        start = time.time()
        frame = 0

        while time.time() - start < duration:
            t = time.time() - start
            pose = generate_pose_3d(style, t)
            pose["frame"] = frame

            await ws.send_json(pose)
            frame += 1
            await asyncio.sleep(1 / 30)

        await ws.send_json({"status": "complete"})
        await ws.close()

    except WebSocketDisconnect:
        pass

@app.websocket("/ws/dance/stream")
async def dance_stream(ws: WebSocket):
    await ws.accept()
    style = "afrobeats"
    start = time.time()

    try:
        while True:
            try:
                msg = await asyncio.wait_for(ws.receive_json(), timeout=0.01)
                style = msg.get("style", style)
            except:
                pass

            t = time.time() - start
            pose = generate_pose_3d(style, t)
            await ws.send_json(pose)
            await asyncio.sleep(1 / 30)

    except WebSocketDisconnect:
        pass

# from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
# from fastapi.responses import HTMLResponse, FileResponse
# from fastapi.staticfiles import StaticFiles
# from fastapi.templating import Jinja2Templates
# import math
# import random
# import time
# import asyncio
# from typing import Dict, Any
# import json
# import os

# app = FastAPI(title="3D Dance Pose Generator")

# # Mount static files directory
# app.mount("/static", StaticFiles(directory="static"), name="static")

# # Setup templates
# templates = Jinja2Templates(directory="templates")

# # Define style profiles
# STYLE_PROFILES = {
#     "afrobeats": {
#         "speed": 3.0,
#         "arm_amp": 0.4,
#         "leg_amp": 0.3,
#         "torso_sway": 0.2,
#         "bounce": 0.1,
#         "color": "#FF6B35"  # Orange
#     },
#     "hiphop": {
#         "speed": 2.5,
#         "arm_amp": 0.5,
#         "leg_amp": 0.4,
#         "torso_sway": 0.15,
#         "bounce": 0.05,
#         "color": "#004E89"  # Blue
#     },
#     "electro": {
#         "speed": 4.0,
#         "arm_amp": 0.3,
#         "leg_amp": 0.2,
#         "torso_sway": 0.1,
#         "bounce": 0.15,
#         "color": "#EF476F"  # Pink
#     },
#     "salsa": {
#         "speed": 2.0,
#         "arm_amp": 0.6,
#         "leg_amp": 0.5,
#         "torso_sway": 0.3,
#         "bounce": 0.08,
#         "color": "#06D6A0"  # Green
#     },
#     "robot": {
#         "speed": 1.5,
#         "arm_amp": 0.2,
#         "leg_amp": 0.1,
#         "torso_sway": 0.05,
#         "bounce": 0.01,
#         "color": "#5A189A"  # Purple
#     }
# }

# def generate_pose_3d(style: str, t: float):
#     profile = STYLE_PROFILES.get(style, STYLE_PROFILES["afrobeats"])

#     s = profile["speed"]
#     arm_amp = profile["arm_amp"]
#     leg_amp = profile["leg_amp"]
#     sway = profile["torso_sway"]
#     bounce = profile["bounce"]

#     # Base oscillators
#     arm_wave = math.sin(t * s)
#     leg_wave = math.sin(t * s + math.pi)
#     sway_wave = math.sin(t * s * 0.5)
#     bounce_wave = abs(math.sin(t * s))

#     # Small procedural noise
#     noise = lambda: random.uniform(-0.02, 0.02)

#     return {
#         "head": {
#             "x": sway_wave * sway * 0.5 + noise(),
#             "y": 1.7 + bounce_wave * bounce,
#             "z": 0
#         },
#         "body": {
#             "x": sway_wave * sway,
#             "y": 1.2 + bounce_wave * bounce * 0.6,
#             "z": 0
#         },
#         "leftArm": {
#             "x": -0.45,
#             "y": 1.3,
#             "z": arm_wave * arm_amp + noise()
#         },
#         "rightArm": {
#             "x": 0.45,
#             "y": 1.3,
#             "z": -arm_wave * arm_amp + noise()
#         },
#         "leftLeg": {
#             "x": -0.25,
#             "y": 0.5 + bounce_wave * bounce * 0.4,
#             "z": -leg_wave * leg_amp
#         },
#         "rightLeg": {
#             "x": 0.25,
#             "y": 0.5 + bounce_wave * bounce * 0.4,
#             "z": leg_wave * leg_amp
#         },
#         "style": style,
#         "timestamp": t,
#         "color": profile["color"]
#     }

# @app.get("/", response_class=HTMLResponse)
# async def read_root(request: Request):
#     """Serve the main HTML page"""
#     return templates.TemplateResponse("index.html", {"request": request})

# @app.get("/api/styles")
# async def get_styles():
#     """Get available dance styles"""
#     return list(STYLE_PROFILES.keys())

# @app.get("/api/style/{style_name}")
# async def get_style_profile(style_name: str):
#     """Get profile for a specific style"""
#     profile = STYLE_PROFILES.get(style_name)
#     if not profile:
#         return {"error": "Style not found"}
#     return profile

# @app.websocket("/ws/dance")
# async def dance_socket(ws: WebSocket):
#     await ws.accept()

#     try:
#         init = await ws.receive_json()
#         style = init.get("style", "afrobeats")
#         duration = init.get("duration", 10)
        
#         print(f"Starting dance session: style={style}, duration={duration}s")

#         start_time = time.time()
#         frame_count = 0

#         while time.time() - start_time < duration:
#             elapsed = time.time() - start_time
#             pose = generate_pose_3d(style, elapsed)
#             pose["frame"] = frame_count
            
#             await ws.send_json(pose)
#             frame_count += 1
#             await asyncio.sleep(1 / 30)

#         await ws.send_json({
#             "status": "complete",
#             "frames_sent": frame_count,
#             "duration": duration
#         })
#         await ws.close()

#     except WebSocketDisconnect:
#         print("Client disconnected")
#     except Exception as e:
#         print(f"Error in dance socket: {e}")
#         try:
#             await ws.close()
#         except:
#             pass

# @app.websocket("/ws/dance/stream")
# async def dance_stream(ws: WebSocket):
#     """Stream poses continuously until client disconnects"""
#     await ws.accept()
    
#     style = "afrobeats"
#     start_time = time.time()
    
#     try:
#         while True:
#             # Check for style change messages from client
#             try:
#                 data = await asyncio.wait_for(ws.receive_json(), timeout=0.01)
#                 if "style" in data:
#                     style = data["style"]
#                     print(f"Style changed to: {style}")
#             except (asyncio.TimeoutError, json.JSONDecodeError):
#                 pass
            
#             elapsed = time.time() - start_time
#             pose = generate_pose_3d(style, elapsed)
#             await ws.send_json(pose)
#             await asyncio.sleep(1 / 30)
            
#     except WebSocketDisconnect:
#         print("Stream client disconnected")
# import math
# import random
# import time
# import asyncio
# from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
# from fastapi.templating import Jinja2Templates
# from fastapi.responses import HTMLResponse
# from fastapi.staticfiles import StaticFiles
# import asyncio, time, math

# app = FastAPI()

# # Templates
# templates = Jinja2Templates(directory="templates")

# # Static files (JS, CSS)
# app.mount("/static", StaticFiles(directory="static"), name="static")


# class SmoothRandom:
#     """
#     Generates smooth random values over time
#     (used in animation & robotics)
#     """
#     def __init__(self, speed=0.05):
#         self.value = random.uniform(-1, 1)
#         self.target = random.uniform(-1, 1)
#         self.speed = speed

#     def update(self):
#         if abs(self.value - self.target) < 0.05:
#             self.target = random.uniform(-1, 1)
#         self.value += (self.target - self.value) * self.speed
#         return self.value


# def create_motion_profile(style):
#     return {
#         "arm": SmoothRandom(speed=0.06),
#         "leg": SmoothRandom(speed=0.04),
#         "body": SmoothRandom(speed=0.03),
#         "tempo": 0.12 if style == "afrobeats" else 0.18 if style == "hiphop" else 0.25
#     }


# def generate_pose(style, frame, motion):
#     center_x = 180
#     center_y = 160

#     tempo = motion["tempo"]
#     arm_wave = math.sin(frame * tempo)
#     leg_wave = math.sin(frame * tempo * 0.8)

#     arm_rand = motion["arm"].update() * 18
#     leg_rand = motion["leg"].update() * 12
#     body_rand = motion["body"].update() * 8

#     return {
#         "head": {
#             "x": center_x + body_rand * 0.3,
#             "y": center_y - 80 + body_rand * 0.5
#         },
#         "body": {
#             "x": center_x + body_rand,
#             "y": center_y
#         },
#         "leftHand": {
#             "x": center_x - 40 + arm_rand,
#             "y": center_y - 20 + arm_wave * 25
#         },
#         "rightHand": {
#             "x": center_x + 40 - arm_rand,
#             "y": center_y - 20 - arm_wave * 25
#         },
#         "leftFoot": {
#             "x": center_x - 20,
#             "y": center_y + 90 + leg_wave * 15 + leg_rand
#         },
#         "rightFoot": {
#             "x": center_x + 20,
#             "y": center_y + 90 - leg_wave * 15 - leg_rand
#         }
#     }

# @app.get("/")
# async def root():   
#     return {"message": "Dance Motion Server is running."}

# @app.get("/dance", response_class=HTMLResponse)
# async def index(request: Request):
#     return templates.TemplateResponse(
#         "index.html",
#         {"request": request}
#     )


# @app.route("/health")
# async def health_check():
#     return {"status": "ok"}

# # @app.websocket("/ws/dance")
# # async def dance_socket(websocket: WebSocket):
# #     await websocket.accept()

# #     try:
# #         init = await websocket.receive_json()
# #         style = init.get("style", "afrobeats")
# #         duration = init.get("duration", 300)  # seconds (5 mins default)

# #         start_time = time.time()
# #         frame = 0
# #         motion = create_motion_profile(style)

# #         while True:
# #             if time.time() - start_time > duration:
# #                 break

# #             pose = generate_pose(style, frame, motion)

# #             await websocket.send_json({
# #                 "style": style,
# #                 "frame": frame,
# #                 "timestamp": time.time(),
# #                 "pose": pose
# #             })

# #             frame += 1
# #             await asyncio.sleep(1 / 30)  # 30 FPS

# #         await websocket.close()

# #     except WebSocketDisconnect:
# #         print("Client disconnected")


# # def generate_pose_3d(style, frame):
# #     amp = 0.5 if style == "electronic" else 0.3 if style == "hiphop" else 0.2
# #     speed = 0.15 if style == "electronic" else 0.1

# #     swing = math.sin(frame * speed) * amp

# #     return {
# #         "head": {"x": 0, "y": 1.7, "z": 0},
# #         "body": {"x": 0, "y": 1.2, "z": 0},

# #         "leftArm": {"x": -0.5, "y": 1.3, "z": swing},
# #         "rightArm": {"x": 0.5, "y": 1.3, "z": -swing},

# #         "leftLeg": {"x": -0.3, "y": 0.5, "z": -swing},
# #         "rightLeg": {"x": 0.3, "y": 0.5, "z": swing},
# #     }

# STYLE_PROFILES = {
#     "afrobeats": {
#         "arm_amp": 0.25,
#         "leg_amp": 0.2,
#         "torso_sway": 0.1,
#         "bounce": 0.08,
#         "speed": 1.5,
#     },
#     "hiphop": {
#         "arm_amp": 0.35,
#         "leg_amp": 0.25,
#         "torso_sway": 0.15,
#         "bounce": 0.05,
#         "speed": 1.2,
#     },
#     "electronic": {
#         "arm_amp": 0.5,
#         "leg_amp": 0.35,
#         "torso_sway": 0.2,
#         "bounce": 0.12,
#         "speed": 2.0,
#     }
# }


# def generate_pose_3d(style: str, t: float):
#     profile = STYLE_PROFILES.get(style, STYLE_PROFILES["afrobeats"])

#     s = profile["speed"]
#     arm_amp = profile["arm_amp"]
#     leg_amp = profile["leg_amp"]
#     sway = profile["torso_sway"]
#     bounce = profile["bounce"]

#     # Base oscillators
#     arm_wave = math.sin(t * s)
#     leg_wave = math.sin(t * s + math.pi)
#     sway_wave = math.sin(t * s * 0.5)
#     bounce_wave = abs(math.sin(t * s))

#     # Small procedural noise (keeps it organic)
#     noise = lambda: random.uniform(-0.02, 0.02)

#     return {
#         # Head subtly follows torso + bounce
#         "head": {
#             "x": sway_wave * sway * 0.5 + noise(),
#             "y": 1.7 + bounce_wave * bounce,
#             "z": 0
#         },

#         # Torso sways and bounces
#         "body": {
#             "x": sway_wave * sway,
#             "y": 1.2 + bounce_wave * bounce * 0.6,
#             "z": 0
#         },

#         # Arms swing with phase offset
#         "leftArm": {
#             "x": -0.45,
#             "y": 1.3,
#             "z": arm_wave * arm_amp + noise()
#         },
#         "rightArm": {
#             "x": 0.45,
#             "y": 1.3,
#             "z": -arm_wave * arm_amp + noise()
#         },

#         # Legs counterbalance arms
#         "leftLeg": {
#             "x": -0.25,
#             "y": 0.5 + bounce_wave * bounce * 0.4,
#             "z": -leg_wave * leg_amp
#         },
#         "rightLeg": {
#             "x": 0.25,
#             "y": 0.5 + bounce_wave * bounce * 0.4,
#             "z": leg_wave * leg_amp
#         },
#     }


# @app.websocket("/ws/dance")
# async def dance_socket(ws: WebSocket):
#     await ws.accept()

#     try:
#         init = await ws.receive_json()
#         style = init.get("style", "afrobeats")
#         duration = init.get("duration", 10)

#         start = time.time()


#         while time.time() - start < duration:
#             t = time.time() - start
            
#             pose = generate_pose_3d(style, t)

#             await ws.send_json(pose)

#             await asyncio.sleep(1 / 30)

#         await ws.close()

#     except WebSocketDisconnect:
#         pass
#         print("Client disconnected")