class DanceVisualizer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.socket = null;
        
        // Avatar components
        this.avatar = {
            head: null,
            body: null,
            leftArm: null,
            rightArm: null,
            leftLeg: null,
            rightLeg: null,
            leftForearm: null,
            rightForearm: null,
            leftShin: null,
            rightShin: null
        };
        
        // Avatar group
        this.avatarGroup = null;
        
        // Style indicator
        this.styleDisc = null;
        
        // Stats
        this.frameCount = 0;
        this.startTime = null;
        this.lastFrameTime = performance.now();
        this.fps = 0;
        this.fpsSamples = [];
        
        // State
        this.currentStyle = 'afrobeats';
        this.isStreaming = true;
        this.isPlaying = false;
        
        // DOM Elements
        this.elements = {
            styleButtons: document.getElementById('styleButtons'),
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            resetBtn: document.getElementById('resetBtn'),
            durationSlider: document.getElementById('duration'),
            durationValue: document.getElementById('durationValue'),
            streamMode: document.getElementById('streamMode'),
            sessionMode: document.getElementById('sessionMode'),
            poseData: document.getElementById('poseData'),
            fpsDisplay: document.getElementById('fps'),
            frameCountDisplay: document.getElementById('frameCount'),
            timeElapsedDisplay: document.getElementById('timeElapsed'),
            currentStyleDisplay: document.getElementById('currentStyle'),
            currentFPS: document.getElementById('currentFPS'),
            threeContainer: document.getElementById('threeContainer'),
            resetViewBtn: document.getElementById('resetViewBtn'),
            frontViewBtn: document.getElementById('frontViewBtn'),
            topViewBtn: document.getElementById('topViewBtn'),
            sideViewBtn: document.getElementById('sideViewBtn')
        };
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadStyles();
        this.initThreeJS();
        this.animate();
    }
    
    async loadStyles() {
        try {
            const response = await fetch('/api/styles');
            const styles = await response.json();
            this.renderStyleButtons(styles);
        } catch (error) {
            console.error('Failed to load styles:', error);
            // Fallback to default styles
            this.renderStyleButtons(['afrobeats', 'hiphop', 'electro', 'salsa', 'robot']);
        }
    }
    
    renderStyleButtons(styles) {
        this.elements.styleButtons.innerHTML = '';
        
        styles.forEach(style => {
            const btn = document.createElement('button');
            btn.className = `style-btn ${style === this.currentStyle ? 'active' : ''}`;
            btn.innerHTML = `<i class="fas fa-${this.getStyleIcon(style)}"></i> ${style}`;
            btn.dataset.style = style;
            btn.addEventListener('click', () => this.setStyle(style));
            this.elements.styleButtons.appendChild(btn);
        });
    }
    
    getStyleIcon(style) {
        const icons = {
            'afrobeats': 'drum',
            'hiphop': 'headphones',
            'electro': 'bolt',
            'salsa': 'fire',
            'robot': 'robot'
        };
        return icons[style] || 'music';
    }
    
    setupEventListeners() {
        // Style buttons handled in renderStyleButtons
        
        // Mode buttons
        this.elements.streamMode.addEventListener('click', () => this.setMode(true));
        this.elements.sessionMode.addEventListener('click', () => this.setMode(false));
        
        // Control buttons
        this.elements.startBtn.addEventListener('click', () => this.startDance());
        this.elements.stopBtn.addEventListener('click', () => this.stopDance());
        this.elements.resetBtn.addEventListener('click', () => this.resetAvatar());
        
        // Duration slider
        this.elements.durationSlider.addEventListener('input', (e) => {
            this.elements.durationValue.textContent = `${e.target.value}s`;
        });
        
        // View control buttons
        this.elements.resetViewBtn.addEventListener('click', () => this.resetView());
        this.elements.frontViewBtn.addEventListener('click', () => this.setView('front'));
        this.elements.topViewBtn.addEventListener('click', () => this.setView('top'));
        this.elements.sideViewBtn.addEventListener('click', () => this.setView('side'));
        
        // Add dancing class to body when active
        this.elements.startBtn.addEventListener('click', () => {
            document.body.classList.add('is-dancing');
        });
        
        this.elements.stopBtn.addEventListener('click', () => {
            document.body.classList.remove('is-dancing');
        });
        
        this.elements.resetBtn.addEventListener('click', () => {
            document.body.classList.remove('is-dancing');
        });
    }
    
    setStyle(style) {
        this.currentStyle = style;
        this.elements.currentStyleDisplay.textContent = style;
        
        // Update active style button
        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.style === style);
        });
        
        // Update style disc color if available
        if (this.styleDisc) {
            const styleColors = {
                'afrobeats': '#FF6B35',
                'hiphop': '#004E89',
                'electro': '#EF476F',
                'salsa': '#06D6A0',
                'robot': '#5A189A'
            };
            const color = styleColors[style] || '#4361EE';
            this.styleDisc.material.color.set(color);
        }
        
        // Update color if streaming
        if (this.isPlaying && this.isStreaming && this.socket) {
            this.sendStyleUpdate(style);
        }
    }
    
    setMode(isStreaming) {
        this.isStreaming = isStreaming;
        this.elements.streamMode.classList.toggle('active', isStreaming);
        this.elements.sessionMode.classList.toggle('active', !isStreaming);
        
        // Update UI based on mode
        this.elements.durationSlider.disabled = isStreaming;
        this.elements.durationValue.style.opacity = isStreaming ? '0.5' : '1';
    }
    
    initThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x121212);
        
        // Camera
        const container = this.elements.threeContainer;
        this.camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 2, 5);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);
        
        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI / 1.5;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        this.scene.add(directionalLight);
        
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-5, 5, -5);
        this.scene.add(backLight);
        
        // Create environment
        this.createEnvironment();
        
        // Create avatar
        this.createAvatar();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Add some particles for atmosphere
        this.createParticles();
    }
    
    createEnvironment() {
        // Floor with gradient
        const floorGeometry = new THREE.PlaneGeometry(20, 20, 1, 1);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.01;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Reflective floor
        const floorMirrorGeometry = new THREE.PlaneGeometry(18, 18);
        const floorMirrorMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.3
        });
        const floorMirror = new THREE.Mesh(floorMirrorGeometry, floorMirrorMaterial);
        floorMirror.rotation.x = -Math.PI / 2;
        floorMirror.position.y = 0.001;
        floorMirror.receiveShadow = true;
        this.scene.add(floorMirror);
        
        // Grid helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        gridHelper.position.y = 0.002;
        this.scene.add(gridHelper);
        
        // Back wall
        const wallGeometry = new THREE.PlaneGeometry(15, 8);
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.9,
            side: THREE.DoubleSide
        });
        const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
        backWall.position.set(0, 4, -10);
        backWall.receiveShadow = true;
        this.scene.add(backWall);
        
        // Stage lights
        const lightColors = [0xFF6B35, 0x4CC9F0, 0x06D6A0, 0x7209B7];
        for (let i = 0; i < 4; i++) {
            const light = new THREE.PointLight(lightColors[i], 0.8, 15);
            light.position.set(
                (i - 1.5) * 4,
                5,
                -8
            );
            this.scene.add(light);
            
            // Light glow
            const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: lightColors[i],
                transparent: true,
                opacity: 0.7
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(light.position);
            this.scene.add(glow);
            
            // Light beam
            const beamGeometry = new THREE.CylinderGeometry(0.1, 0.3, 4, 8);
            const beamMaterial = new THREE.MeshBasicMaterial({
                color: lightColors[i],
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide
            });
            const beam = new THREE.Mesh(beamGeometry, beamMaterial);
            beam.position.copy(light.position);
            beam.position.y = 2.5;
            beam.rotation.x = Math.PI / 2;
            this.scene.add(beam);
        }
    }
    
    createParticles() {
        const particleCount = 100;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 30;
            positions[i * 3 + 1] = Math.random() * 15;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
            
            colors[i * 3] = Math.random() * 0.5 + 0.5;
            colors[i * 3 + 1] = Math.random() * 0.5 + 0.5;
            colors[i * 3 + 2] = Math.random() * 0.5 + 0.5;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });
        
        const particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(particleSystem);
        this.particleSystem = particleSystem;
    }
    
    createAvatar() {
        // Create avatar group
        this.avatarGroup = new THREE.Group();
        this.scene.add(this.avatarGroup);
        
        // Materials
        const skinMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFCC99,
            roughness: 0.8,
            metalness: 0.2
        });
        
        const clothingMaterial = new THREE.MeshStandardMaterial({
            color: 0x4361EE,
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Head (sphere)
        const headGeometry = new THREE.SphereGeometry(0.2, 32, 32);
        this.avatar.head = new THREE.Mesh(headGeometry, skinMaterial);
        this.avatar.head.castShadow = true;
        this.avatar.head.position.y = 1.7;
        this.avatarGroup.add(this.avatar.head);
        
        // Body (capsule)
        const bodyGeometry = new THREE.CapsuleGeometry(0.25, 0.8, 8, 16);
        this.avatar.body = new THREE.Mesh(bodyGeometry, clothingMaterial);
        this.avatar.body.castShadow = true;
        this.avatar.body.position.y = 1.2;
        this.avatarGroup.add(this.avatar.body);
        
        // Upper arms
        const armGeometry = new THREE.CapsuleGeometry(0.08, 0.5, 4, 8);
        
        // Left arm
        this.avatar.leftArm = new THREE.Mesh(armGeometry, clothingMaterial);
        this.avatar.leftArm.castShadow = true;
        this.avatar.leftArm.position.set(-0.45, 1.3, 0);
        this.avatar.leftArm.rotation.z = Math.PI / 2;
        this.avatarGroup.add(this.avatar.leftArm);
        
        // Right arm
        this.avatar.rightArm = new THREE.Mesh(armGeometry, clothingMaterial);
        this.avatar.rightArm.castShadow = true;
        this.avatar.rightArm.position.set(0.45, 1.3, 0);
        this.avatar.rightArm.rotation.z = Math.PI / 2;
        this.avatarGroup.add(this.avatar.rightArm);
        
        // Legs
        const legGeometry = new THREE.CapsuleGeometry(0.1, 0.7, 4, 8);
        
        // Left leg
        this.avatar.leftLeg = new THREE.Mesh(legGeometry, clothingMaterial);
        this.avatar.leftLeg.castShadow = true;
        this.avatar.leftLeg.position.set(-0.2, 0.5, 0);
        this.avatarGroup.add(this.avatar.leftLeg);
        
        // Right leg
        this.avatar.rightLeg = new THREE.Mesh(legGeometry, clothingMaterial);
        this.avatar.rightLeg.castShadow = true;
        this.avatar.rightLeg.position.set(0.2, 0.5, 0);
        this.avatarGroup.add(this.avatar.rightLeg);
        
        // Forearms (skin)
        const forearmGeometry = new THREE.CapsuleGeometry(0.06, 0.4, 4, 8);
        
        // Left forearm
        this.avatar.leftForearm = new THREE.Mesh(forearmGeometry, skinMaterial);
        this.avatar.leftForearm.castShadow = true;
        this.avatar.leftForearm.position.set(-0.45, 1.3, -0.2);
        this.avatar.leftForearm.rotation.z = Math.PI / 2;
        this.avatarGroup.add(this.avatar.leftForearm);
        
        // Right forearm
        this.avatar.rightForearm = new THREE.Mesh(forearmGeometry, skinMaterial);
        this.avatar.rightForearm.castShadow = true;
        this.avatar.rightForearm.position.set(0.45, 1.3, 0.2);
        this.avatar.rightForearm.rotation.z = Math.PI / 2;
        this.avatarGroup.add(this.avatar.rightForearm);
        
        // Shins (skin)
        const shinGeometry = new THREE.CapsuleGeometry(0.08, 0.6, 4, 8);
        
        // Left shin
        this.avatar.leftShin = new THREE.Mesh(shinGeometry, skinMaterial);
        this.avatar.leftShin.castShadow = true;
        this.avatar.leftShin.position.set(-0.2, 0.2, 0);
        this.avatarGroup.add(this.avatar.leftShin);
        
        // Right shin
        this.avatar.rightShin = new THREE.Mesh(shinGeometry, skinMaterial);
        this.avatar.rightShin.castShadow = true;
        this.avatar.rightShin.position.set(0.2, 0.2, 0);
        this.avatarGroup.add(this.avatar.rightShin);
        
        // Add style indicator above head
        this.createStyleIndicator();
        
        // Add a simple face
        this.createFace();
    }
    
    createStyleIndicator() {
        // Create a floating disc above the avatar
        const discGeometry = new THREE.RingGeometry(0.4, 0.5, 32);
        const discMaterial = new THREE.MeshBasicMaterial({
            color: 0x4361EE,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        this.styleDisc = new THREE.Mesh(discGeometry, discMaterial);
        this.styleDisc.position.y = 2.5;
        this.styleDisc.rotation.x = Math.PI / 2;
        this.avatarGroup.add(this.styleDisc);
        
        // Add inner circle
        const innerDiscGeometry = new THREE.CircleGeometry(0.3, 32);
        const innerDiscMaterial = new THREE.MeshBasicMaterial({
            color: 0x4361EE,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        this.innerDisc = new THREE.Mesh(innerDiscGeometry, innerDiscMaterial);
        this.innerDisc.position.y = 2.51;
        this.innerDisc.rotation.x = Math.PI / 2;
        this.avatarGroup.add(this.innerDisc);
    }
    
    createFace() {
        // Simple eyes
        const eyeGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        
        // Left eye
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.06, 1.72, 0.18);
        this.avatarGroup.add(leftEye);
        
        // Right eye
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.06, 1.72, 0.18);
        this.avatarGroup.add(rightEye);
        
        // Simple mouth (arc)
        const mouthGeometry = new THREE.TorusGeometry(0.05, 0.01, 4, 8, Math.PI);
        const mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, 1.65, 0.18);
        mouth.rotation.x = Math.PI;
        this.avatarGroup.add(mouth);
    }
    
    updateAvatar(pose) {
        // Update head with smooth movement
        if (pose.head && this.avatar.head) {
            this.avatar.head.position.lerp(
                new THREE.Vector3(pose.head.x, pose.head.y, pose.head.z),
                0.3
            );
            
            // Add slight head tilt based on torso movement
            if (pose.body) {
                this.avatar.head.rotation.z = pose.body.x * 0.3;
            }
        }
        
        // Update body with smooth movement
        if (pose.body && this.avatar.body) {
            this.avatar.body.position.lerp(
                new THREE.Vector3(pose.body.x, pose.body.y, pose.body.z),
                0.3
            );
            
            // Add torso rotation based on sway
            this.avatar.body.rotation.z = pose.body.x * 0.5;
            this.avatar.body.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
        }
        
        // Update left arm with natural movement
        if (pose.leftArm && this.avatar.leftArm) {
            this.updateLimb(this.avatar.leftArm, pose.leftArm);
            
            // Update forearm position relative to upper arm
            if (this.avatar.leftForearm) {
                const forearmPos = new THREE.Vector3(
                    pose.leftArm.x,
                    pose.leftArm.y - 0.25,
                    pose.leftArm.z - 0.2
                );
                this.avatar.leftForearm.position.lerp(forearmPos, 0.3);
                
                // Add forearm rotation for more natural movement
                this.avatar.leftForearm.rotation.z = pose.leftArm.z * 2 + Math.PI / 2;
                this.avatar.leftForearm.rotation.x = Math.sin(pose.leftArm.z * 3) * 0.5;
            }
        }
        
        // Update right arm with natural movement
        if (pose.rightArm && this.avatar.rightArm) {
            this.updateLimb(this.avatar.rightArm, pose.rightArm);
            
            // Update forearm position relative to upper arm
            if (this.avatar.rightForearm) {
                const forearmPos = new THREE.Vector3(
                    pose.rightArm.x,
                    pose.rightArm.y - 0.25,
                    pose.rightArm.z + 0.2
                );
                this.avatar.rightForearm.position.lerp(forearmPos, 0.3);
                
                // Add forearm rotation for more natural movement
                this.avatar.rightForearm.rotation.z = -pose.rightArm.z * 2 + Math.PI / 2;
                this.avatar.rightForearm.rotation.x = Math.sin(-pose.rightArm.z * 3) * 0.5;
            }
        }
        
        // Update left leg with natural movement
        if (pose.leftLeg && this.avatar.leftLeg) {
            this.updateLimb(this.avatar.leftLeg, pose.leftLeg);
            
            // Update shin position relative to leg
            if (this.avatar.leftShin) {
                const shinPos = new THREE.Vector3(
                    pose.leftLeg.x,
                    pose.leftLeg.y - 0.35,
                    pose.leftLeg.z - 0.2
                );
                this.avatar.leftShin.position.lerp(shinPos, 0.3);
                
                // Add knee bend
                this.avatar.leftShin.rotation.z = pose.leftLeg.z * 1.5;
            }
        }
        
        // Update right leg with natural movement
        if (pose.rightLeg && this.avatar.rightLeg) {
            this.updateLimb(this.avatar.rightLeg, pose.rightLeg);
            
            // Update shin position relative to leg
            if (this.avatar.rightShin) {
                const shinPos = new THREE.Vector3(
                    pose.rightLeg.x,
                    pose.rightLeg.y - 0.35,
                    pose.rightLeg.z + 0.2
                );
                this.avatar.rightShin.position.lerp(shinPos, 0.3);
                
                // Add knee bend
                this.avatar.rightShin.rotation.z = pose.rightLeg.z * 1.5;
            }
        }
        
        // Update style disc position and color
        if (this.styleDisc && this.avatar.head) {
            const discPos = new THREE.Vector3(
                this.avatar.head.position.x,
                this.avatar.head.position.y + 0.8,
                this.avatar.head.position.z
            );
            this.styleDisc.position.lerp(discPos, 0.1);
            this.innerDisc.position.copy(this.styleDisc.position);
            
            // Rotate disc
            this.styleDisc.rotation.y += 0.01;
            this.innerDisc.rotation.y -= 0.02;
            
            // Update color if provided in pose
            if (pose.color) {
                this.styleDisc.material.color.set(pose.color);
                this.innerDisc.material.color.set(pose.color);
            }
        }
        
        // Make the avatar face forward based on torso position
        if (this.avatarGroup && pose.body) {
            this.avatarGroup.rotation.y = pose.body.x * 0.2;
        }
    }
    
    updateLimb(limb, pose) {
        // Smooth position update
        const targetPos = new THREE.Vector3(pose.x, pose.y, pose.z);
        limb.position.lerp(targetPos, 0.3);
        
        // Add natural rotation based on movement
        limb.rotation.z = pose.z * 1.5 + Math.PI / 2;
        
        // Add slight swing
        limb.rotation.x = Math.sin(pose.z * 2) * 0.2;
    }
    
    async startDance() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.startTime = performance.now();
        this.frameCount = 0;
        
        // Update UI
        this.elements.startBtn.disabled = true;
        this.elements.stopBtn.disabled = false;
        
        // Connect to WebSocket
        await this.connectWebSocket();
    }
    
    stopDance() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        
        // Update UI
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        
        // Close WebSocket
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
    
    resetAvatar() {
        // Reset to default T-pose
        const defaultPose = {
            head: { x: 0, y: 1.7, z: 0 },
            body: { x: 0, y: 1.2, z: 0 },
            leftArm: { x: -0.45, y: 1.3, z: 0 },
            rightArm: { x: 0.45, y: 1.3, z: 0 },
            leftLeg: { x: -0.25, y: 0.5, z: 0 },
            rightLeg: { x: 0.25, y: 0.5, z: 0 }
        };
        
        this.updateAvatar(defaultPose);
        this.stopDance();
        
        // Reset camera to default view
        this.resetView();
    }
    
    resetView() {
        this.camera.position.set(0, 2, 5);
        this.controls.target.set(0, 1.2, 0);
        this.controls.update();
    }
    
    setView(type) {
        switch(type) {
            case 'front':
                this.camera.position.set(0, 1.5, 8);
                this.controls.target.set(0, 1.2, 0);
                break;
            case 'top':
                this.camera.position.set(0, 8, 0.1); // Slight offset to avoid looking straight down
                this.controls.target.set(0, 1.2, 0);
                break;
            case 'side':
                this.camera.position.set(8, 1.5, 0);
                this.controls.target.set(0, 1.2, 0);
                break;
        }
        this.controls.update();
    }
    
    async connectWebSocket() {
        const endpoint = this.isStreaming ? '/ws/dance/stream' : '/ws/dance';
        
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}${endpoint}`;
            
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                console.log('WebSocket connected');
                
                if (this.isStreaming) {
                    // For streaming, send initial style
                    this.sendStyleUpdate(this.currentStyle);
                } else {
                    // For session, send initialization data
                    const duration = parseInt(this.elements.durationSlider.value);
                    this.socket.send(JSON.stringify({
                        style: this.currentStyle,
                        duration: duration
                    }));
                }
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const pose = JSON.parse(event.data);
                    
                    // Check if session completed
                    if (pose.status === 'complete') {
                        console.log(`Session completed. Frames: ${pose.frames_sent}`);
                        this.stopDance();
                        
                        // Show completion message
                        this.elements.poseData.textContent = JSON.stringify({
                            status: 'Session Completed',
                            frames: pose.frames_sent,
                            duration: pose.duration,
                            message: 'Click Start Dancing to begin again'
                        }, null, 2);
                        return;
                    }
                    
                    // Update avatar with new pose
                    this.updateAvatar(pose);
                    
                    // Update stats
                    this.frameCount++;
                    const elapsed = (performance.now() - this.startTime) / 1000;
                    
                    this.elements.frameCountDisplay.textContent = this.frameCount;
                    this.elements.timeElapsedDisplay.textContent = elapsed.toFixed(2) + 's';
                    
                    // Update current style display
                    if (pose.style && pose.style !== this.elements.currentStyleDisplay.textContent) {
                        this.elements.currentStyleDisplay.textContent = pose.style;
                    }
                    
                    // Update pose data display (limited to recent data for performance)
                    if (this.frameCount % 5 === 0) { // Update every 5 frames
                        this.elements.poseData.textContent = JSON.stringify(pose, null, 2);
                    }
                    
                } catch (error) {
                    console.error('Error parsing pose data:', error);
                }
            };
            
            this.socket.onclose = () => {
                console.log('WebSocket disconnected');
                if (this.isPlaying) {
                    this.stopDance();
                }
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.stopDance();
                
                // Show error message
                this.elements.poseData.textContent = `WebSocket Error: ${error.message}\n\nCheck if server is running and refresh the page.`;
            };
            
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.stopDance();
            
            // Show connection error
            this.elements.poseData.textContent = `Connection Error: ${error.message}\n\nMake sure the server is running at ${window.location.host}`;
        }
    }
    
    sendStyleUpdate(style) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ style: style }));
        }
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        const container = this.elements.threeContainer;
        this.camera.aspect = container.clientWidth / container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(container.clientWidth, container.clientHeight);
    }
    
    calculateSmoothFPS() {
        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;
        this.fpsSamples.push(1000 / deltaTime);
        
        if (this.fpsSamples.length > 60) {
            this.fpsSamples.shift();
        }
        
        // Calculate average FPS
        const sum = this.fpsSamples.reduce((a, b) => a + b, 0);
        this.fps = Math.round(sum / this.fpsSamples.length);
        
        this.lastFrameTime = now;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Calculate smooth FPS
        this.calculateSmoothFPS();
        
        // Update FPS display
        this.elements.fpsDisplay.textContent = this.fps;
        this.elements.currentFPS.textContent = this.fps;
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Add subtle idle animation when not dancing
        if (!this.isPlaying && this.avatarGroup) {
            const time = performance.now() * 0.001;
            
            // Gentle breathing motion
            this.avatar.body.position.y = 1.2 + Math.sin(time * 0.5) * 0.02;
            
            // Slight sway
            this.avatarGroup.rotation.y = Math.sin(time * 0.2) * 0.05;
            
            // Gentle arm movement
            if (this.avatar.leftArm) {
                this.avatar.leftArm.rotation.z = Math.PI / 2 + Math.sin(time * 0.3) * 0.05;
            }
            if (this.avatar.rightArm) {
                this.avatar.rightArm.rotation.z = Math.PI / 2 + Math.sin(time * 0.3 + Math.PI) * 0.05;
            }
        }
        
        // Animate particles
        if (this.particleSystem) {
            this.particleSystem.rotation.y += 0.001;
            this.particleSystem.rotation.x += 0.0005;
        }
        
        // Animate style disc when dancing
        if (this.isPlaying && this.styleDisc) {
            this.styleDisc.rotation.y += 0.02;
            this.innerDisc.rotation.y -= 0.03;
            
            // Pulsing effect
            const pulse = Math.sin(performance.now() * 0.003) * 0.1 + 0.9;
            this.styleDisc.scale.setScalar(pulse);
            this.innerDisc.scale.setScalar(pulse);
        }
        
        // Render the scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        const visualizer = new DanceVisualizer();
        
        // Make visualizer available globally for debugging
        window.danceVisualizer = visualizer;
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    if (visualizer.isPlaying) {
                        visualizer.stopDance();
                    } else {
                        visualizer.startDance();
                    }
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                    const styles = ['afrobeats', 'hiphop', 'electro', 'salsa', 'robot'];
                    const index = parseInt(e.key) - 1;
                    if (styles[index]) {
                        visualizer.setStyle(styles[index]);
                    }
                    break;
                case 'r':
                case 'R':
                    visualizer.resetAvatar();
                    break;
                case 'f':
                case 'F':
                    visualizer.setView('front');
                    break;
            }
        });
        
        console.log('Dance Visualizer initialized successfully!');
        
    } catch (error) {
        console.error('Failed to initialize Dance Visualizer:', error);
        document.getElementById('poseData').textContent = `Initialization Error: ${error.message}\n\nPlease refresh the page.`;
    }
});