// Global variables
let scene, camera, renderer, controls, clock;
let avatar = null;
let skeleton = null;
let jointHelpers = {};
let socket = null;
let isConnected = false;
let musicPlaying = false;
let currentTrack = null;
let lastPoseTime = 0;
let frameCount = 0;
let fps = 0;
let lastFpsUpdate = 0;
let audioPlayer = null;
let danceIntensity = 0.8;
let currentPose = null;
let avatarLoaded = false;


// GLTF joint mapping to our pose system
const JOINT_MAPPING = {
    'hips': 'Hips',
    'spine': 'Spine',
    'chest': 'Chest',
    'upperChest': 'UpperChest',
    'neck': 'Neck',
    'head': 'Head',
    'leftShoulder': 'LeftShoulder',
    'leftUpperArm': 'LeftUpperArm',
    'leftLowerArm': 'LeftLowerArm',
    'leftHand': 'LeftHand',
    'rightShoulder': 'RightShoulder',
    'rightUpperArm': 'RightUpperArm',
    'rightLowerArm': 'RightLowerArm',
    'rightHand': 'RightHand',
    'leftUpperLeg': 'LeftUpperLeg',
    'leftLowerLeg': 'LeftLowerLeg',
    'leftFoot': 'LeftFoot',
    'leftToes': 'LeftToes',
    'rightUpperLeg': 'RightUpperLeg',
    'rightLowerLeg': 'RightLowerLeg',
    'rightFoot': 'RightFoot',
    'rightToes': 'RightToes'
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎭 MJ Dance Avatar Initializing...');
    
    // Initialize audio player
    audioPlayer = document.getElementById('audioPlayer');
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize 3D scene
    initThreeJS();
    
    // Load music library
    loadMusicLibrary();
    
    // Connect to WebSocket
    // connectWebSocket();
    
    // Start animation loop
    animate();
    
    // Start server time update
    updateServerTime();
    setInterval(updateServerTime, 1000);
    
    // Update UI periodically
    setInterval(updateUIStats, 100);
    
    console.log('✅ Application initialized successfully!');
});

function setupEventListeners() {
    // Music control buttons
    document.getElementById('playBtn').addEventListener('click', playSelectedMusic);
    document.getElementById('pauseBtn').addEventListener('click', pauseMusic);
    document.getElementById('stopBtn').addEventListener('click', stopMusic);
    document.getElementById('resetAvatarBtn').addEventListener('click', resetAvatar);
    
    // Music library refresh
    document.getElementById('refreshMusicBtn').addEventListener('click', loadMusicLibrary);
    
    // 3D view controls
    document.getElementById('resetViewBtn').addEventListener('click', resetCameraView);
    document.getElementById('toggleGridBtn').addEventListener('click', toggleGrid);
    document.getElementById('toggleLightsBtn').addEventListener('click', toggleLights);
    
    // Slider controls
    const intensitySlider = document.getElementById('intensitySlider');
    const volumeSlider = document.getElementById('volumeSlider');
    
    intensitySlider.addEventListener('input', (e) => {
        danceIntensity = parseFloat(e.target.value);
        document.getElementById('intensityValue').textContent = 
            `${Math.round(danceIntensity * 100)}%`;
    });
    
    volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt(e.target.value);
        document.getElementById('volumeValue').textContent = `${volume}%`;
        if (audioPlayer) {
            audioPlayer.volume = volume / 100;
        }
    });
    
    // Audio player events
    if (audioPlayer) {
        audioPlayer.addEventListener('timeupdate', updateMusicProgress);
        audioPlayer.addEventListener('ended', handleMusicEnded);
        audioPlayer.addEventListener('error', handleAudioError);
        audioPlayer.addEventListener('play', () => {
            document.getElementById('audioStatus').textContent = 'Playing';
            document.getElementById('audioStatus').style.color = '#1dd1a1';
        });
        audioPlayer.addEventListener('pause', () => {
            document.getElementById('audioStatus').textContent = 'Paused';
            document.getElementById('audioStatus').style.color = '#ffd166';
        });
    }
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
}

function updateServerTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('serverTime').textContent = timeString;
}

function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 5, 50);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 1.5, 3);
    
    // Create renderer
    const container = document.getElementById('avatarContainer');
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // Add OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 2;
    
    // Add lighting
    setupLighting();
    
    // Add environment
    setupEnvironment();
    
    // Load Michele.glb avatar
    loadAvatar();
    
    // Initialize clock
    clock = new THREE.Clock();
}

function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Main directional light
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    scene.add(mainLight);
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0x4ecdc4, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);
    
    // Rim light
    const rimLight = new THREE.DirectionalLight(0xff6b6b, 0.2);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);
    
    // Store lights for toggling
    scene.userData.lights = { mainLight, fillLight, rimLight, ambientLight };
    scene.userData.lightsEnabled = true;
}

function setupEnvironment() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1a1a2e,
        roughness: 0.8,
        metalness: 0.2,
        side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x4ecdc4, 0x1a1a2e);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
    scene.userData.gridHelper = gridHelper;
    
    // Add a simple stage
    const stageGeometry = new THREE.BoxGeometry(4, 0.1, 4);
    const stageMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2d3436,
        roughness: 0.7,
        metalness: 0.3
    });
    const stage = new THREE.Mesh(stageGeometry, stageMaterial);
    stage.position.y = 0.05;
    stage.receiveShadow = true;
    scene.add(stage);
}

function loadAvatar() {
    const loader = new THREE.GLTFLoader();
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    console.log('Loading Michele.glb avatar...');
    
    loader.load(
        '/models/Michele.glb',
        (gltf) => {
            console.log('Avatar loaded successfully!');
            
            avatar = gltf.scene;
            avatar.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    
                    // Improve material appearance
                    if (node.material) {
                        node.material.roughness = 0.4;
                        node.material.metalness = 0.2;
                    }
                }
                
                // Try to find skeleton
                if (node.isBone || node.name.includes('Bone') || node.name.includes('Joint')) {
                    console.log('Found bone/joint:', node.name);
                }
            });
            
            // Scale and position the avatar
            avatar.scale.set(1, 1, 1);
            avatar.position.set(0, 0, 0);
            avatar.rotation.y = Math.PI;
            
            scene.add(avatar);
            
            // Try to extract skeleton for debugging
            // if (gltf.animations && gltf.animations.length > 0) {
            //     console.log('Found animations:', gltf.animations.map(a => a.name));
            //     mixer = new THREE.AnimationMixer(avatar);
                
            //     // Play first animation if exists
            //     const animation = gltf.animations[0];
            //     const action = mixer.clipAction(animation);
            //     action.play();
            // }
            // if (gltf.animations && gltf.animations.length > 0) {
            //     mixer = new THREE.AnimationMixer(avatar);

            //     // Store animations, but DON'T play yet
            //     gltf.animations.forEach(clip => {
            //         console.log('Loaded animation:', clip.name); });}
            // const animationActions = {};
            // let currentAction = null;

            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(avatar);

                gltf.animations.forEach(clip => {
                    console.log('Loaded animation:', clip.name);
                    animationActions[clip.name] = mixer.clipAction(clip);
                });
            }
            
            // Create joint helpers for debugging
            createJointHelpers();
            
            // Hide loading overlay
            loadingOverlay.classList.add('hidden');
            avatarLoaded = true;
            
            document.getElementById('renderStatus').textContent = 'Avatar Loaded';
            document.getElementById('renderStatus').style.color = '#1dd1a1';
            
            showNotification('Avatar loaded successfully!', 'success');
            
        },
        (progress) => {
            // Loading progress
            const percent = (progress.loaded / progress.total * 100).toFixed(1);
            loadingOverlay.querySelector('p').textContent = `Loading avatar... ${percent}%`;
        },
        (error) => {
            console.error('Error loading avatar:', error);
            loadingOverlay.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 1rem;"></i>
                    <h3>Avatar Load Failed</h3>
                    <p>Could not load Michele.glb</p>
                    <p style="font-size: 0.9rem; color: #aaa; margin-top: 1rem;">
                        Please ensure Michele.glb is in the models/ directory
                    </p>
                </div>
            `;
            document.getElementById('renderStatus').textContent = 'Load Failed';
            document.getElementById('renderStatus').style.color = '#ff6b6b';
            
            showNotification('Failed to load avatar. Check console for details.', 'error');
        }
    );
}

function createJointHelpers() {
    // Create sphere helpers for major joints (for debugging/visualization)
    const jointPositions = {
        'hips': [0, 0, 0],
        'spine': [0, 0.5, 0],
        'chest': [0, 1.0, 0],
        'neck': [0, 1.5, 0],
        'head': [0, 1.7, 0],
        'leftShoulder': [-0.3, 1.4, 0],
        'rightShoulder': [0.3, 1.4, 0],
        'leftElbow': [-0.6, 1.0, 0],
        'rightElbow': [0.6, 1.0, 0],
        'leftHand': [-0.8, 0.6, 0],
        'rightHand': [0.8, 0.6, 0],
        'leftHip': [-0.2, 0, 0],
        'rightHip': [0.2, 0, 0],
        'leftKnee': [-0.2, -0.5, 0],
        'rightKnee': [0.2, -0.5, 0],
        'leftAnkle': [-0.2, -1.0, 0],
        'rightAnkle': [0.2, -1.0, 0]
    };
    
    Object.keys(jointPositions).forEach(jointName => {
        const geometry = new THREE.SphereGeometry(0.03, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.5
        });
        const helper = new THREE.Mesh(geometry, material);
        helper.position.fromArray(jointPositions[jointName]);
        helper.visible = false; // Hide by default
        scene.add(helper);
        jointHelpers[jointName] = helper;
    });
}

function updateJointHelpers(poseData) {
    // Update joint helper positions based on pose data
    Object.keys(jointHelpers).forEach(jointName => {
        const helper = jointHelpers[jointName];
        const mappedName = mapJointName(jointName);
        
        if (poseData.joints && poseData.joints[mappedName]) {
            const jointData = poseData.joints[mappedName];
            if (jointData.length >= 3) {
                helper.position.set(
                    jointData[0] * 0.01,
                    jointData[1] * 0.01 + 1,
                    jointData[2] * 0.01
                );
            }
        }
    });
}

function mapJointName(jointName) {
    // Map common joint names to our pose system
    const mapping = {
        'hips': 'hips',
        'spine': 'spine',
        'chest': 'chest',
        'neck': 'neck',
        'head': 'head',
        'leftShoulder': 'leftShoulder',
        'rightShoulder': 'rightShoulder',
        'leftElbow': 'leftUpperArm',
        'rightElbow': 'rightUpperArm',
        'leftHand': 'leftHand',
        'rightHand': 'rightHand',
        'leftHip': 'leftUpperLeg',
        'rightHip': 'rightUpperLeg',
        'leftKnee': 'leftLowerLeg',
        'rightKnee': 'rightLowerLeg',
        'leftAnkle': 'leftFoot',
        'rightAnkle': 'rightFoot'
    };
    return mapping[jointName] || jointName;
}

function applyPoseToAvatar(poseData) {
    if (!avatar || !poseData || !poseData.joints) return;
    
    currentPose = poseData;
    
    // Apply pose to avatar bones
    avatar.traverse((node) => {
        if (node.isBone || node.type === 'Bone') {
            const boneName = node.name;
            const mappedName = findMappedJoint(boneName);
            
            if (mappedName && poseData.joints[mappedName]) {
                const jointData = poseData.joints[mappedName];
                
                if (jointData.length >= 6) {
                    // Apply rotation (convert from degrees to radians)
                    const rotation = new THREE.Euler(
                        jointData[3] * Math.PI / 180 * danceIntensity,
                        jointData[4] * Math.PI / 180 * danceIntensity,
                        jointData[5] * Math.PI / 180 * danceIntensity,
                        'XYZ'
                    );
                    
                    // Apply the rotation to the bone
                    node.rotation.copy(rotation);
                    
                    // Apply position offset if needed
                    if (jointData[0] !== 0 || jointData[1] !== 0 || jointData[2] !== 0) {
                        node.position.set(
                            jointData[0] * 0.01 * danceIntensity,
                            jointData[1] * 0.01 * danceIntensity,
                            jointData[2] * 0.01 * danceIntensity
                        );
                    }
                }
            }
        }
    });
    
    // Update joint helpers for debugging
    updateJointHelpers(poseData);
    
    // Update pose info
    updatePoseInfo(poseData);
}

function findMappedJoint(boneName) {
    // Try to match bone name to our joint mapping
    const lowerName = boneName.toLowerCase();
    
    for (const [key, value] of Object.entries(JOINT_MAPPING)) {
        if (lowerName.includes(key.toLowerCase()) || 
            lowerName.includes(value.toLowerCase())) {
            return key;
        }
    }
    
    return null;
}

async function loadMusicLibrary() {
    const musicLibrary = document.getElementById('musicLibrary');
    musicLibrary.innerHTML = `
        <div class="library-loading">
            <div class="spinner small"></div>
            <p>Loading music tracks...</p>
        </div>
    `;
    
    try {
        const response = await fetch('/api/music');
        const tracks = await response.json();
        
        musicLibrary.innerHTML = '';
        
        if (tracks.length === 0) {
            musicLibrary.innerHTML = `
                <div class="text-center mt-3">
                    <i class="fas fa-music-slash" style="font-size: 2rem; color: #666; margin-bottom: 1rem;"></i>
                    <p>No music files found</p>
                    <p class="mt-1" style="font-size: 0.8rem; color: #888;">
                        Add MP3 files to the 'music' folder
                    </p>
                </div>
            `;
            return;
        }
        
        tracks.forEach(track => {
            const trackItem = document.createElement('div');
            trackItem.className = 'track-item';
            trackItem.dataset.trackId = track.id;
            trackItem.innerHTML = `
                <div class="track-icon">
                    <i class="fas fa-music"></i>
                </div>
                <div class="track-title">
                    <h5>${track.name}</h5>
                    <p>${track.size ? formatFileSize(track.size) : 'Unknown size'}</p>
                </div>
                <div class="track-play">
                    <i class="fas fa-play"></i>
                </div>
            `;
            
            trackItem.addEventListener('click', () => selectMusicTrack(track));
            musicLibrary.appendChild(trackItem);
        });
    } catch (error) {
        console.error('Error loading music library:', error);
        musicLibrary.innerHTML = `
            <div class="text-center mt-3">
                <i class="fas fa-exclamation-triangle" style="color: #ff6b6b; font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Error loading music</p>
                <p class="mt-1" style="font-size: 0.8rem; color: #888;">Check server connection</p>
            </div>
        `;
    }
}

function formatFileSize(bytes) {
    if (!bytes || bytes < 1024) return '0 KB';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function selectMusicTrack(track) {
    // Remove active class from all tracks
    document.querySelectorAll('.track-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected track
    event.currentTarget.classList.add('active');
    
    // Update current track display
    currentTrack = track;
    document.getElementById('currentTrack').innerHTML = `
        <div class="track-info">
            <div class="track-icon">
                <i class="fas fa-compact-disc"></i>
            </div>
            <div class="track-details">
                <h4>${track.name}</h4>
                <p>Ready to play</p>
            </div>
        </div>
    `;
    
    // Set audio source
    if (track.path && track.path !== '#') {
        audioPlayer.src = track.path;
    }
    
    // Update music status
    document.getElementById('musicStatus').textContent = 'Selected';
    document.getElementById('musicStatus').style.color = '#4ecdc4';
}

// async function playSelectedMusic() {
//     if (!currentTrack) {
//         showNotification('Please select a music track first!', 'warning');
//         return;
//     }
    
//     if (!avatarLoaded) {
//         showNotification('Avatar is still loading. Please wait...', 'warning');
//         return;
//     }
    
//     try {
//         // Call backend play endpoint
//         const response = await fetch(`/api/play/${currentTrack.id}`, {
//             method: 'POST'
//         });
        
//         if (!response.ok) throw new Error('Failed to play music');
        
//         const result = await response.json();
        
//         // Play audio
//         await audioPlayer.play();
//         musicPlaying = true;
        
//         // Update UI
//         document.getElementById('musicStatus').textContent = 'Playing';
//         document.getElementById('musicStatus').style.color = '#1dd1a1';
//         document.getElementById('poseTime').textContent = '0.00s';
        
//         // Add visual feedback
//         const currentTrackElement = document.querySelector('.track-item.active');
//         if (currentTrackElement) {
//             currentTrackElement.style.animation = 'pulse 2s infinite';
//         }
        
//         showNotification(`Now playing: ${currentTrack.name}`, 'success');
        
//         // Start requesting poses
//         requestPose();
        
//     } catch (error) {
//         console.error('Error playing music:', error);
//         showNotification('Failed to play music. Please try again.', 'error');
//     }
// }


// function stopDance() {
//     if (!mixer || !animationActions) return;

//     // Stop all currently playing dance actions
//     Object.values(animationActions).forEach(action => {
//         action.stop();
//     });

//     isDancing = false;
// }


// async function playSelectedMusic() {
//     if (!currentTrack) {
//         showNotification('Please select a music track first!', 'warning');
//         return;
//     }

//     if (!avatarLoaded) {
//         showNotification('Avatar is still loading. Please wait...', 'warning');
//         return;
//     }

//     try {
//         // Tell backend to start music / pose generation
//         const response = await fetch(`/api/play/${currentTrack.id}`, {
//             method: 'POST'
//         });

//         if (!response.ok) {
//             throw new Error('Failed to start music');
//         }

//         // Play audio locally
//         await audioPlayer.play();
//         musicPlaying = true;

//         // ===============================
//         // 🔥 START DANCE ANIMATION HERE
//         // ===============================
//         if (animationActions['SambaDance']) {
//             // stopDance(); // safety

//             const action = animationActions['SambaDance'];
//             action.reset();
//             action.setLoop(THREE.LoopRepeat);
//             action.fadeIn(0.3);
//             action.play();

//             currentAction = action;
//             isDancing = true;
//         } else {
//             console.warn('SambaDance animation not found');
//         }

//         // ===============================
//         // UI UPDATES
//         // ===============================
//         document.getElementById('musicStatus').textContent = 'Playing';
//         document.getElementById('musicStatus').style.color = '#1dd1a1';
//         document.getElementById('poseTime').textContent = '0.00s';

//         const currentTrackElement = document.querySelector('.track-item.active');
//         if (currentTrackElement) {
//             currentTrackElement.style.animation = 'pulse 2s infinite';
//         }

//         showNotification(`Now playing: ${currentTrack.name}`, 'success');

//         // Request pose stream (will be ignored while dancing)
//         // requestPose();

//     } catch (error) {
//         console.error('Error playing music:', error);
//         showNotification('Failed to play music. Please try again.', 'error');
//     }
// }


// function pauseMusic() {
//     if (!musicPlaying) return;
    
//     fetch('/api/pause', { method: 'POST' })
//         .then(response => {
//             if (response.ok) {
//                 audioPlayer.pause();
//                 musicPlaying = false;
                
//                 document.getElementById('musicStatus').textContent = 'Paused';
//                 document.getElementById('musicStatus').style.color = '#ffd166';
                
//                 const currentTrackElement = document.querySelector('.track-item.active');
//                 if (currentTrackElement) {
//                     currentTrackElement.style.animation = '';
//                 }
                
//                 showNotification('Music paused', 'info');
//             }
//         })
//         .catch(error => {
//             console.error('Error pausing music:', error);
//             showNotification('Failed to pause music', 'error');
//         });
// }

// function stopMusic() {
//     fetch('/api/reset', { method: 'POST' })
//         .then(() => {
//             audioPlayer.pause();
//             audioPlayer.currentTime = 0;
//             musicPlaying = false;
            
//             document.getElementById('musicStatus').textContent = 'Stopped';
//             document.getElementById('musicStatus').style.color = '#ff6b6b';
            
//             const currentTrackElement = document.querySelector('.track-item.active');
//             if (currentTrackElement) {
//                 currentTrackElement.classList.remove('active');
//                 currentTrackElement.style.animation = '';
//             }
            
//             currentTrack = null;
            
//             showNotification('Music stopped', 'info');
//         })
//         .catch(error => {
//             console.error('Error stopping music:', error);
//             showNotification('Failed to stop music', 'error');
//         });
// }
// ---------------------------
// Dance Animation Management
// ---------------------------

// // Track current animation state
// let isDancing = false;
// let currentAction = null;

// // Start dancing animation
// function startDance() {
//     if (!mixer || !animationActions) return;

//     // Stop previous dance safely
//     stopDance();

//     const action = animationActions['SambaDance'];
//     if (action) {
//         action.reset();
//         action.setLoop(THREE.LoopRepeat);
//         action.fadeIn(0.3);
//         action.play();

//         currentAction = action;
//         isDancing = true;
//     } else {
//         console.warn('SambaDance animation not found');
//     }
// }

// // Stop dancing but maintain last pose (pause)
// function stopDance() {
//     if (!mixer || !animationActions || !isDancing) return;

//     Object.values(animationActions).forEach(action => {
//         action.stop(); // stops the animation but keeps last pose
//     });

//     isDancing = false;
// }

// // Reset avatar to default pose (stop music)
// function resetDance() {
//     if (!avatar) return;

//     stopDance();
//     // loadAvatar(); // Reload avatar to reset pose

//     // // Reset all bones to default
//     // avatar.traverse(node => {
//     //     if (node.isBone || node.type === 'Bone') {
//     //         node.rotation.set(0, 0, 0);
//     //         node.position.set(0, 0, 0);
//     //     }
//     // });

//     // currentAction = null;
//     // isDancing = false;
// }

// // ---------------------------
// // Music Control Overrides
// // ---------------------------

// async function playSelectedMusic() {
//     if (!currentTrack) {
//         showNotification('Please select a music track first!', 'warning');
//         return;
//     }

//     if (!avatarLoaded) {
//         showNotification('Avatar is still loading. Please wait...', 'warning');
//         return;
//     }

//     try {
//         // Tell backend to start music / pose generation
//         const response = await fetch(`/api/play/${currentTrack.id}`, { method: 'POST' });
//         if (!response.ok) throw new Error('Failed to start music');

//         // Play audio locally
//         await audioPlayer.play();
//         musicPlaying = true;

//         // Start dance animation
//         startDance();

//         // Update UI
//         document.getElementById('musicStatus').textContent = 'Playing';
//         document.getElementById('musicStatus').style.color = '#1dd1a1';
//         document.getElementById('poseTime').textContent = '0.00s';

//         const currentTrackElement = document.querySelector('.track-item.active');
//         if (currentTrackElement) {
//             currentTrackElement.style.animation = 'pulse 2s infinite';
//         }

//         showNotification(`Now playing: ${currentTrack.name}`, 'success');

//         // Request pose stream (optional for later)
//         // requestPose();

//     } catch (error) {
//         console.error('Error playing music:', error);
//         showNotification('Failed to play music. Please try again.', 'error');
//     }
// }

// function pauseMusic() {
//     if (!musicPlaying) return;

//     fetch('/api/pause', { method: 'POST' })
//         .then(response => {
//             if (response.ok) {
//                 audioPlayer.pause();
//                 musicPlaying = false;

//                 // Stop dance animation but keep last pose
//                 stopDance();

//                 document.getElementById('musicStatus').textContent = 'Paused';
//                 document.getElementById('musicStatus').style.color = '#ffd166';

//                 const currentTrackElement = document.querySelector('.track-item.active');
//                 if (currentTrackElement) {
//                     currentTrackElement.style.animation = '';
//                 }

//                 showNotification('Music paused', 'info');
//             }
//         })
//         .catch(error => {
//             console.error('Error pausing music:', error);
//             showNotification('Failed to pause music', 'error');
//         });
// }

// function stopMusic() {
//     fetch('/api/reset', { method: 'POST' })
//         .then(() => {
//             audioPlayer.pause();
//             audioPlayer.currentTime = 0;
//             musicPlaying = false;

//             // Reset avatar pose
//             resetDance();

//             document.getElementById('musicStatus').textContent = 'Stopped';
//             document.getElementById('musicStatus').style.color = '#ff6b6b';

//             const currentTrackElement = document.querySelector('.track-item.active');
//             if (currentTrackElement) {
//                 currentTrackElement.classList.remove('active');
//                 currentTrackElement.style.animation = '';
//             }

//             currentTrack = null;

//             showNotification('Music stopped', 'info');
//         })
//         .catch(error => {
//             console.error('Error stopping music:', error);
//             showNotification('Failed to stop music', 'error');
//         });
// }



function resetAvatar() {
    if (!avatarLoaded) {
        showNotification('Avatar not loaded yet', 'warning');
        return;
    }
    
    fetch('/api/reset', { method: 'POST' })
        .then(() => {
            showNotification('Avatar reset to idle pose', 'info');
            
            // Reset avatar to default pose
            avatar.traverse((node) => {
                if (node.isBone || node.type === 'Bone') {
                    node.rotation.set(0, 0, 0);
                    node.position.set(0, 0, 0);
                }
            });
            
            // Reset joint helpers
            Object.values(jointHelpers).forEach(helper => {
                helper.position.set(0, 0, 0);
            });
            
            // Stop any animations
            if (mixer) {
                mixer.stopAllAction();
            }
        })
        .catch(error => {
            console.error('Error resetting avatar:', error);
            showNotification('Failed to reset avatar', 'error');
        });
}

// ====================
// Dance Control Variables
// ====================
let mixer = null;
let animationActions = {};
let currentAction = null;
let isDancing = false;

// ====================
// Load Avatar Animations
// ====================
function setupAvatarAnimations(gltf) {
    if (!gltf.animations || gltf.animations.length === 0) return;

    mixer = new THREE.AnimationMixer(avatar);

    gltf.animations.forEach(clip => {
        console.log('Loaded animation:', clip.name);
        animationActions[clip.name] = mixer.clipAction(clip);

        // If it's TPose, play once and pause to initialize
        if (clip.name === 'TPose') {
            animationActions['TPose'].play();
            animationActions['TPose'].paused = true;
            currentAction = animationActions['TPose'];
        }
    });
}

// ====================
// Dance Control Functions
// ====================
function startDance() {
    if (!mixer || !animationActions['SambaDance']) return;

    // Stop previous action safely
    if (currentAction) {
        currentAction.fadeOut(0.2);
    }

    const action = animationActions['SambaDance'];
    action.reset();
    action.setLoop(THREE.LoopRepeat);
    action.fadeIn(0.3);
    action.play();

    currentAction = action;
    isDancing = true;
}

function pauseDance() {
    if (!mixer || !currentAction || !isDancing) return;

    // Stop dance but keep last frame
    currentAction.paused = true;
    isDancing = false;
}

function resetDance() {
    if (!mixer || !animationActions['TPose']) return;

    // Stop current dance action
    if (currentAction) {
        currentAction.stop();
    }

    // Reset to TPose
    const tpose = animationActions['TPose'];
    tpose.reset();
    tpose.play();
    tpose.paused = true;

    currentAction = tpose;
    isDancing = false;
}

// ====================
// Music Control Functions
// ====================
async function playSelectedMusic() {
    if (!currentTrack) {
        showNotification('Please select a music track first!', 'warning');
        return;
    }
    if (!avatarLoaded) {
        showNotification('Avatar is still loading. Please wait...', 'warning');
        return;
    }

    try {
        await fetch(`/api/play/${currentTrack.id}`, { method: 'POST' });

        await audioPlayer.play();
        musicPlaying = true;

        // Start dance animation
        startDance();

        // Update UI
        document.getElementById('musicStatus').textContent = 'Playing';
        document.getElementById('musicStatus').style.color = '#1dd1a1';

        const currentTrackElement = document.querySelector('.track-item.active');
        if (currentTrackElement) currentTrackElement.style.animation = 'pulse 2s infinite';

        showNotification(`Now playing: ${currentTrack.name}`, 'success');
    } catch (error) {
        console.error('Error playing music:', error);
        showNotification('Failed to play music. Please try again.', 'error');
    }
}

function pauseMusic() {
    if (!musicPlaying) return;

    fetch('/api/pause', { method: 'POST' })
        .then(() => {
            audioPlayer.pause();
            musicPlaying = false;

            // Pause dance animation
            pauseDance();

            document.getElementById('musicStatus').textContent = 'Paused';
            document.getElementById('musicStatus').style.color = '#ffd166';

            const currentTrackElement = document.querySelector('.track-item.active');
            if (currentTrackElement) currentTrackElement.style.animation = '';

            showNotification('Music paused', 'info');
        })
        .catch(error => {
            console.error('Error pausing music:', error);
            showNotification('Failed to pause music', 'error');
        });
}

function stopMusic() {
    fetch('/api/reset', { method: 'POST' })
        .then(() => {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            musicPlaying = false;

            // Reset dance animation
            resetDance();

            document.getElementById('musicStatus').textContent = 'Stopped';
            document.getElementById('musicStatus').style.color = '#ff6b6b';

            const currentTrackElement = document.querySelector('.track-item.active');
            if (currentTrackElement) {
                currentTrackElement.classList.remove('active');
                currentTrackElement.style.animation = '';
            }

            currentTrack = null;

            showNotification('Music stopped', 'info');
        })
        .catch(error => {
            console.error('Error stopping music:', error);
            showNotification('Failed to stop music', 'error');
        });
}


function updateMusicProgress() {
    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100 || 0;
    document.getElementById('musicProgress').style.width = `${progress}%`;
    
    document.getElementById('currentTime').textContent = 
        formatTime(audioPlayer.currentTime);
    document.getElementById('totalTime').textContent = 
        formatTime(audioPlayer.duration);
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function handleMusicEnded() {
    musicPlaying = false;
    document.getElementById('musicStatus').textContent = 'Ended';
    document.getElementById('musicStatus').style.color = '#ff6b6b';
    
    const currentTrackElement = document.querySelector('.track-item.active');
    if (currentTrackElement) {
        currentTrackElement.style.animation = '';
    }
}

function handleAudioError(error) {
    console.error('Audio error:', error);
    showNotification('Audio playback error. Check file format and path.', 'error');
    document.getElementById('audioStatus').textContent = 'Error';
    document.getElementById('audioStatus').style.color = '#ff6b6b';
}

// function connectWebSocket() {
//     const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
//     const wsUrl = `${protocol}//${window.location.host}/ws`;
    
//     socket = new WebSocket(wsUrl);
    
//     socket.onopen = () => {
//         console.log('✅ WebSocket connected');
//         isConnected = true;
        
//         document.getElementById('connectionStatus').style.background = '#4ecdc4';
//         document.getElementById('connectionText').textContent = 'Connected';
//         document.getElementById('wsStatus').textContent = 'Connected';
//         document.getElementById('wsStatus').style.color = '#4ecdc4';
        
//         // Request initial pose
//         requestPose();
//     };
    
//     socket.onmessage = (event) => {
//         try {
//             const data = JSON.parse(event.data);
            
//             if (data.type === 'ping') {
//                 // Keep-alive ping, update latency
//                 updateLatency();
//                 return;
//             }
            
//             if (data.type === 'connected') {
//                 console.log('🔗 Server:', data.message);
//                 return;
//             }
            
//             if (data.type === 'music_start' || data.type === 'music_resume') {
//                 console.log('🎵 Music started/resumed');
//                 musicPlaying = true;
//                 return;
//             }
            
//             if (data.type === 'music_pause') {
//                 console.log('⏸ Music paused');
//                 musicPlaying = false;
//                 return;
//             }
            
//             if (data.type === 'reset') {
//                 console.log('🔄 Avatar reset');
//                 resetAvatar();
//                 return;
//             }
            
//             // Handle pose data
//             applyPoseToAvatar(data);
//             updatePoseInfo(data);
            
//             // Request next pose if music is playing
//             if (musicPlaying) {
//                 requestPose();
//             }
            
//         } catch (error) {
//             console.error('Error parsing WebSocket message:', error);
//         }
//     };
    
//     socket.onclose = () => {
//         console.log('❌ WebSocket disconnected');
//         isConnected = false;
        
//         document.getElementById('connectionStatus').style.background = '#ff6b6b';
//         document.getElementById('connectionText').textContent = 'Disconnected';
//         document.getElementById('wsStatus').textContent = 'Disconnected';
//         document.getElementById('wsStatus').style.color = '#ff6b6b';
        
//         // Try to reconnect after 3 seconds
//         setTimeout(connectWebSocket, 3000);
//     };
    
//     socket.onerror = (error) => {
//         console.error('WebSocket error:', error);
//     };
// }

function requestPose() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send('get_pose');
        frameCount++;
        
        // Update FPS
        const now = performance.now();
        if (now - lastFpsUpdate >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastFpsUpdate = now;
            document.getElementById('fpsCounter').textContent = fps;
        }
    }
}

function updatePoseInfo(poseData) {
    if (!poseData) return;
    
    // Update timestamp
    if (poseData.timestamp !== undefined) {
        document.getElementById('poseTime').textContent = 
            `${poseData.timestamp.toFixed(2)}s`;
    }
    
    // Update stream rate
    const now = Date.now();
    if (lastPoseTime > 0) {
        const streamRate = 1000 / (now - lastPoseTime);
        document.getElementById('streamRate').textContent = 
            `${Math.min(streamRate, 30).toFixed(1)} Hz`;
    }
    lastPoseTime = now;
    
    // Update active joints count
    if (poseData.joints) {
        const activeJoints = Object.keys(poseData.joints).length;
        document.getElementById('activeJoints').textContent = activeJoints;
    }
}

function updateLatency() {
    // Simple latency simulation
    const latency = Math.floor(Math.random() * 50) + 20;
    document.getElementById('latency').textContent = `${latency}ms`;
}

function updateUIStats() {
    // Update various UI statistics
    const now = Date.now();
    
    // Update audio status
    if (audioPlayer) {
        if (audioPlayer.error) {
            document.getElementById('audioStatus').textContent = 'Error';
            document.getElementById('audioStatus').style.color = '#ff6b6b';
        } else if (musicPlaying) {
            document.getElementById('audioStatus').textContent = 'Playing';
            document.getElementById('audioStatus').style.color = '#1dd1a1';
        } else if (audioPlayer.paused) {
            document.getElementById('audioStatus').textContent = 'Paused';
            document.getElementById('audioStatus').style.color = '#ffd166';
        } else {
            document.getElementById('audioStatus').textContent = 'Ready';
            document.getElementById('audioStatus').style.color = '#4ecdc4';
        }
    }
}

function resetCameraView() {
    if (controls) {
        controls.reset();
        showNotification('Camera view reset', 'info');
    }
}

function toggleGrid() {
    if (scene.userData.gridHelper) {
        scene.userData.gridHelper.visible = !scene.userData.gridHelper.visible;
        showNotification(
            scene.userData.gridHelper.visible ? 'Grid shown' : 'Grid hidden',
            'info'
        );
    }
}

function toggleLights() {
    if (scene.userData.lights) {
        const enabled = !scene.userData.lightsEnabled;
        scene.userData.lightsEnabled = enabled;
        
        Object.values(scene.userData.lights).forEach(light => {
            if (light) light.visible = enabled;
        });
        
        showNotification(
            enabled ? 'Lights on' : 'Lights off',
            'info'
        );
    }
}

function onWindowResize() {
    const container = document.getElementById('avatarContainer');
    if (camera && renderer) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    if (controls) {
        controls.update();
    }
    
    // Update animation mixer
    if (mixer) {
        const delta = clock.getDelta();
        mixer.update(delta);
    }
    
    // Add subtle idle animation when not dancing
    if (!musicPlaying && avatar) {
        const time = Date.now() * 0.001;
        const idleMovement = Math.sin(time) * 0.02;
        
        // Gentle breathing motion
        avatar.traverse((node) => {
            if (node.isBone && (node.name.toLowerCase().includes('chest') || node.name.toLowerCase().includes('spine'))) {
                node.rotation.x = idleMovement * 0.1;
            }
        });
    }
    
    // Render scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${getNotificationIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${getNotificationColor(type)};
        color: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    // Add keyframe animation
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

function getNotificationColor(type) {
    const colors = {
        'success': 'linear-gradient(45deg, #1dd1a1, #10ac84)',
        'error': 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
        'warning': 'linear-gradient(45deg, #ffd166, #ff9e00)',
        'info': 'linear-gradient(45deg, #54a0ff, #2e86de)'
    };
    return colors[type] || '#4ecdc4';
}

// Export for debugging
window.app = {
    scene,
    camera,
    renderer,
    avatar,
    socket,
    danceIntensity,
    resetAvatar,
    playSelectedMusic,
    pauseMusic,
    stopMusic,
    applyPoseToAvatar
};

console.log('🚀 MJ Dance Avatar is ready!');