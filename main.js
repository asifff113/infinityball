// Three.js is loaded via CDN script tag

// Wait for DOM and Three.js to be ready
function init() {
    // Check if THREE is loaded
    if (typeof THREE === 'undefined') {
        console.error('Three.js is not loaded!');
        setTimeout(init, 100);
        return;
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011); // Dark blue background

    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000011, 1);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Infinity space effect - grid pattern
    function createInfinityGrid() {
        const gridHelper = new THREE.GridHelper(200, 200, 0x00ffff, 0x004444);
        gridHelper.material.opacity = 0.5;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);

        // Add multiple grid layers at different depths for infinity effect
        for (let i = 1; i < 5; i++) {
            const grid = new THREE.GridHelper(200, 200, 0x00ffff, 0x004444);
            grid.material.opacity = 0.3 / i;
            grid.material.transparent = true;
            grid.position.z = -i * 50;
            scene.add(grid);
        }

        // Add stars/particles for depth
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 5000;
        const positions = new Float32Array(starsCount * 3);

        for (let i = 0; i < starsCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 1000;
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            transparent: true,
            opacity: 0.9
        });
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(stars);
        return stars;
    }

    // Create the ball
    function createBall() {
        const geometry = new THREE.SphereGeometry(1.5, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            metalness: 0.3,
            roughness: 0.7
        });
        const ball = new THREE.Mesh(geometry, material);
        
        scene.add(ball);
        return ball;
    }

    // Lighting - make it brighter
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00ffff, 2, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff00ff, 1, 100);
    pointLight2.position.set(-10, -10, -10);
    scene.add(pointLight2);

    // Create infinity space and ball
    const stars = createInfinityGrid();
    const ball = createBall();
    ball.position.set(0, 0, 0);

    // Marks system
    let markCounter = 1;
    const marks = [];
    const ballTrail = []; // Trail positions
    const maxTrailLength = 50;
    
    // Feature 1: Ball trail/particles
    function createTrailParticles() {
        const trailGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(maxTrailLength * 3);
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const trailMaterial = new THREE.PointsMaterial({
            color: 0xff0000, // Will be updated when theme is applied
            size: 0.2,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        const trail = new THREE.Points(trailGeometry, trailMaterial);
        scene.add(trail);
        return trail;
    }
    let trailParticles = null; // Will be initialized after themes
    
    // Feature 4: Speed boost system
    let speedBoostActive = false;
    const normalMoveSpeed = 0.15;
    const boostMoveSpeed = 0.4;
    let currentMoveSpeed = normalMoveSpeed;
    
    // Feature 9: Mark types system
    const markTypes = {
        WAYPOINT: { color: 0xffff00, name: 'Waypoint' },
        CHECKPOINT: { color: 0x00ff00, name: 'Checkpoint' },
        GOAL: { color: 0xff00ff, name: 'Goal' },
        SPECIAL: { color: 0x00ffff, name: 'Special' }
    };
    let currentMarkType = markTypes.WAYPOINT;
    
    
    // Feature 12: Camera modes
    let cameraMode = 'follow'; // 'follow', 'firstPerson', 'free', 'cinematic'
    let freeCameraEnabled = false;
    
    // Feature 15: Recording & replay
    let isRecording = false;
    let recordingEnabled = true; // Toggle to enable/disable recording feature
    let recordedPath = [];
    let isReplaying = false;
    let replayIndex = 0;
    let ghostBall = null;
    
    // Feature 3: Teleport toggle
    let teleportEnabled = true; // Toggle to enable/disable teleport feature
    let lastTPressTime = 0;
    const doubleTapDelay = 300; // milliseconds
    
    // Feature 16: Mini-map
    let miniMapEnabled = false;
    let miniMapCamera = null;
    let miniMapRenderer = null;
    let miniMapContainer = null;
    
    // Feature 17: Power-ups
    const powerUps = {
        invincibility: { active: false, duration: 0 },
        sizeBoost: { active: false, duration: 0 },
        speedBoost: { active: false, duration: 0 }
    };
    
    // Feature 18: Color themes
    const colorThemes = {
        default: {
            ball: 0xff0000,
            grid: 0x00ffff,
            background: 0x000011,
            marks: 0xffff00
        },
        neon: {
            ball: 0xff00ff,
            grid: 0x00ffff,
            background: 0x000000,
            marks: 0xffff00
        },
        sunset: {
            ball: 0xff6600,
            grid: 0xffaa00,
            background: 0x1a0033,
            marks: 0xffaa00
        },
        ocean: {
            ball: 0x00aaff,
            grid: 0x00ffff,
            background: 0x001122,
            marks: 0x00ffaa
        }
    };
    let currentTheme = colorThemes.default;

    // Function to create a text texture for mark numbers
    function createTextTexture(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 256;
        
        context.fillStyle = 'rgba(0, 0, 0, 0)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.font = 'Bold 120px Arial';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    // Function to create a mark at a position
    function createMark(position, number, type = currentMarkType) {
        const markGroup = new THREE.Group();
        
        // Create marker base (small sphere) - Feature 9: Mark types
        const markerGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const markerMaterial = new THREE.MeshStandardMaterial({
            color: type.color,
            metalness: 0.5,
            roughness: 0.5,
            emissive: type.color,
            emissiveIntensity: 0.3
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        markGroup.add(marker);
        
        // Create number display (sprite with text)
        const textTexture = createTextTexture(number.toString());
        const spriteMaterial = new THREE.SpriteMaterial({
            map: textTexture,
            transparent: true,
            alphaTest: 0.1
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(1, 1, 1);
        sprite.position.set(0, 0.8, 0);
        markGroup.add(sprite);
        
        // Add pulsing light
        const light = new THREE.PointLight(type.color, 0.5, 5);
        light.position.set(0, 0, 0);
        markGroup.add(light);
        
        markGroup.position.copy(position);
        markGroup.userData = { type: type, number: number };
        scene.add(markGroup);
        
        return markGroup;
    }

    // Function to update a mark's number display
    function updateMarkNumber(mark, newNumber) {
        // Find the sprite (should be children[1])
        const sprite = mark.children.find(child => child instanceof THREE.Sprite);
        if (sprite) {
            // Dispose old texture
            if (sprite.material.map) {
                sprite.material.map.dispose();
            }
            // Create new texture with new number
            const newTexture = createTextTexture(newNumber.toString());
            sprite.material.map = newTexture;
            sprite.material.needsUpdate = true;
        }
    }

    // Function to renumber all marks starting from 1
    function renumberMarks() {
        marks.forEach((mark, index) => {
            const newNumber = index + 1;
            updateMarkNumber(mark, newNumber);
        });
        // Update markCounter to be the next number after the last mark
        markCounter = marks.length + 1;
    }

    // Feature 3: Teleport to mark
    function teleportToMark(markNumber) {
        const markIndex = markNumber - 1;
        if (markIndex >= 0 && markIndex < marks.length) {
            const targetMark = marks[markIndex];
            // Create teleport effect
            const teleportEffect = new THREE.Mesh(
                new THREE.RingGeometry(0.5, 2, 32),
                new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                })
            );
            teleportEffect.position.copy(ball.position);
            teleportEffect.rotation.x = -Math.PI / 2;
            scene.add(teleportEffect);
            
            // Teleport ball
            ball.position.copy(targetMark.position);
            ball.position.y += 2; // Slight offset above mark
            
            // Remove effect after animation
            setTimeout(() => {
                scene.remove(teleportEffect);
                teleportEffect.geometry.dispose();
                teleportEffect.material.dispose();
            }, 500);
            
            playSound('teleport');
            return true;
        }
        return false;
    }
    
    // Feature 13: Sound effects
    const sounds = {
        place: null,
        remove: null,
        teleport: null,
        boost: null
    };
    
    function initSounds() {
        // Create audio context for sound effects
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        function createTone(frequency, duration, type = 'sine') {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        }
        
        sounds.place = () => createTone(440, 0.1, 'sine');
        sounds.remove = () => createTone(220, 0.1, 'sine');
        sounds.teleport = () => createTone(880, 0.2, 'square');
        sounds.boost = () => createTone(660, 0.15, 'sawtooth');
    }
    
    function playSound(soundName) {
        if (sounds[soundName]) {
            try {
                sounds[soundName]();
            } catch (e) {
                console.log('Sound playback failed:', e);
            }
        }
    }
    
    initSounds();
    
    // Function to place a mark at ball's current position
    function placeMark() {
        const mark = createMark(ball.position.clone(), markCounter, currentMarkType);
        marks.push(mark);
        markCounter++;
        playSound('place');
        console.log(`Mark ${markCounter - 1} placed at`, ball.position);
    }

    // Function to remove the nearest mark to the ball
    function removeNearestMark() {
        if (marks.length === 0) {
            console.log('No marks to remove');
            return;
        }

        // Find the nearest mark to the ball
        let nearestMark = null;
        let nearestDistance = Infinity;
        let nearestIndex = -1;

        marks.forEach((mark, index) => {
            const distance = ball.position.distanceTo(mark.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestMark = mark;
                nearestIndex = index;
            }
        });

        if (nearestMark) {
            // Remove from scene
            scene.remove(nearestMark);
            // Clean up children
            nearestMark.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
            // Remove from array
            marks.splice(nearestIndex, 1);
            // Renumber all remaining marks starting from 1
            renumberMarks();
            playSound('remove');
            console.log(`Mark removed. Remaining marks: ${marks.length}`);
        }
    }

    // Feature 15: Recording & replay
    function startRecording() {
        isRecording = true;
        recordedPath = [];
        console.log('Recording started');
    }
    
    function stopRecording() {
        isRecording = false;
        console.log('Recording stopped. Path length:', recordedPath.length);
    }
    
    function startReplay() {
        if (recordedPath.length === 0) {
            console.log('No recorded path to replay');
            return;
        }
        isReplaying = true;
        replayIndex = 0;
        
        // Create ghost ball
        if (!ghostBall) {
            const ghostGeometry = new THREE.SphereGeometry(1.5, 32, 32);
            const ghostMaterial = new THREE.MeshStandardMaterial({
                color: 0x888888,
                transparent: true,
                opacity: 0.5,
                wireframe: true
            });
            ghostBall = new THREE.Mesh(ghostGeometry, ghostMaterial);
            scene.add(ghostBall);
        }
        ghostBall.visible = true;
        console.log('Replay started');
    }
    
    function stopReplay() {
        isReplaying = false;
        if (ghostBall) {
            ghostBall.visible = false;
        }
        console.log('Replay stopped');
    }
    
    // Feature 16: Mini-map
    function initMiniMap() {
        miniMapContainer = document.createElement('div');
        miniMapContainer.style.position = 'absolute';
        miniMapContainer.style.bottom = '20px';
        miniMapContainer.style.right = '20px';
        miniMapContainer.style.width = '200px';
        miniMapContainer.style.height = '200px';
        miniMapContainer.style.border = '2px solid rgba(255,255,255,0.5)';
        miniMapContainer.style.borderRadius = '10px';
        miniMapContainer.style.backgroundColor = 'rgba(0,0,0,0.7)';
        miniMapContainer.style.display = 'none';
        document.body.appendChild(miniMapContainer);
        
        miniMapCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 1, 1000);
        miniMapCamera.position.set(0, 100, 0);
        miniMapCamera.lookAt(0, 0, 0);
        
        miniMapRenderer = new THREE.WebGLRenderer({ antialias: true });
        miniMapRenderer.setSize(200, 200);
        miniMapRenderer.setClearColor(0x000011, 1);
        miniMapContainer.appendChild(miniMapRenderer.domElement);
    }
    
    function toggleMiniMap() {
        miniMapEnabled = !miniMapEnabled;
        if (miniMapContainer) {
            miniMapContainer.style.display = miniMapEnabled ? 'block' : 'none';
        }
    }
    
    initMiniMap();
    
    // Feature 17: Power-ups
    function activatePowerUp(type, duration = 5000) {
        powerUps[type].active = true;
        powerUps[type].duration = duration;
        
        if (type === 'sizeBoost') {
            ball.scale.set(2, 2, 2);
        } else if (type === 'speedBoost') {
            currentMoveSpeed = boostMoveSpeed * 1.5;
        } else if (type === 'invincibility') {
            ball.material.emissive = new THREE.Color(0xffffff);
            ball.material.emissiveIntensity = 0.5;
        }
        
        setTimeout(() => {
            deactivatePowerUp(type);
        }, duration);
    }
    
    function deactivatePowerUp(type) {
        powerUps[type].active = false;
        powerUps[type].duration = 0;
        
        if (type === 'sizeBoost') {
            ball.scale.set(1, 1, 1);
        } else if (type === 'speedBoost') {
            currentMoveSpeed = speedBoostActive ? boostMoveSpeed : normalMoveSpeed;
        } else if (type === 'invincibility') {
            ball.material.emissive = new THREE.Color(0x000000);
            ball.material.emissiveIntensity = 0;
        }
    }
    
    // Feature 18: Apply theme
    function applyTheme(theme) {
        currentTheme = theme;
        scene.background = new THREE.Color(theme.background);
        renderer.setClearColor(theme.background, 1);
        ball.material.color.setHex(theme.ball);
        if (trailParticles) {
            trailParticles.material.color.setHex(theme.ball);
        }
    }
    
    // Initialize trail after themes are defined
    trailParticles = createTrailParticles();
    
    // Camera position
    camera.position.set(0, 5, 10);
    camera.lookAt(ball.position);

    // Keyboard state
    const keys = {
        w: false,
        s: false,
        a: false,
        d: false,
        space: false,
        shift: false,
        arrowUp: false,
        arrowDown: false,
        arrowLeft: false,
        arrowRight: false,
        t: false,
        c: false,
        v: false,
        b: false,
        n: false
    };
    
    // Number keys for teleport
    const numberKeys = {};
    for (let i = 0; i <= 9; i++) {
        numberKeys[i] = false;
    }

    // Movement speed
    const rotationSpeed = 0.02;

    // Keyboard event listeners
    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        switch (key) {
            case 'w':
                keys.w = true;
                break;
            case 's':
                keys.s = true;
                break;
            case 'a':
                keys.a = true;
                break;
            case 'd':
                keys.d = true;
                break;
            case ' ':
                event.preventDefault();
                keys.space = true;
                break;
            case 'shift':
                keys.shift = true;
                break;
            case 'm':
                event.preventDefault();
                placeMark();
                break;
            case 'r':
                event.preventDefault();
                removeNearestMark();
                break;
            case 't':
                // Double-tap T to toggle teleport feature on/off
                const currentTime = Date.now();
                if (currentTime - lastTPressTime < doubleTapDelay) {
                    // Double-tap detected - toggle teleport feature
                    teleportEnabled = !teleportEnabled;
                    console.log('Teleport feature:', teleportEnabled ? 'enabled' : 'disabled');
                    event.preventDefault();
                    lastTPressTime = 0; // Reset to prevent triple-tap
                    keys.t = false; // Don't set keys.t on double-tap
                } else {
                    // Single tap - use for teleport if enabled
                    if (teleportEnabled) {
                        keys.t = true;
                    } else {
                        // If disabled, single tap re-enables it
                        teleportEnabled = true;
                        console.log('Teleport feature enabled');
                        event.preventDefault();
                    }
                    lastTPressTime = currentTime;
                }
                break;
            case 'c':
                event.preventDefault();
                // Cycle camera modes
                const modes = ['follow', 'firstPerson', 'free', 'cinematic'];
                const currentIndex = modes.indexOf(cameraMode);
                cameraMode = modes[(currentIndex + 1) % modes.length];
                console.log('Camera mode:', cameraMode);
                break;
            case 'v':
                event.preventDefault();
                toggleMiniMap();
                break;
            case 'b':
                event.preventDefault();
                // Toggle recording feature on/off
                if (recordingEnabled) {
                    // If feature is enabled, toggle recording state
                    if (isRecording) {
                        stopRecording();
                    } else {
                        startRecording();
                    }
                } else {
                    // If feature is disabled, enable it
                    recordingEnabled = true;
                    console.log('Recording feature enabled');
                }
                break;
            case 'x':
                event.preventDefault();
                // Toggle recording feature on/off
                recordingEnabled = !recordingEnabled;
                if (isRecording && !recordingEnabled) {
                    stopRecording();
                }
                console.log('Recording feature:', recordingEnabled ? 'enabled' : 'disabled');
                break;
            case 'n':
                event.preventDefault();
                // Toggle replay
                if (isReplaying) {
                    stopReplay();
                } else {
                    startReplay();
                }
                break;
            case '1':
            case '2':
            case '3':
            case '4':
                // Feature 9: Change mark type
                event.preventDefault();
                const typeKeys = Object.keys(markTypes);
                const typeIndex = parseInt(event.key) - 1;
                if (typeIndex >= 0 && typeIndex < typeKeys.length) {
                    currentMarkType = markTypes[typeKeys[typeIndex]];
                    console.log('Mark type changed to:', currentMarkType.name);
                }
                break;
            case '5':
            case '6':
            case '7':
            case '8':
                // Feature 18: Change theme
                event.preventDefault();
                const themeKeys = Object.keys(colorThemes);
                const themeIndex = parseInt(event.key) - 5;
                if (themeIndex >= 0 && themeIndex < themeKeys.length) {
                    applyTheme(colorThemes[themeKeys[themeIndex]]);
                    console.log('Theme changed to:', themeKeys[themeIndex]);
                }
                break;
            case '9':
                // Feature 17: Activate power-up (size)
                event.preventDefault();
                activatePowerUp('sizeBoost', 3000);
                break;
            case '0':
                // Feature 17: Activate power-up (speed)
                event.preventDefault();
                activatePowerUp('speedBoost', 3000);
                break;
            case 'delete':
                event.preventDefault();
                removeNearestMark();
                break;
        }
        
        // Number keys for teleport (Feature 3)
        if (teleportEnabled && keys.t && event.key >= '1' && event.key <= '9') {
            const markNum = parseInt(event.key);
            teleportToMark(markNum);
        }
        
        // Toggle teleport feature - use double-tap T or separate key
        // We'll handle this in the T key handler
        
        if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            removeNearestMark();
        }
        
        // Feature 4: Speed boost on Shift (check event.shiftKey)
        if (event.shiftKey && !event.key.toLowerCase().match(/[wasd\s]/)) {
            if (!speedBoostActive) {
                speedBoostActive = true;
                currentMoveSpeed = boostMoveSpeed;
                playSound('boost');
            }
        }
        
        switch (event.key) {
            case 'ArrowUp':
                keys.arrowUp = true;
                break;
            case 'ArrowDown':
                keys.arrowDown = true;
                break;
            case 'ArrowLeft':
                keys.arrowLeft = true;
                break;
            case 'ArrowRight':
                keys.arrowRight = true;
                break;
        }
    });

    document.addEventListener('keyup', (event) => {
        const key = event.key.toLowerCase();
        switch (key) {
            case 'w':
                keys.w = false;
                break;
            case 's':
                keys.s = false;
                break;
            case 'a':
                keys.a = false;
                break;
            case 'd':
                keys.d = false;
                break;
            case ' ':
                keys.space = false;
                break;
            case 'shift':
                keys.shift = false;
                break;
            case 't':
                keys.t = false;
                break;
            case 'x':
                // X is handled in keydown, but we can add it here too
                break;
        }
        
        // Feature 4: Disable speed boost when Shift is released
        if (!event.shiftKey && speedBoostActive) {
            speedBoostActive = false;
            currentMoveSpeed = normalMoveSpeed;
        }
        
        switch (event.key) {
            case 'ArrowUp':
                keys.arrowUp = false;
                break;
            case 'ArrowDown':
                keys.arrowDown = false;
                break;
            case 'ArrowLeft':
                keys.arrowLeft = false;
                break;
            case 'ArrowRight':
                keys.arrowRight = false;
                break;
        }
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Move ball based on keyboard input
        const forward = keys.w || keys.arrowUp;
        const backward = keys.s || keys.arrowDown;
        const left = keys.a || keys.arrowLeft;
        const right = keys.d || keys.arrowRight;
        const up = keys.space;
        const down = keys.shift;

        // Calculate movement direction relative to camera
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0; // Keep movement on horizontal plane
        cameraDirection.normalize();

        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(cameraDirection, camera.up).normalize();

        // Apply movement with current speed
        if (forward) {
            ball.position.addScaledVector(cameraDirection, currentMoveSpeed);
        }
        if (backward) {
            ball.position.addScaledVector(cameraDirection, -currentMoveSpeed);
        }
        if (left) {
            ball.position.addScaledVector(cameraRight, -currentMoveSpeed);
        }
        if (right) {
            ball.position.addScaledVector(cameraRight, currentMoveSpeed);
        }
        if (up) {
            ball.position.y += currentMoveSpeed;
        }
        if (down) {
            ball.position.y -= currentMoveSpeed;
        }
        
        // Feature 1: Update trail
        ballTrail.push(ball.position.clone());
        if (ballTrail.length > maxTrailLength) {
            ballTrail.shift();
        }
        
        // Update trail particles
        if (ballTrail.length > 1) {
            const positions = new Float32Array(ballTrail.length * 3);
            ballTrail.forEach((pos, i) => {
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;
            });
            trailParticles.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            trailParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Feature 15: Recording
        if (recordingEnabled && isRecording) {
            recordedPath.push({
                position: ball.position.clone(),
                rotation: ball.rotation.clone(),
                time: Date.now()
            });
        }
        
        // Feature 15: Replay
        if (isReplaying && recordedPath.length > 0) {
            replayIndex = (replayIndex + 1) % recordedPath.length;
            const frame = recordedPath[replayIndex];
            if (ghostBall && frame) {
                ghostBall.position.copy(frame.position);
                ghostBall.rotation.copy(frame.rotation);
            }
        }
        

        // Rotate ball based on movement
        if (forward || backward || left || right) {
            ball.rotation.y += rotationSpeed * 0.5;
        }

        // Feature 12: Camera modes
        if (cameraMode === 'follow') {
            const idealOffset = new THREE.Vector3(0, 5, 10);
            const idealPosition = ball.position.clone().add(idealOffset);
            camera.position.lerp(idealPosition, 0.1);
            camera.lookAt(ball.position);
        } else if (cameraMode === 'firstPerson') {
            camera.position.copy(ball.position);
            camera.position.y += 1.5;
            const cameraDirection = new THREE.Vector3();
            camera.getWorldDirection(cameraDirection);
            camera.lookAt(ball.position.clone().add(cameraDirection.multiplyScalar(10)));
        } else if (cameraMode === 'cinematic') {
            const idealOffset = new THREE.Vector3(0, 8, 15);
            const idealPosition = ball.position.clone().add(idealOffset);
            camera.position.lerp(idealPosition, 0.05);
            camera.lookAt(ball.position);
        }
        // 'free' mode handled separately with mouse controls if needed

        // Animate stars
        if (stars) {
            stars.rotation.y += 0.0005;
        }

        // Animate marks (pulsing effect and face camera)
        marks.forEach((mark, index) => {
            const time = Date.now() * 0.001;
            const scale = 1 + Math.sin(time * 2 + index) * 0.1;
            mark.children[0].scale.set(scale, scale, scale);
            
            // Make number sprite always face camera
            if (mark.children[1]) {
                mark.children[1].lookAt(camera.position);
            }
        });
        
        // Feature 4: Speed boost visual effect
        if (speedBoostActive) {
            ball.material.emissive = new THREE.Color(0xffff00);
            ball.material.emissiveIntensity = 0.3;
        } else {
            ball.material.emissive = new THREE.Color(0x000000);
            ball.material.emissiveIntensity = 0;
        }

        renderer.render(scene, camera);
        
        // Feature 16: Render mini-map
        if (miniMapEnabled && miniMapRenderer && miniMapCamera) {
            miniMapCamera.position.set(ball.position.x, ball.position.y + 50, ball.position.z);
            miniMapCamera.lookAt(ball.position);
            miniMapRenderer.render(scene, miniMapCamera);
        }
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Start animation
    console.log('Starting animation...');
    animate();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}