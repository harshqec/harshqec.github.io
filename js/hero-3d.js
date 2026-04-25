import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/GLTFLoader.js';

document.addEventListener('DOMContentLoaded', () => {
    const host = document.getElementById('hero-model-viewer');
    if (!host) return;

    const heroWrap = host.closest('.hero-image');
    const fallbackImage = heroWrap ? heroWrap.querySelector('.hero-photo-fallback') : null;
    if (!heroWrap || !fallbackImage) return;

    const canUseWebGL = (() => {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (error) {
            return false;
        }
    })();

    if (!canUseWebGL) {
        return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.12, 6.1);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    host.appendChild(renderer.domElement);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(4.2, 4.6, 6.8);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.7);
    fillLight.position.set(-5.4, 2.1, 2.8);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xa5b4fc, 0.9, 12);
    rimLight.position.set(0, -1.2, -3.5);
    scene.add(rimLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.9, 0.035, 12, 80),
        new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            transparent: true,
            opacity: 0.45,
            roughness: 0.5,
            metalness: 0.2,
        })
    );
    ring.rotation.x = Math.PI / 2.8;
    ring.position.set(0, -1.95, -0.45);
    scene.add(ring);

    const clearModelGroup = () => {
        while (modelGroup.children.length) {
            const child = modelGroup.children.pop();
            if (child && child.geometry) child.geometry.dispose();
            if (child && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((m) => {
                    if (m && m.map) m.map.dispose();
                    if (m) m.dispose();
                });
            }
        }
    };

    const activateViewer = () => {
        heroWrap.classList.add('has-3d');
    };

    const addFallbackCard = () => {
        const geometry = new THREE.BoxGeometry(2.35, 3.1, 0.34);

        const sideMaterial = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.65,
            metalness: 0.18,
        });

        const backMaterial = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.75,
            metalness: 0.08,
        });

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            fallbackImage.getAttribute('src'),
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

                const frontMaterial = new THREE.MeshStandardMaterial({
                    map: texture,
                    roughness: 0.82,
                    metalness: 0.05,
                });

                const card = new THREE.Mesh(geometry, [
                    sideMaterial,
                    sideMaterial,
                    sideMaterial,
                    sideMaterial,
                    frontMaterial,
                    backMaterial,
                ]);
                modelGroup.add(card);
                activateViewer();
            },
            undefined,
            () => {
                // Keep plain fallback image visible if texture also fails.
            }
        );
    };

    const fitModelToView = (object3D) => {
        const box = new THREE.Box3().setFromObject(object3D);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetHeight = 3.15;
        const scale = targetHeight / (size.y || maxDim);

        object3D.position.sub(center);
        object3D.scale.setScalar(scale);
        object3D.position.y -= 0.25;
    };

    const addGLBModel = () => {
        const gltfLoader = new GLTFLoader();
        const modelPath = 'models/harsh-avatar.glb';

        gltfLoader.load(
            modelPath,
            (gltf) => {
                clearModelGroup();
                const avatar = gltf.scene;

                avatar.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = false;
                        node.receiveShadow = false;
                        if (node.material) {
                            const mats = Array.isArray(node.material) ? node.material : [node.material];
                            mats.forEach((mat) => {
                                if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
                            });
                        }
                    }
                });

                fitModelToView(avatar);
                modelGroup.add(avatar);
                activateViewer();
            },
            undefined,
            () => {
                // If GLB is not present, use the textured card fallback.
                addFallbackCard();
            }
        );
    };

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let spinY = 0;
    let returningToOrigin = false;
    let returnStartAt = 0;
    let notifyAfterReturn = false;

    let isPointerDown = false;
    let hasDragged = false;
    let startX = 0;
    let startY = 0;
    let pointerX = 0;
    let pointerY = 0;

    const maxTiltX = 0.4;
    const returnDelayMs = 460;

    const resize = () => {
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    };

    const onPointerDown = (event) => {
        isPointerDown = true;
        hasDragged = false;
        returningToOrigin = false;
        notifyAfterReturn = false;
        startX = event.clientX;
        startY = event.clientY;
        pointerX = event.clientX;
        pointerY = event.clientY;
        host.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event) => {
        if (!isPointerDown) return;

        const dx = event.clientX - pointerX;
        const dy = event.clientY - pointerY;
        pointerX = event.clientX;
        pointerY = event.clientY;

        if (Math.hypot(event.clientX - startX, event.clientY - startY) > 5) {
            hasDragged = true;
        }

        targetY += dx * 0.012;
        targetX = Math.max(-maxTiltX, Math.min(maxTiltX, targetX + dy * 0.004));
    };

    const onPointerUp = (event) => {
        if (!isPointerDown) return;
        isPointerDown = false;

        if (host.hasPointerCapture(event.pointerId)) {
            host.releasePointerCapture(event.pointerId);
        }

        if (!hasDragged && !prefersReducedMotion) {
            spinY += Math.PI * 2;
        } else if (hasDragged) {
            // Pause at released pose, then ease back to neutral orientation.
            returnStartAt = performance.now() + returnDelayMs;
            returningToOrigin = true;
            notifyAfterReturn = true;
        }
    };

    const onPointerLeave = () => {
        if (!isPointerDown) {
            targetX = 0;
        }
    };

    host.addEventListener('pointerdown', onPointerDown);
    host.addEventListener('pointermove', onPointerMove);
    host.addEventListener('pointerup', onPointerUp);
    host.addEventListener('pointercancel', onPointerUp);
    host.addEventListener('pointerleave', onPointerLeave);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    window.addEventListener('resize', resize);
    resize();

    const animate = () => {
        if (spinY > 0.0001) {
            const step = Math.min(spinY, 0.18);
            targetY += step;
            spinY = Math.max(0, spinY - 0.06);
        }

        if (!isPointerDown && returningToOrigin) {
            const now = performance.now();
            if (now >= returnStartAt) {
                targetX *= 0.88;
                targetY *= 0.88;
            }
        }

        if (!isPointerDown) {
            targetX *= 0.97;
        }

        currentY += (targetY - currentY) * 0.14;
        currentX += (targetX - currentX) * 0.14;

        if (returningToOrigin
            && Math.abs(currentX) < 0.008
            && Math.abs(currentY) < 0.008
            && Math.abs(targetX) < 0.008
            && Math.abs(targetY) < 0.008) {
            currentX = 0;
            currentY = 0;
            targetX = 0;
            targetY = 0;
            returningToOrigin = false;

            if (notifyAfterReturn) {
                notifyAfterReturn = false;
                window.dispatchEvent(new CustomEvent('hero-model-moved-back'));
            }
        }

        modelGroup.rotation.y = currentY;
        modelGroup.rotation.x = currentX;

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    addGLBModel();
    animate();
});
