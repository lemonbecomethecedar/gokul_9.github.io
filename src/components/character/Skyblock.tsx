import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Small, deterministic pixel textures; no downloaded or generated image assets.
function pixelTexture(kind: 'grass' | 'side' | 'dirt') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  const grass = ['#8d8c7c', '#a09f8c', '#77796e', '#b0ac99'];
  const dirt = ['#70503a', '#805d42', '#634631', '#8a664b'];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const seed = (x * 17 + y * 31 + x * y * 7) % 19;
    const green = kind === 'grass' || (kind === 'side' && y < 3 + (x * 7 % 3));
    ctx.fillStyle = (green ? grass : dirt)[seed % 4];
    ctx.fillRect(x, y, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

export function Skyblock() {
  const resources = useMemo(() => {
    const top = pixelTexture('grass'), side = pixelTexture('side'), dirt = pixelTexture('dirt');
    const material = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: 1 });
    const topMat = material(top), sideMat = material(side), dirtMat = material(dirt);
    return { textures: [top, side, dirt], materials: [sideMat, sideMat, topMat, dirtMat, sideMat, sideMat], dirtMat, geometry: new THREE.BoxGeometry(0.72, 0.72, 0.72) };
  }, []);
  useEffect(() => () => {
    resources.textures.forEach(texture => texture.dispose());
    new Set(resources.materials).forEach(material => material.dispose());
    resources.geometry.dispose();
  }, [resources]);
  const blocks = useMemo(() => {
    const list: { x: number; y: number; z: number; grass: boolean }[] = [];
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
      list.push({ x, y: 0, z, grass: true });
      list.push({ x, y: -1, z, grass: false });
      if (Math.abs(x) <= 1 && Math.abs(z) <= 1) list.push({ x, y: -2, z, grass: false });
    }
    return list;
  }, []);
  return <group position={[0, -0.36, 0]} rotation={[0, -0.18, 0]} dispose={null}>
    {blocks.map(block => <mesh key={`${block.x}/${block.y}/${block.z}`} position={[block.x * 0.72, block.y * 0.72, block.z * 0.72]} geometry={resources.geometry} material={block.grass ? resources.materials : resources.dirtMat} />)}
  </group>;
}

export function PlayerNametag() {
  const texture = useMemo(() => {
    const glyphs: Record<string, string[]> = {
      G: ['01110','10001','10000','10111','10001','10001','01110'],
      o: ['00000','00000','01110','10001','10001','10001','01110'],
      k: ['10000','10000','10010','10100','11000','10100','10010'],
      u: ['00000','00000','10001','10001','10001','10011','01101'],
      l: ['11000','01000','01000','01000','01000','01000','11100']
    };
    const canvas = document.createElement('canvas'); canvas.width = 36; canvas.height = 11;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, 36, 11);
    for (const [index, letter] of [...'Gokul'].entries()) {
      glyphs[letter].forEach((row, y) => [...row].forEach((pixel, x) => {
        if (pixel !== '1') return;
        ctx.fillStyle = '#333333'; ctx.fillRect(4 + index * 6 + x, 3 + y, 1, 1);
      }));
    }
    for (const [index, letter] of [...'Gokul'].entries()) {
      glyphs[letter].forEach((row, y) => [...row].forEach((pixel, x) => {
        if (pixel === '1') { ctx.fillStyle = '#ffffff'; ctx.fillRect(3 + index * 6 + x, 2 + y, 1, 1); }
      }));
    }
    const map = new THREE.CanvasTexture(canvas);
    map.magFilter = map.minFilter = THREE.NearestFilter; map.generateMipmaps = false;
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={[0, 3.88, 0]} scale={[1.8, 0.55, 1]}><spriteMaterial map={texture} transparent depthTest={false} toneMapped={false} /></sprite>;
}