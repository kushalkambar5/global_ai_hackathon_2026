/* eslint-disable react/no-unknown-property */
'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
// @ts-ignore
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import './Lanyard.css';

extend({ MeshLineGeometry, MeshLineMaterial });

const cardGLB = '/card.glb';
const lanyard = '/lanyard.png';
const defaultBackLogo = '/debug_thugs_logo.png';

// 1x1 transparent pixel — lets useTexture be called unconditionally when an
// image isn't supplied for a given face.
const BLANK_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export interface CardConfig {
  id?: string;
  positionX?: number;
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: 'cover' | 'contain';
  lanyardImage?: string | null;
  lanyardWidth?: number;
}

export interface LanyardProps {
  position?: [number, number, number];
  gravity?: [number, number, number];
  fov?: number;
  transparent?: boolean;
  cards?: CardConfig[];
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: 'cover' | 'contain';
  lanyardImage?: string | null;
  lanyardWidth?: number;
}

export default function Lanyard({
  position = [0, 0, 18],
  gravity = [0, -40, 0],
  fov = 24,
  transparent = true,
  cards,
  frontImage = null,
  backImage = defaultBackLogo,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 0.55
}: LanyardProps) {
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cardList: CardConfig[] = useMemo(() => {
    if (cards && cards.length > 0) return cards;
    return [
      {
        positionX: 0,
        frontImage,
        backImage,
        imageFit,
        lanyardImage,
        lanyardWidth
      }
    ];
  }, [cards, frontImage, backImage, imageFit, lanyardImage, lanyardWidth]);

  return (
    <div className="lanyard-wrapper">
      <Canvas
        camera={{ position: position, fov: isMobile ? fov + 4 : fov }}
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ alpha: transparent }}
        onCreated={({ gl }: { gl: THREE.WebGLRenderer }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
        style={{ pointerEvents: 'auto' }}
      >
        <ambientLight intensity={1.2} />
        <Suspense fallback={null}>
          <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
            {cardList.map((card, idx) => {
              const defaultPosX = idx === 0 ? -2.6 : 2.6;
              const posX = card.positionX ?? defaultPosX;
              const finalPosX = isMobile ? (idx === 0 ? -1.4 : 1.4) : posX;
              return (
                <Band
                  key={card.id || idx}
                  positionX={finalPosX}
                  isMobile={isMobile}
                  frontImage={card.frontImage ?? frontImage}
                  backImage={card.backImage ?? backImage ?? defaultBackLogo}
                  imageFit={card.imageFit ?? imageFit}
                  lanyardImage={card.lanyardImage ?? lanyardImage}
                  lanyardWidth={card.lanyardWidth ?? lanyardWidth}
                />
              );
            })}
          </Physics>
          <Environment blur={0.75}>
            <Lightformer
              intensity={1}
              color="white"
              position={[0, -1, 5]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[100, 0.1, 1]}
            />
            <Lightformer
              intensity={1.5}
              color="white"
              position={[-1, -1, 1]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[100, 0.1, 1]}
            />
            <Lightformer
              intensity={1.5}
              color="white"
              position={[1, 1, 1]}
              rotation={[0, 0, Math.PI / 3]}
              scale={[100, 0.1, 1]}
            />
            <Lightformer
              intensity={2.5}
              color="white"
              position={[-10, 0, 14]}
              rotation={[0, Math.PI / 2, Math.PI / 3]}
              scale={[100, 10, 1]}
            />
          </Environment>
        </Suspense>
      </Canvas>
    </div>
  );
}

interface BandProps {
  positionX?: number;
  maxSpeed?: number;
  minSpeed?: number;
  isMobile?: boolean;
  frontImage?: string | null;
  backImage?: string | null;
  imageFit?: 'cover' | 'contain';
  lanyardImage?: string | null;
  lanyardWidth?: number;
}

function Band({
  positionX = 0,
  maxSpeed = 50,
  minSpeed = 0,
  isMobile = false,
  frontImage = null,
  backImage = defaultBackLogo,
  imageFit = 'cover',
  lanyardImage = null,
  lanyardWidth = 0.55
}: BandProps) {
  const band = useRef<any>(null),
    fixed = useRef<any>(null),
    j1 = useRef<any>(null),
    j2 = useRef<any>(null),
    j3 = useRef<any>(null),
    card = useRef<any>(null);

  const vec = useMemo(() => new THREE.Vector3(), []);
  const ang = useMemo(() => new THREE.Vector3(), []);
  const rot = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);

  const segmentProps = { type: 'dynamic' as const, canSleep: true, colliders: false as const, angularDamping: 4, linearDamping: 4 };
  const { nodes, materials } = useGLTF(cardGLB) as any;
  const texture = useTexture(lanyardImage || lanyard) as THREE.Texture;
  const frontTex = useTexture(frontImage || BLANK_PIXEL) as THREE.Texture;
  const backTex = useTexture(backImage || defaultBackLogo) as THREE.Texture;

  // Composite front and back images onto the card's texture atlas.
  // 100% full coverage across both halves to eliminate any border lines or margins.
  const cardMap = useMemo(() => {
    const baseMap = materials.base.map;

    const baseImg = baseMap?.image;
    const W = baseImg?.width || 1024;
    const H = baseImg?.height || 1024;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return baseMap;

    // 1. Draw Front Face (Photo) across [0.0, 0.50 * W] with full edge bleed
    if (frontImage && frontTex.image) {
      const img = frontTex.image as any;
      const rx = 0;
      const ry = 0;
      const rw = 0.51 * W;
      const rh = 0.82 * H;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, rw, H);
      ctx.clip();

      const pick = imageFit === 'contain' ? Math.min : Math.max;
      const scale = pick(rw / img.width, rh / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = rx + (rw - dw) / 2;
      const dy = ry + (rh - dh) / 2;

      // Draw photo to fill front half completely
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    }

    // 2. Draw Back Face (Debug Thugs Logo + Text) across [0.49 * W, W]
    const backLogoImg = backTex.image as any;
    if (backLogoImg && backLogoImg.width > 0) {
      const rx = 0.49 * W;
      const ry = 0;
      const rw = 0.51 * W;
      const rh = 0.82 * H;

      ctx.save();
      ctx.beginPath();
      ctx.rect(rx, 0, W - rx, H);
      ctx.clip();

      // Card Back Background
      ctx.fillStyle = '#FAF6E8';
      ctx.fillRect(rx, 0, W - rx, H);

      // Card Inner Frame Accent Line
      ctx.strokeStyle = '#E3DAC4';
      ctx.lineWidth = 8;
      ctx.strokeRect(rx + 24, ry + 24, rw - 48, rh - 48);

      // Logo in Center
      const logoTargetW = rw * 0.65;
      const scale = logoTargetW / backLogoImg.width;
      const dw = backLogoImg.width * scale;
      const dh = backLogoImg.height * scale;
      const dx = rx + (rw - dw) / 2;
      const dy = ry + rh * 0.18;
      ctx.drawImage(backLogoImg, dx, dy, dw, dh);

      // "DEBUG THUGS" Heading
      ctx.font = `900 ${Math.round(rw * 0.085)}px sans-serif`;
      ctx.fillStyle = '#1C1B18';
      ctx.textAlign = 'center';
      ctx.fillText('DEBUG THUGS', rx + rw / 2, ry + rh * 0.70);

      // "CORE ENGINEERING TEAM" Subheading
      ctx.font = `700 ${Math.round(rw * 0.042)}px sans-serif`;
      ctx.fillStyle = '#8C6B1F';
      ctx.textAlign = 'center';
      ctx.fillText('CORE ENGINEERING TEAM', rx + rw / 2, ry + rh * 0.79);

      ctx.restore();
    }

    const composite = new THREE.CanvasTexture(canvas);
    composite.colorSpace = THREE.SRGBColorSpace;
    composite.flipY = baseMap ? baseMap.flipY : true;
    composite.anisotropy = 16;
    composite.wrapS = THREE.ClampToEdgeWrapping;
    composite.wrapT = THREE.ClampToEdgeWrapping;
    composite.needsUpdate = true;
    return composite;
  }, [frontImage, backImage, imageFit, frontTex, backTex, materials.base.map]);

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
  );
  const [dragged, drag] = useState<THREE.Vector3 | false>(false);
  const [hovered, hover] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 2.0, 0]
  ]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => void (document.body.style.cursor = 'auto');
    }
  }, [hovered, dragged]);

  useFrame((state: any, delta: number) => {
    if (dragged && card.current) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
    }
    if (fixed.current) {
      [j1, j2].forEach(ref => {
        if (!ref.current) return;
        if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
        const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        );
      });
      if (j3.current && j2.current?.lerped && j1.current?.lerped && fixed.current) {
        curve.points[0].copy(j3.current.translation());
        curve.points[1].copy(j2.current.lerped);
        curve.points[2].copy(j1.current.lerped);
        curve.points[3].copy(fixed.current.translation());
        if (band.current?.geometry) {
          band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));
        }
      }
      if (card.current) {
        ang.copy(card.current.angvel());
        rot.copy(card.current.rotation());
        card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
      }
    }
  });

  curve.curveType = 'chordal';
  if (texture) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  }

  return (
    <>
      <group position={[positionX, 4.5, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[2, 0, 0]} ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'}>
          <CuboidCollider args={[1.08, 1.52, 0.01]} />
          <group
            scale={3.05}
            position={[0, -1.6, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e: any) => (e.target.releasePointerCapture(e.pointerId), drag(false))}
            onPointerDown={(e: any) => (
              e.target.setPointerCapture(e.pointerId),
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())))
            )}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={cardMap}
                map-anisotropy={16}
                clearcoat={isMobile ? 0 : 0.3}
                clearcoatRoughness={0.3}
                roughness={0.5}
                metalness={0.0}
              />
            </mesh>
            <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        {/* @ts-ignore */}
        <meshLineGeometry />
        {/* @ts-ignore */}
        <meshLineMaterial
          color="white"
          depthTest={false}
          resolution={isMobile ? [1000, 2000] : [1000, 1000]}
          useMap
          map={texture}
          repeat={[-4, 1]}
          lineWidth={lanyardWidth}
        />
      </mesh>
    </>
  );
}

useGLTF.preload(cardGLB);
useTexture.preload(lanyard);
useTexture.preload(defaultBackLogo);

