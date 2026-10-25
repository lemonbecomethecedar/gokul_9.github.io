import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { assets, skinConfig } from '../../config/assets';
import { useWorld } from '../../app/store';
import { PlayerNametag, Skyblock } from './Skyblock';

// Each face uses its own UV rectangle, preserving the skin's original pixel edges.
type Rect = [number, number, number, number];
type UVs = { right: Rect; left: Rect; top: Rect; bottom: Rect; front: Rect; back: Rect };
const uv = (x: number, y: number, w: number, h: number): Rect => [x, y, w, h];
function cuboid(width: number, height: number, depth: number, faces: UVs, resolution: number) {
  const geometry = new THREE.BoxGeometry(width, height, depth).toNonIndexed();
  const attr = geometry.getAttribute('uv');
  const order: (keyof UVs)[] = ['right', 'left', 'top', 'bottom', 'front', 'back'];
  order.forEach((key, face) => {
    const [x, y, w, h] = faces[key];
    for (let i = 0; i < 6; i++) {
      const u = attr.getX(face * 6 + i);
      const v = attr.getY(face * 6 + i);
      // Skin coordinates count downward from the upper-left; Three UVs count upward.
      attr.setXY(face * 6 + i, (x + u * w) / 64, 1 - (y + (1 - v) * h) / resolution);
    }
  });
  attr.needsUpdate = true;
  return geometry;
}
function skinFaces(x: number, y: number, w: number, h: number, d: number): UVs {
  return { right: uv(x, y + d, d, h), front: uv(x + d, y + d, w, h), left: uv(x + d + w, y + d, d, h), back: uv(x + 2 * d + w, y + d, w, h), top: uv(x + d, y, w, d), bottom: uv(x + d + w, y, w, d) };
}
const parts = {
  head: [skinFaces(0, 0, 8, 8, 8), skinFaces(32, 0, 8, 8, 8)],
  body: [skinFaces(16, 16, 8, 12, 4), skinFaces(16, 32, 8, 12, 4)],
  rightLeg: [skinFaces(0, 16, 4, 12, 4), skinFaces(0, 32, 4, 12, 4)],
  leftLeg: [skinFaces(16, 48, 4, 12, 4), skinFaces(0, 48, 4, 12, 4)]
};
function BoxPart({ size, map, alpha = false, fallback, texture, legacy = false }: { size: [number, number, number]; map: UVs; alpha?: boolean; fallback: string; texture: THREE.Texture | null; legacy?: boolean }) {
  const geometry = useMemo(() => cuboid(...size, map, legacy ? 32 : 64), [size[0], size[1], size[2], map, legacy]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ map: texture, color: texture ? '#ffffff' : fallback, transparent: false, alphaTest: alpha ? 0.5 : 0, roughness: 0.95, side: THREE.FrontSide, polygonOffset: alpha, polygonOffsetFactor: alpha ? -1 : 0, polygonOffsetUnits: alpha ? -1 : 0 }), [alpha, fallback, texture]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} dispose={null} />;
}
function Rig({ mode, waveSignal }: { mode: 'landing' | 'transition' | 'loading' | 'world'; waveSignal: number }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [legacy, setLegacy] = useState(false);
  useEffect(() => {
    if (!assets.playerSkin) return;
    let active = true;
    let loaded: THREE.Texture | undefined;
    new THREE.TextureLoader().load(assets.playerSkin, source => {
      if (!active) { source.dispose(); return; }
      const image = source.image as HTMLImageElement;
      if (image.width !== 64 || ![32, 64].includes(image.height)) { source.dispose(); return; }
      source.magFilter = THREE.NearestFilter; source.minFilter = THREE.NearestFilter; source.generateMipmaps = false; source.colorSpace = THREE.SRGBColorSpace;
      loaded = source; setLegacy(image.height === 32); setTexture(source);
    });
    return () => { active = false; loaded?.dispose(); };
  }, []);
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const waveStart = useRef(-Infinity);
  const { camera, gl } = useThree();
  const cursor = useRef({ x: 0, y: 0, active: false });
  const headScreen = useMemo(() => new THREE.Vector3(), []);
  const reducedMotion = useWorld(state => state.preferences.reducedMotion);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      cursor.current = { x: event.clientX, y: event.clientY, active: true };
    };
    const reset = () => { cursor.current.active = false; };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
    };
  }, []);
  useEffect(() => { if (waveSignal) waveStart.current = performance.now() / 1000; }, [waveSignal]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden) return;
      waveStart.current = -Infinity;
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useFrame(({ clock }, delta) => {
    delta = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const body = root.current;
    if (!body || !head.current || !rightArm.current || !leftArm.current) return;
    const world = mode === 'world';
    const targetZ = world ? 11 : mode === 'transition' || mode === 'loading' ? 6.6 : 9.3;
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 2.5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, world ? 3.4 : 1.65, 2.5, delta);
    camera.lookAt(0, world ? 1.1 : 1.65, 0);
    body.position.y = world ? 0 : Math.sin(t * 1.65) * 0.025;
    const cinematic = mode === 'transition' || mode === 'loading';
    const reduce = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let yaw = cinematic || reduce ? 0 : Math.sin(t * 0.65) * 0.12;
    let pitch = cinematic || reduce ? 0 : Math.sin(t * 0.9) * 0.045;
    let tilt = 0;
    if (cursor.current.active && !cinematic) {
      // Track relative to the avatar, not just the browser's center. Global input
      // keeps working while the mouse is over dashboard buttons outside Canvas.
      head.current.getWorldPosition(headScreen);
      headScreen.y += 0.42;
      headScreen.project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      const screenX = rect.left + (headScreen.x + 1) * rect.width / 2;
      const screenY = rect.top + (1 - headScreen.y) * rect.height / 2;
      const dx = (cursor.current.x - screenX) / Math.max(140, window.innerWidth * 0.35);
      const dy = (cursor.current.y - screenY) / Math.max(120, window.innerHeight * 0.35);
      const amount = reduce ? 0.45 : 1;
      yaw = THREE.MathUtils.clamp(dx * 1.1, -1.05, 1.05) * amount;
      pitch = THREE.MathUtils.clamp(dy * 0.8, -0.6, 0.65) * amount;
      tilt = -THREE.MathUtils.clamp(dx * 0.1, -0.1, 0.1) * amount;
    }
    head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, yaw, 7, delta);
    head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, pitch, 7, delta);
    head.current.rotation.z = THREE.MathUtils.damp(head.current.rotation.z, tilt, 5, delta);
    const waveAge = performance.now() / 1000 - waveStart.current;
    const waving = waveAge >= 0 && waveAge < 1.3;
    rightArm.current.rotation.z = THREE.MathUtils.damp(rightArm.current.rotation.z, waving ? -2.25 + Math.sin(waveAge * 17) * 0.28 : -0.065 + Math.sin(t * 1.6) * 0.035, 9, delta);
    leftArm.current.rotation.z = Math.sin(t * 1.5 + 1) * 0.025 + 0.055;
    if (leftLeg.current) leftLeg.current.rotation.x = Math.sin(t * 1.4) * 0.012;
    if (rightLeg.current) rightLeg.current.rotation.x = -Math.sin(t * 1.4) * 0.012;
  });
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ action: string; duration: number }>).detail;
      if (detail.action === 'spin') {
        gsap.to(el.rotation, { y: el.rotation.y + Math.PI * 2, duration: detail.duration, ease: 'power2.inOut', overwrite: true, onComplete: () => { el.rotation.y = 0; } });
      } else if (detail.action === 'reset') {
        gsap.to(el.rotation, { y: 0, duration: 0.65, ease: 'power2.out', overwrite: true });
      }
    };
    window.addEventListener('character-action', handler);
    return () => { window.removeEventListener('character-action', handler); gsap.killTweensOf(el.rotation); };
  }, []);
  const component = (size: [number, number, number], maps: UVs[], fallback: string, inflation = 0.035) => <>
    <BoxPart size={size} map={maps[0]} fallback={fallback} texture={texture} legacy={legacy} />
    {texture && !legacy && <BoxPart size={[size[0] + inflation, size[1] + inflation, size[2] + inflation]} map={maps[1]} fallback={fallback} texture={texture} alpha />}
  </>;
  return <group ref={root} scale={0.105} position={[0, 0, 0]}>
    <group position={[0, 24, 0]} ref={head}><group position={[0, 4, 0]}>{component([8, 8, 8], parts.head, '#bfa88e', 0.48)}</group></group>
    <group position={[0, 18, 0]}>{component([8, 12, 4], parts.body, '#586459', 0.22)}</group>
    <group ref={rightArm} position={[skinConfig.model === 'slim' ? -5.5 : -6, 24, 0]}><group position={[0, -6, 0]}>{component([skinConfig.model === 'slim' ? 3 : 4, 12, 4], [skinFaces(40, 16, skinConfig.model === 'slim' ? 3 : 4, 12, 4), skinFaces(40, 32, skinConfig.model === 'slim' ? 3 : 4, 12, 4)], '#746c5e', 0.23)}</group></group>
    <group ref={leftArm} position={[skinConfig.model === 'slim' ? 5.5 : 6, 24, 0]}><group position={[0, -6, 0]}>{component([skinConfig.model === 'slim' ? 3 : 4, 12, 4], [legacy ? skinFaces(40, 16, 4, 12, 4) : skinFaces(32, 48, skinConfig.model === 'slim' ? 3 : 4, 12, 4), skinFaces(48, 48, skinConfig.model === 'slim' ? 3 : 4, 12, 4)], '#746c5e', 0.23)}</group></group>
    <group ref={rightLeg} position={[-2, 12, 0]}><group position={[0, -6, 0]}>{component([4, 12, 4], parts.rightLeg, '#343d3a', 0.23)}</group></group>
    <group ref={leftLeg} position={[2, 12, 0]}><group position={[0, -6, 0]}>{component([4, 12, 4], legacy ? [parts.rightLeg[0], parts.rightLeg[1]] : parts.leftLeg, '#343d3a', 0.23)}</group></group>
  </group>;
}
export function CharacterCanvas({ mode, waveSignal }: { mode: 'landing' | 'transition' | 'loading' | 'world'; waveSignal: number }) {
  const quality = useWorld(state => state.preferences.graphics);
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => { const sync = () => setVisible(!document.hidden); document.addEventListener('visibilitychange', sync); return () => document.removeEventListener('visibilitychange', sync); }, []);
  const low = quality === 'low' || (quality === 'auto' && (navigator.hardwareConcurrency || 4) <= 4);
  return <Canvas dpr={low ? 1 : [1, 1.7]} camera={{ position: [0, 1.4, 9.3], fov: 35 }} gl={{ alpha: true, antialias: !low, powerPreference: 'low-power' }} frameloop={visible ? 'always' : 'never'}>
    <ambientLight intensity={1.6} /><directionalLight position={[3, 7, 8]} intensity={1.9} color="#ffe4bc" /><directionalLight position={[-5, 3, -3]} intensity={0.85} color="#8e9ba3" />
    <Rig mode={mode} waveSignal={waveSignal} />
    {mode === 'world' && <Skyblock />}
    {(mode === 'world' || mode === 'landing') && <PlayerNametag />}
  </Canvas>;
}

export function SkinHead({ active = false }: { active?: boolean }) {
  const url = assets.playerSkin;
  return <span className={`skin-head ${active ? 'skin-head--active' : ''}`} style={url ? { backgroundImage: `url("${url}")` } : undefined} aria-hidden="true" />;
}