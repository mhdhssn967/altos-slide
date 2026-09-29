import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGLTF, useAnimations, Clone } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';

export function CameraSetup() {
  const { size, camera } = useThree();
  useEffect(() => {
    const zoom = 0.68;
    camera.left = 0;
    camera.right = size.width / zoom;
    camera.top = 0;
    camera.bottom = -size.height / zoom;
    camera.near = -2000;
    camera.far = 2000;
    camera.updateProjectionMatrix();
  }, [size, camera]);
  return null;
}

export function Character3D({ engineRef }) {
  const group = useRef();
  const skateboardRef = useRef();
  const carRef = useRef();
  const { scene, animations } = useGLTF('/newraccoon.glb');
  const { scene: skateboardScene } = useGLTF('/powers/skateboard.glb');
  const { scene: carScene, animations: carAnimations } = useGLTF('/powers/car.glb');
  const { actions } = useAnimations(animations, group);
  const { actions: carActions } = useAnimations(carAnimations, carRef);

  const currentAction = useRef('run');

  useEffect(() => {
    // Start with run animation initially
    if (actions && actions.run) {
      actions.run.play();
    }
    // Set jump animation to play once and freeze on the last frame
    if (actions && actions.jump) {
      actions.jump.setLoop(THREE.LoopOnce, 1);
      actions.jump.clampWhenFinished = true;
    }
    // Set fall animation to play once and freeze on the last frame
    if (actions && actions.fall) {
      actions.fall.setLoop(THREE.LoopOnce, 1);
      actions.fall.clampWhenFinished = true;
    }
  }, [actions]);

  useEffect(() => {
    // Play all car animations (tire rotations) at double speed
    if (carActions) {
      Object.values(carActions).forEach((action) => {
        if (action) {
          action.setEffectiveTimeScale(2);
          action.play();
        }
      });
    }
  }, [carActions]);

  useFrame(() => {
    if (!engineRef.current || !group.current) return;
    const p = engineRef.current.player;
    const cx = engineRef.current.cameraX;
    const cy = engineRef.current.cameraY;
    
    const x = p.x - cx;
    const y = p.y - cy;
    
    // Y-Offset to plant the character's feet firmly on the ground
    const yOffset = 25; 

    // Match 2D canvas coordinates exactly.
    group.current.position.set(x, -y - yOffset, 0);
    group.current.rotation.z = -p.angle;

    if (skateboardRef.current) {
      skateboardRef.current.visible = p.isSkating && !p.isDriving;
    }
    if (carRef.current) {
      carRef.current.visible = p.isDriving;
    }
    
    // Hide character if driving
    scene.visible = !p.isDriving;

    if (p.isSkating && !p.isDriving) {
      scene.position.y = 0.08;
      scene.rotation.y = Math.PI / 4; // 45 degrees default
    } else {
      scene.position.y = 0;
      scene.rotation.y = Math.PI / 2; // Facing right (PI/2)
    }

    // Handle Animation cross-fading based on state
    if (actions) {
      const isJumping = !p.isGrounded;
      const isSkating = p.isSkating;
      
      let targetAction = 'run';
      if (engineRef.current.state === 'CRASHING' || engineRef.current.state === 'GAMEOVER') {
        targetAction = 'fall';
      } else if (isSkating) {
        targetAction = 'skate';
      } else if (isJumping) {
        targetAction = 'jump';
      }

      if (currentAction.current !== targetAction) {
        if (actions[currentAction.current]) {
          actions[currentAction.current].fadeOut(0.2);
        }
        if (actions[targetAction]) {
          actions[targetAction].reset().fadeIn(0.2).play();
        }
        currentAction.current = targetAction;
      } else {
        // Ensure initial play if not running
        if (actions[targetAction] && !actions[targetAction].isRunning()) {
          // If the animation is 'jump' or 'fall', it is clamped to play once, so we shouldn't force replay every frame.
          if (targetAction !== 'jump' && targetAction !== 'fall') {
            actions[targetAction].play();
          }
        }
      }
    }
  });

  return (
    <group ref={group} scale={100}>
      <primitive object={scene} rotation={[0, Math.PI / 2, 0]} scale={1.15} />
      <Clone 
        ref={skateboardRef} 
        object={skateboardScene} 
        visible={false} 
        position={[0, 0, 0]} 
        rotation={[0, Math.PI / 2, 0]} 
        scale={0.75}
      />
      <Clone 
        ref={carRef} 
        object={carScene} 
        visible={false} 
        position={[0, 0, 0]} 
        rotation={[0, -Math.PI / 2, 0]} 
        scale={1.56}
      />
    </group>
  );
}

export function Spaceship3D({ engineRef }) {
  const group = useRef();
  const { scene } = useGLTF('/obstacles/Red Tail by Neil Realubit - 9McOiZT2oty.glb');

  useFrame(() => {
    if (!engineRef.current || !group.current) return;
    const ship = engineRef.current.ship;
    if (!ship || !ship.active) {
      group.current.visible = false;
      return;
    }
    group.current.visible = true;

    const cx = engineRef.current.cameraX;
    const cy = engineRef.current.cameraY;

    const x = ship.x - cx;
    const y = ship.y - cy;

    const time = performance.now() * 0.001;
    // Organic floating hover & banking
    const hoverY = Math.sin(time * 3.5) * 6;
    const tiltZ = Math.sin(time * 2.2) * 0.08;
    const yawY = Math.sin(time * 2.8) * 0.12;

    group.current.position.set(x, -y + hoverY, 0);
    group.current.rotation.z = tiltZ;
    // Rotated 180 degrees in Y axis with smooth yaw sway
    group.current.rotation.y = Math.PI / 2 + yawY;
  });

  return (
    <group ref={group} visible={false}>
      <primitive object={scene} scale={180} rotation={[0, 0, 0]} />
      {/* Thruster rear blue/cyan plasma glow */}
      <pointLight color="#06b6d4" intensity={12} distance={450} decay={2} position={[80, 0, 0]} />
      {/* Targeting warning light on nose */}
      <pointLight color="#ef4444" intensity={8} distance={300} decay={2} position={[-70, 0, 0]} />
    </group>
  );
}

export function SkateboardsOnTrack({ engineRef }) {
  const { scene: skateboardScene } = useGLTF('/powers/skateboard.glb');
  const itemsRef = useRef([]);

  useFrame(() => {
    if (!engineRef.current) return;
    const cx = engineRef.current.cameraX;
    const cy = engineRef.current.cameraY;
    const list = engineRef.current.skateboardsList || [];
    const time = performance.now() * 0.001;
    
    // Always iterate over all 10 pre-allocated pool slots
    for (let i = 0; i < 10; i++) {
      const itemGroup = itemsRef.current[i];
      if (!itemGroup) continue;

      const board = list[i];
      if (board && !board.collected) {
        const x = board.x - cx;
        const y = board.y - cy;

        // Hide if outside visible camera view
        if (x < -200 || x > 2500) {
          itemGroup.visible = false;
          continue;
        }

        itemGroup.visible = true;
        const floatY = Math.sin(time * 4 + i) * 10;
        itemGroup.position.set(x, -y - 15 + floatY + 15, 0);
        
        // Spin the 3D model
        const model = itemGroup.children[0];
        if (model) {
          model.rotation.y += 0.04;
        }

        // Rotate glowing ring around the skateboard
        const halo = itemGroup.children[1];
        if (halo) {
          halo.rotation.y += 0.055;
          halo.rotation.x = Math.PI / 4 + Math.sin(time * 3 + i) * 0.15;
        }
      } else {
        // Explicitly hide collected or empty slots immediately
        itemGroup.visible = false;
      }
    }
  });

  return (
    <group>
      {Array(10).fill().map((_, i) => (
        <group key={i} ref={(el) => { itemsRef.current[i] = el; }} visible={false}>
          {/* 1. 3D Skateboard Model (Doubled Size) */}
          <group rotation={[0, 0, Math.PI / 6]}>
            <Clone object={skateboardScene} scale={70} />
          </group>

          {/* 2. Rotating Cyan Glow Ring */}
          <mesh>
            <torusGeometry args={[48, 3.2, 16, 40]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.88} />
          </mesh>

          {/* 3. Soft Point Light */}
          <pointLight color="#38bdf8" intensity={6} distance={260} decay={2} />
        </group>
      ))}
    </group>
  );
}

export function CarsOnTrack({ engineRef }) {
  const { scene: carScene } = useGLTF('/powers/car.glb');
  const itemsRef = useRef([]);

  useFrame(() => {
    if (!engineRef.current) return;
    const cx = engineRef.current.cameraX;
    const cy = engineRef.current.cameraY;
    const list = engineRef.current.carsList || [];
    const time = performance.now() * 0.001;
    
    // Always iterate over all 10 pre-allocated pool slots
    for (let i = 0; i < 10; i++) {
      const itemGroup = itemsRef.current[i];
      if (!itemGroup) continue;

      const car = list[i];
      if (car && !car.collected) {
        const x = car.x - cx;
        const y = car.y - cy;

        // Hide if outside visible camera view
        if (x < -200 || x > 2500) {
          itemGroup.visible = false;
          continue;
        }

        itemGroup.visible = true;
        const floatY = Math.sin(time * 4 + i) * 10;
        itemGroup.position.set(x, -y - 15 + floatY + 15, 0);
        
        // Spin the 3D model
        const model = itemGroup.children[0];
        if (model) {
          model.rotation.y += 0.04;
        }

        // Rotate glowing ring around the car
        const halo = itemGroup.children[1];
        if (halo) {
          halo.rotation.y += 0.055;
          halo.rotation.x = Math.PI / 3 + Math.sin(time * 3 + i) * 0.15;
        }
      } else {
        // Explicitly hide collected or empty slots immediately
        itemGroup.visible = false;
      }
    }
  });

  return (
    <group>
      {Array(10).fill().map((_, i) => (
        <group key={i} ref={(el) => { itemsRef.current[i] = el; }} visible={false}>
          {/* 1. 3D Car Model (Enlarged Size) */}
          <group rotation={[0, 0, Math.PI / 8]}>
            <Clone object={carScene} scale={95} />
          </group>

          {/* 2. Rotating Ruby / Pink Glow Ring */}
          <mesh>
            <torusGeometry args={[58, 3.8, 16, 40]} />
            <meshBasicMaterial color="#ff2d55" transparent opacity={0.88} />
          </mesh>

          {/* 3. Soft Point Light */}
          <pointLight color="#ff2d55" intensity={8} distance={300} decay={2} />
        </group>
      ))}
    </group>
  );
}

export function RobotEnemiesOnTrack({ engineRef }) {
  return (
    <group>
      {Array(16).fill().map((_, i) => (
        <RobotEnemySlot 
          key={i} 
          engineRef={engineRef} 
          slotIndex={i} 
          type={i % 2 === 0 ? 1 : 2} 
        />
      ))}
    </group>
  );
}

function RobotEnemySlot({ engineRef, slotIndex, type }) {
  const group = useRef();
  const { scene: scene1, animations: anims1 } = useGLTF('/obstacles/robotenemy.glb');
  const { scene: scene2, animations: anims2 } = useGLTF('/obstacles/robotenemy2.glb');

  const baseScene = type === 1 ? scene1 : scene2;
  const baseAnims = type === 1 ? anims1 : anims2;
  const clone = useMemo(() => SkeletonUtils.clone(baseScene), [baseScene]);
  const { actions } = useAnimations(baseAnims, group);

  useEffect(() => {
    if (!actions) return;
    const idleAction = actions['CharacterArmature|Idle'] || actions.Idle || actions.idle || Object.values(actions)[0];
    if (idleAction) {
      idleAction.reset().play();
    }
  }, [actions]);

  useFrame(() => {
    if (!engineRef.current || !group.current) return;
    const list = engineRef.current.robotEnemiesList || [];
    const enemy = list[slotIndex];
    if (!enemy || enemy.defeated) {
      group.current.visible = false;
      return;
    }

    const cx = engineRef.current.cameraX;
    const cy = engineRef.current.cameraY;
    const x = enemy.x - cx;
    const y = enemy.y - cy;

    // Check if within visible world band
    if (x < -200 || x > 2400) {
      group.current.visible = false;
      return;
    }

    group.current.visible = true;
    // Plant feet firmly on the platform/rail deck (adjusted to prevent sinking)
    group.current.position.set(x, -y - 14, 0);
  });

  return (
    <group ref={group} visible={false} rotation={[0, -Math.PI / 2 + (20 * Math.PI / 180), 0]}>
      <primitive object={clone} scale={90} />
      {/* Menacing red visor/eye point light */}
      <pointLight color="#ef4444" intensity={8} distance={280} decay={2} position={[0, 48, 16]} />
    </group>
  );
}

useGLTF.preload('/newraccoon.glb');
useGLTF.preload('/powers/skateboard.glb');
useGLTF.preload('/powers/car.glb');
useGLTF.preload('/obstacles/Red Tail by Neil Realubit - 9McOiZT2oty.glb');
useGLTF.preload('/obstacles/robotenemy.glb');
useGLTF.preload('/obstacles/robotenemy2.glb');

useGLTF.preload('/obstacles/flyenemy.glb');
useGLTF.preload('/obstacles/flyenemy2.glb');

export function FlyPolice({ engineRef }) {
  const { scene: scene1, animations: anims1 } = useGLTF('/obstacles/flyenemy.glb');
  const { scene: scene2, animations: anims2 } = useGLTF('/obstacles/flyenemy2.glb');
  
  const clone1 = useMemo(() => SkeletonUtils.clone(scene1), [scene1]);
  const clone2 = useMemo(() => SkeletonUtils.clone(scene2), [scene2]);
  
  const group1 = useRef();
  const group2 = useRef();
  const crashTimeRef = useRef(0);
  
  const { actions: actions1 } = useAnimations(anims1, group1);
  const { actions: actions2 } = useAnimations(anims2, group2);

  useEffect(() => {
    if (actions1) {
      const idle1 = actions1['CharacterArmature|Idle'] || actions1.Idle || actions1.idle || Object.values(actions1)[0];
      if (idle1) idle1.play();
    }
    if (actions2) {
      const idle2 = actions2['CharacterArmature|Idle'] || actions2.Idle || actions2.idle || Object.values(actions2)[0];
      if (idle2) idle2.play();
    }
  }, [actions1, actions2]);

  useFrame((state, delta) => {
    if (!engineRef.current || !group1.current || !group2.current) return;
    
    const engineState = engineRef.current.state;
    const p = engineRef.current.player;
    const cx = engineRef.current.cameraX;
    const cy = engineRef.current.cameraY;
    const playerX = p.x - cx;
    const playerY = - (p.y - cy) - 25;

    if (engineState !== 'CRASHING' && engineState !== 'GAMEOVER') {
      crashTimeRef.current = 0;
      group1.current.visible = false;
      group2.current.visible = false;
      
      // Start them far off-screen
      group1.current.position.set(playerX - 1500, playerY + 1000, 10);
      group2.current.position.set(playerX + 2000, playerY + 1000, 10);
      return;
    }
    
    group1.current.visible = true;
    group2.current.visible = true;
    
    crashTimeRef.current += delta;
    const t = Math.min(crashTimeRef.current / 0.8, 1.0); // 0.8s to arrive
    const easeT = 1 - Math.pow(1 - t, 3); // easeOutCubic
    
    // Hovering calculations
    const time = performance.now() * 0.002;
    const hoverY = playerY + 140 + Math.sin(time * 1.5) * 15;
    
    const startX1 = playerX - 1500;
    const startX2 = playerX + 2000;
    const startY = playerY + 1000;
    
    // Offset +75 X because the fall animation moves the character mesh forward
    const visualX = playerX + 75; 
    const targetX1 = visualX - 110;
    const targetX2 = visualX + 110;
    const targetY1 = hoverY;
    const targetY2 = hoverY + Math.cos(time * 1.2) * 10;
    
    group1.current.position.set(
      startX1 + (targetX1 - startX1) * easeT,
      startY + (targetY1 - startY) * easeT,
      10
    );
    
    group2.current.position.set(
      startX2 + (targetX2 - startX2) * easeT,
      startY + (targetY2 - startY) * easeT,
      10
    );
    
    // Point at player inward and tilt down
    group1.current.rotation.set(0, Math.PI / 2 + 0.3, -0.4);
    group2.current.rotation.set(0, -Math.PI / 2 - 0.3, 0.4);
  });

  return (
    <group>
      <group ref={group1} visible={false}>
        <primitive object={clone1} scale={90} />
        <pointLight color="#38bdf8" intensity={5} distance={150} />
      </group>
      <group ref={group2} visible={false}>
        <primitive object={clone2} scale={90} />
        <pointLight color="#ef4444" intensity={5} distance={150} />
      </group>
    </group>
  );
}
