import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Play, Pause, RotateCcw, Eye, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

interface BiomechanicsSceneProps {
  darkMode?: boolean;
}

// Scratch objects to avoid GC in animation loop
const _vec3 = new THREE.Vector3();
const _targetCam = new THREE.Vector3();

export const BiomechanicsScene: React.FC<BiomechanicsSceneProps> = ({ darkMode = false }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<number>(0); // 0 = top plank, 1 = bottom chest-to-mat
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [flareAngle, setFlareAngle] = useState<number>(45); // 45 deg safe vs 90 deg impingement
  const [cameraPreset, setCameraPreset] = useState<'diagonal' | 'side' | 'front' | 'top'>('diagonal');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Mutable refs for animation loop
  const animStateRef = useRef({
    phase: 0,
    isPlaying: true,
    flareAngle: 45,
    cameraPreset: 'diagonal' as 'diagonal' | 'side' | 'front' | 'top',
    speed: 0.8,
  });

  useEffect(() => {
    animStateRef.current.phase = phase;
    animStateRef.current.isPlaying = isPlaying;
    animStateRef.current.flareAngle = flareAngle;
    animStateRef.current.cameraPreset = cameraPreset;
  }, [phase, isPlaying, flareAngle, cameraPreset]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    // Scene
    const scene = new THREE.Scene();
    const bgColor = darkMode ? 0x20201e : 0xf5f4ef;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.Fog(bgColor, 12, 35);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(4.5, 3.2, 5.0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Studio Environment map via PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xfff6ea, 0x30302b, 0.9);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffecd2, 1.8);
    dirLight.position.set(4, 8, 4);
    if (!isHeadless) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 25;
      dirLight.shadow.camera.left = -4;
      dirLight.shadow.camera.right = 4;
      dirLight.shadow.camera.top = 4;
      dirLight.shadow.camera.bottom = -4;
      dirLight.shadow.bias = -0.0005;
      dirLight.shadow.normalBias = 0.02;
    }
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xdbe6f5, 0.7);
    rimLight.position.set(-5, 4, -4);
    scene.add(rimLight);

    // Procedural Studio Floor Grid Texture
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d')!;
    fctx.fillStyle = darkMode ? '#20201E' : '#F5F4EF';
    fctx.fillRect(0, 0, 512, 512);
    fctx.strokeStyle = darkMode ? '#2B2B27' : '#E8E6DF';
    fctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 32) {
      fctx.beginPath();
      fctx.moveTo(i, 0);
      fctx.lineTo(i, 512);
      fctx.stroke();
      fctx.beginPath();
      fctx.moveTo(0, i);
      fctx.lineTo(512, i);
      fctx.stroke();
    }
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(10, 10);
    floorTexture.colorSpace = THREE.SRGBColorSpace;
    floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = !isHeadless;
    scene.add(floorMesh);

    // Soft Radial Contact Shadow Plane
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d')!;
    const grad = sctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 256, 256);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 2.4),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, 0.015, 0);
    scene.add(shadowPlane);

    // Workout Exercise Mat (Charcoal with Terracotta Trim)
    const matMat = new THREE.MeshStandardMaterial({
      color: darkMode ? 0x2e2e2a : 0x32322f,
      roughness: 0.8,
      metalness: 0.1,
    });
    const matGeo = new THREE.BoxGeometry(3.6, 0.03, 1.4);
    const matMesh = new THREE.Mesh(matGeo, matMat);
    matMesh.position.set(0, 0.02, 0);
    matMesh.receiveShadow = !isHeadless;
    scene.add(matMesh);

    // Mat border trim
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0xc5684d, // Terracotta
      roughness: 0.4,
      metalness: 0.3,
    });
    const borderGeo = new THREE.BoxGeometry(3.64, 0.025, 0.04);
    const border1 = new THREE.Mesh(borderGeo, borderMat);
    border1.position.set(0, 0.025, 0.7);
    const border2 = border1.clone();
    border2.position.set(0, 0.025, -0.7);
    scene.add(border1, border2);

    // ==========================================
    // PROCEDURAL 3-12 PART ANATOMICAL MANNEQUIN
    // ==========================================
    const mannequinGroup = new THREE.Group();
    scene.add(mannequinGroup);

    // Shared Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xe8dfd5, // Warm Stone Athletic Mannequin tone
      roughness: 0.45,
      metalness: 0.1,
    });
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0xc5684d, // Terracotta Athletic Kit
      roughness: 0.35,
      metalness: 0.25,
    });
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a45, // Dark Charcoal Titanium joint accents
      roughness: 0.25,
      metalness: 0.85,
    });
    const warningJointMat = new THREE.MeshStandardMaterial({
      color: 0xd93829, // Warning red for impingement
      roughness: 0.3,
      metalness: 0.4,
    });

    // 1. Hands (Anchored on floor at y = 0.04, x = 1.0, z = +-0.5)
    const handGeo = new THREE.BoxGeometry(0.18, 0.04, 0.14);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(1.0, 0.04, 0.5);
    leftHand.castShadow = !isHeadless;

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(1.0, 0.04, -0.5);
    rightHand.castShadow = !isHeadless;
    mannequinGroup.add(leftHand, rightHand);

    // 2. Feet (Anchored on floor at y = 0.06, x = -1.4, z = +-0.18)
    const footGeo = new THREE.BoxGeometry(0.24, 0.08, 0.12);
    const leftFoot = new THREE.Mesh(footGeo, armorMat);
    leftFoot.position.set(-1.4, 0.06, 0.18);
    const rightFoot = new THREE.Mesh(footGeo, armorMat);
    rightFoot.position.set(-1.4, 0.06, -0.18);
    mannequinGroup.add(leftFoot, rightFoot);

    // 3. Main Body Core Group (Plank line rotates around feet pivot)
    const bodyCoreGroup = new THREE.Group();
    mannequinGroup.add(bodyCoreGroup);

    // Chest & Thorax
    const chestGeo = new THREE.BoxGeometry(0.65, 0.28, 0.52);
    const chestMesh = new THREE.Mesh(chestGeo, armorMat);
    chestMesh.castShadow = !isHeadless;
    bodyCoreGroup.add(chestMesh);

    // Head & Neck
    const headGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.set(0.48, 0.05, 0);
    headMesh.castShadow = !isHeadless;
    bodyCoreGroup.add(headMesh);

    // Head Visor (Accent detail)
    const visorGeo = new THREE.BoxGeometry(0.12, 0.06, 0.22);
    const visorMesh = new THREE.Mesh(visorGeo, jointMat);
    visorMesh.position.set(0.56, 0.06, 0);
    bodyCoreGroup.add(visorMesh);

    // Abdomen & Spine
    const absGeo = new THREE.BoxGeometry(0.55, 0.22, 0.42);
    const absMesh = new THREE.Mesh(absGeo, skinMat);
    absMesh.position.set(-0.55, -0.02, 0);
    absMesh.castShadow = !isHeadless;
    bodyCoreGroup.add(absMesh);

    // Pelvis
    const pelvisGeo = new THREE.BoxGeometry(0.4, 0.24, 0.44);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, armorMat);
    pelvisMesh.position.set(-1.0, -0.02, 0);
    pelvisMesh.castShadow = !isHeadless;
    bodyCoreGroup.add(pelvisMesh);

    // Thighs
    const thighGeo = new THREE.CylinderGeometry(0.09, 0.075, 0.65, 12);
    thighGeo.rotateZ(Math.PI / 2);
    const leftThigh = new THREE.Mesh(thighGeo, armorMat);
    leftThigh.position.set(-1.45, -0.03, 0.16);
    const rightThigh = new THREE.Mesh(thighGeo, armorMat);
    rightThigh.position.set(-1.45, -0.03, -0.16);
    bodyCoreGroup.add(leftThigh, rightThigh);

    // Calves
    const calfGeo = new THREE.CylinderGeometry(0.07, 0.055, 0.68, 12);
    calfGeo.rotateZ(Math.PI / 2);
    const leftCalf = new THREE.Mesh(calfGeo, skinMat);
    leftCalf.position.set(-2.05, -0.04, 0.16);
    const rightCalf = new THREE.Mesh(calfGeo, skinMat);
    rightCalf.position.set(-2.05, -0.04, -0.16);
    bodyCoreGroup.add(leftCalf, rightCalf);

    // Dynamic Upper Arms & Forearms (Procedural Kinematic Tubes)
    const armGeo = new THREE.CylinderGeometry(0.065, 0.055, 1, 10);
    const leftUpperArm = new THREE.Mesh(armGeo, skinMat);
    const leftForearm = new THREE.Mesh(armGeo, skinMat);
    const rightUpperArm = new THREE.Mesh(armGeo, skinMat);
    const rightForearm = new THREE.Mesh(armGeo, skinMat);

    leftUpperArm.castShadow = !isHeadless;
    leftForearm.castShadow = !isHeadless;
    rightUpperArm.castShadow = !isHeadless;
    rightForearm.castShadow = !isHeadless;

    mannequinGroup.add(leftUpperArm, leftForearm, rightUpperArm, rightForearm);

    // Elbow Joints
    const elbowJointGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const leftElbowJoint = new THREE.Mesh(elbowJointGeo, jointMat);
    const rightElbowJoint = new THREE.Mesh(elbowJointGeo, jointMat);
    mannequinGroup.add(leftElbowJoint, rightElbowJoint);

    // Helper to position cylinder segment between two points
    function alignCylinder(mesh: THREE.Mesh, p1: THREE.Vector3, p2: THREE.Vector3) {
      _vec3.subVectors(p2, p1);
      const length = _vec3.length();
      mesh.scale.set(1, Math.max(0.01, length), 1);
      mesh.position.copy(p1).addScaledVector(_vec3, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _vec3.normalize());
    }

    // Spine Alignment Guide Line
    const spineMat = new THREE.LineBasicMaterial({
      color: 0x48bb78,
      linewidth: 3,
      transparent: true,
      opacity: 0.75,
    });
    const spineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.55, 0.1, 0),
      new THREE.Vector3(-2.4, 0.05, 0),
    ]);
    const spineLine = new THREE.Line(spineGeo, spineMat);
    bodyCoreGroup.add(spineLine);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Render loop with exponential damping
    let reqId: number;
    let clock = new THREE.Clock();

    const render = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      // Handle playback animation
      const state = animStateRef.current;
      if (state.isPlaying) {
        state.phase += delta * state.speed;
        if (state.phase > 1) {
          state.phase = 0; // loop
        }
        setPhase(state.phase);
      }

      // Smooth ping-pong cycle for push-up: 0 (top) -> 1 (bottom) -> 0
      const cycle = Math.sin(state.phase * Math.PI); // 0 at ends, 1 at middle
      const currentFlare = state.flareAngle;

      // Update joint warning material if flare is too wide (90 deg)
      if (currentFlare >= 85) {
        leftElbowJoint.material = warningJointMat;
        rightElbowJoint.material = warningJointMat;
      } else {
        leftElbowJoint.material = jointMat;
        rightElbowJoint.material = jointMat;
      }

      // Calculate chest height:
      // Top plank: chest at y = 0.95
      // Bottom chest-to-floor: chest at y = 0.28
      const chestY = THREE.MathUtils.lerp(0.95, 0.28, cycle);
      const chestPos = new THREE.Vector3(1.0, chestY, 0);

      // Feet anchor at (-1.4, 0.06, 0)
      const feetPos = new THREE.Vector3(-1.4, 0.06, 0);

      // Angle of body plank around feet
      const dx = chestPos.x - feetPos.x;
      const dy = chestPos.y - feetPos.y;
      const pitch = Math.atan2(dy, dx);

      // Position and rotate body core
      bodyCoreGroup.position.copy(chestPos);
      bodyCoreGroup.rotation.z = pitch;

      // Shoulder positions in world space
      const shoulderOffsetY = -0.04;
      const shoulderOffsetZ = 0.28;
      const leftShoulderPos = new THREE.Vector3(
        chestPos.x,
        chestPos.y + shoulderOffsetY,
        shoulderOffsetZ
      );
      const rightShoulderPos = new THREE.Vector3(
        chestPos.x,
        chestPos.y + shoulderOffsetY,
        -shoulderOffsetZ
      );

      // Hands anchored on floor
      const leftHandPos = new THREE.Vector3(1.0, 0.06, 0.5);
      const rightHandPos = new THREE.Vector3(1.0, 0.06, -0.5);

      // Elbow flare direction
      // At 45 deg, elbow points diagonally back-and-out
      // At 90 deg, elbow flairs straight outward (T-pose)
      const flareRad = (currentFlare * Math.PI) / 180;
      const elbowBackOffset = THREE.MathUtils.lerp(-0.05, -0.25, cycle) * Math.cos(flareRad);
      const elbowOutOffset = THREE.MathUtils.lerp(0.12, 0.35, cycle) * Math.sin(flareRad);
      const elbowHeight = THREE.MathUtils.lerp(0.55, 0.32, cycle);

      const leftElbowPos = new THREE.Vector3(
        chestPos.x + elbowBackOffset,
        elbowHeight,
        leftHandPos.z + elbowOutOffset
      );
      const rightElbowPos = new THREE.Vector3(
        chestPos.x + elbowBackOffset,
        elbowHeight,
        rightHandPos.z - elbowOutOffset
      );

      leftElbowJoint.position.copy(leftElbowPos);
      rightElbowJoint.position.copy(rightElbowPos);

      // Align arms
      alignCylinder(leftUpperArm, leftShoulderPos, leftElbowPos);
      alignCylinder(leftForearm, leftElbowPos, leftHandPos);
      alignCylinder(rightUpperArm, rightShoulderPos, rightElbowPos);
      alignCylinder(rightForearm, rightElbowPos, rightHandPos);

      // Damped Camera Movement
      switch (state.cameraPreset) {
        case 'diagonal':
          _targetCam.set(3.8, 2.6, 3.6);
          break;
        case 'side':
          _targetCam.set(0.0, 1.4, 4.2);
          break;
        case 'front':
          _targetCam.set(4.2, 1.2, 0.0);
          break;
        case 'top':
          _targetCam.set(0.0, 5.0, 0.01);
          break;
      }

      // Smooth camera position with damp
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCam.x, 5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCam.y, 5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCam.z, 5, delta);
      camera.lookAt(0.2, 0.45, 0);

      renderer.render(scene, camera);

      // In headless mode, throttle to save CPU
      if (isHeadless) {
        setTimeout(() => {
          reqId = requestAnimationFrame(render);
        }, 65);
      } else {
        reqId = requestAnimationFrame(render);
      }
    };

    reqId = requestAnimationFrame(render);

    // Cleanup
    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      matGeo.dispose();
      matMat.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      floorTexture.dispose();
      shadowTexture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [darkMode]);

  // Calculated elbow angle based on current phase and flare
  const currentAngle = Math.round(
    THREE.MathUtils.lerp(165, flareAngle === 90 ? 78 : 88, Math.sin(phase * Math.PI))
  );

  return (
    <div className="relative w-full h-[520px] md:h-[620px] rounded-2xl overflow-hidden border border-soft-stone bg-warm-ivory shadow-card">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Minimal Top Badges & Biomechanics Info */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-lg bg-pure-white/90 dark:bg-stone-900/90 border border-soft-stone text-xs font-semibold text-charcoal shadow-sm flex items-center gap-1.5 pointer-events-auto">
          <Eye className="w-3.5 h-3.5 text-terracotta" />
          <span>3D Biomechanics Lab</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-pure-white/90 dark:bg-stone-900/90 border border-soft-stone text-xs font-mono text-charcoal shadow-sm pointer-events-auto">
          Elbow Angle: <strong className="text-terracotta">{currentAngle}°</strong>
        </div>
        {flareAngle >= 85 && (
          <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-600 dark:text-red-400 shadow-sm flex items-center gap-1.5 pointer-events-auto">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>90° Flare: Shoulder Impingement Risk</span>
          </div>
        )}
      </div>

      {/* Unified Bottom Control Dock (Consolidated, Zero Occlusion, Cinema Drawer) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-2xl transition-all duration-300">
        <div className="flex justify-center -mb-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-3 py-1 rounded-t-lg bg-pure-white dark:bg-stone-900 border border-b-0 border-soft-stone text-[11px] font-medium text-charcoal-secondary hover:text-charcoal shadow-sm flex items-center gap-1 transition"
            aria-label={isCollapsed ? 'Expand 3D Controls' : 'Collapse 3D Controls'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{isCollapsed ? 'Show Controls' : 'Cinema Mode'}</span>
          </button>
        </div>

        {!isCollapsed && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-pure-white dark:bg-[#282825] border border-soft-stone shadow-floating space-y-3">
            {/* Top Row: Playback & Scrubbing */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-lg bg-terracotta text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition shrink-0"
                aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  setPhase(0);
                  setIsPlaying(false);
                }}
                className="w-9 h-9 rounded-lg border border-soft-stone bg-warm-ivory text-charcoal flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-800 transition shrink-0"
                aria-label="Reset position"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="flex-1 flex items-center gap-2">
                <span className="text-[11px] font-mono text-charcoal-muted uppercase">Top</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={phase}
                  onChange={(e) => {
                    setPhase(parseFloat(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full accent-[#C5684D] cursor-pointer"
                  aria-label="Scrub push-up cycle"
                />
                <span className="text-[11px] font-mono text-charcoal-muted uppercase">Bottom</span>
              </div>
            </div>

            {/* Middle Row: Camera Angle Presets & Elbow Flare Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-soft-stone text-xs">
              {/* Elbow flare tabs */}
              <div className="flex items-center gap-1">
                <span className="text-charcoal-secondary font-medium mr-1 text-[11px]">Elbow Flare:</span>
                <button
                  onClick={() => setFlareAngle(45)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    flareAngle === 45
                      ? 'bg-terracotta text-white shadow-xs'
                      : 'border border-soft-stone bg-warm-ivory text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800'
                  }`}
                >
                  45° (Optimal)
                </button>
                <button
                  onClick={() => setFlareAngle(90)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                    flareAngle === 90
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'border border-soft-stone bg-warm-ivory text-charcoal hover:bg-stone-200 dark:hover:bg-stone-800'
                  }`}
                >
                  90° (Impingement)
                </button>
              </div>

              {/* Camera Presets */}
              <div className="flex items-center gap-1">
                <span className="text-charcoal-secondary font-medium mr-1 text-[11px]">Angle:</span>
                {(['diagonal', 'side', 'front', 'top'] as const).map((cam) => (
                  <button
                    key={cam}
                    onClick={() => setCameraPreset(cam)}
                    className={`px-2 py-0.5 rounded text-[11px] capitalize transition ${
                      cameraPreset === cam
                        ? 'bg-charcoal text-white dark:bg-stone-200 dark:text-stone-900 font-semibold'
                        : 'text-charcoal-secondary hover:text-charcoal'
                    }`}
                  >
                    {cam}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Form Checklist Bullet */}
            <div className="text-[11px] text-charcoal-secondary flex items-center justify-between pt-1 border-t border-soft-stone">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Spine plank aligned (Heels to crown straight)</span>
              </span>
              <span className="hidden sm:inline font-mono text-[10px] text-charcoal-muted">
                {flareAngle === 45 ? '✓ 45° arrow angle protects rotator cuffs' : '⚠ High stress on anterior shoulder'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
