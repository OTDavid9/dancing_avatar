import sys
import json
import math

def calculate_pose_similarity(target_pose, user_pose):
    """
    Calculate similarity between two poses using Euclidean distance on normalized coordinates.
    target_pose: list of {x, y, score}
    user_pose: list of {x, y, score}
    """
    if len(target_pose) != len(user_pose):
        return 0.0
    
    total_dist = 0.0
    valid_points = 0
    
    for t, u in zip(target_pose, user_pose):
        if t.get('score', 0) > 0.5 and u.get('score', 0) > 0.5:
            dist = math.sqrt((t['x'] - u['x'])**2 + (t['y'] - u['y'])**2)
            total_dist += dist
            valid_points += 1
            
    if valid_points == 0:
        return 0.0
        
    avg_dist = total_dist / valid_points
    # Convert distance to similarity score (0 to 1)
    # 0 distance = 1 similarity, 0.5 distance = 0 similarity (approx)
    similarity = max(0, 1 - (avg_dist * 2))
    return similarity

def analyze_motion(data):
    video_context = data.get('videoContext', '')
    user_performance = data.get('userPerformance', '')
    
    # In a real scenario, we'd pass keypoints here. 
    # For now, we use the metrics provided by the frontend.
    
    accuracy = 0.0
    try:
        if "accuracy%" in user_performance:
             accuracy = float(user_performance.split("accuracy%")[0].split()[-1]) / 100.0
        elif "accuracy" in user_performance:
             # Extract number near accuracy
             import re
             matches = re.findall(r"(\d+)%", user_performance)
             if matches:
                 accuracy = float(matches[0]) / 100.0
    except:
        pass

    feedback = "Keep moving! Your energy is great."
    tips = ["Focus on your arm extensions", "Try to match the rhythm more closely", "Keep your core engaged"]
    encouragement = "You're doing amazing, keep it up!"

    if accuracy > 0.8:
        feedback = "Excellent synchronization! You're matching the instructor perfectly."
        tips = ["Maintain this consistency", "Try adding more flair to your movements", "Look at your hand positioning"]
    elif accuracy > 0.5:
        feedback = "Good progress. You're catching most of the moves."
        tips = ["Watch the footwork carefully", "Try to anticipate the next move", "Slightly more power in your steps"]

    return {
        "feedback": feedback,
        "tips": tips,
        "encouragement": encouragement,
        "score": int(accuracy * 100)
    }

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input data"}))
            sys.exit(1)
        
        data = json.loads(input_data)
        result = analyze_motion(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
