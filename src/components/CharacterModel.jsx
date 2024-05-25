/*
This file was generated by https://github.com/pmndrs/gltfjsx and then
customized manually. It uses drei's new useAnimations hook which extracts
all actions and sets up a THREE.AnimationMixer for it so that you don't have to.
All of the assets actions, action-names and clips are available in its output. 
*/

import * as THREE from "three";
import { useKeyboardControls } from "@react-three/drei";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useGLTF, useAnimations, useTexture } from "@react-three/drei";
import { useGame } from "../stores/useGame";
import { useGraph } from "@react-three/fiber";
import { RigidBody, CapsuleCollider } from "@react-three/rapier";
import { SkeletonUtils } from "three-stdlib";

export default function CharacterModel() {
  // For the rigidbody component
  const body = useRef();
  // Fetch model and a separate texture
  const { scene, animations, materials } = useGLTF("/squidward.glb");

  // Skinned meshes cannot be re-used in threejs without cloning them
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  // useGraph creates two flat object collections for nodes and materials
  const { nodes } = useGraph(clone);

  // Extract animation actions
  const { ref, actions, names } = useAnimations(animations);
  const texture = useTexture("/base_color.png");
  const getCharacterPosition = useGame((state) => state.getCurPosition);

  const [index, setIndex] = useState(2);

  let animationSet = {
    idle: "Idle",
    walk: "Walk",
    run: "Run",
    jump: "JumpStart",
    jumpIdle: "JumpIdle",
    jumpLand: "JumpLand",
    fall: "JumpIdle",
    action1: "JumpIdle",
    action2: "JumpIdle",
    action3: "JumpLand",
    action4: "RArmAttack",
    action5: "Fall",
    action6: "Death",
  };
  const initializeAnimationSet = useGame(
    (state) => state.initializeAnimationSet
  );

  // Bone filtering
  useEffect(() => {
    // Initialize animation set
    initializeAnimationSet(animationSet);
  }, [actions, initializeAnimationSet]);

  useEffect(() => {
    const action = actions[names[index]];
    if (action) {
      action.reset().play();
      action.clampWhenFinished = false;
      action.loop = THREE.LoopRepeat;

      // Set up an event listener for when the action finishes
      action.getMixer().addEventListener("finished", () => {
        console.log(index);
        setIndex((prevIndex) => (prevIndex + 1) % names.length); // Cycle through indices
      });
    }
    return () => {
      //   action?.fadeOut(0.5);
      action?.getMixer().removeEventListener("finished"); // Clean up the event listener
    };
  }, [index, actions, names, setIndex]);

  return (
    <RigidBody
      ref={body}
      userData={{ type: "enemy" }}
      colliders={false}
      canSleep={false}
      mass={1.0}
      linearDamping={1}
      angularDamping={0.5}
      enabledRotations={[false, false, false]}
      onCollisionEnter={() => {
        console.log("here");
      }}
    >
      {/* <CapsuleCollider args={[0.8, 1.2]} position={[0, 0, 0]} /> */}
      {/* <group ref={ref} dispose={null} scale={0.4} position={[0, -2.0, 0]}> */}
      <group ref={ref} dispose={null} scale={0.4} position={[0, -0.5, 0]}>
        <group name="Scene">
          <group name="Armature">
            <skinnedMesh
              name="Base"
              geometry={nodes.Base.geometry}
              material={materials.BaseColor}
              skeleton={nodes.Base.skeleton}
            >
              <meshStandardMaterial map={texture} map-flipY={false} />
            </skinnedMesh>
            <skinnedMesh
              name="EyeBags"
              geometry={nodes.EyeBags.geometry}
              material={materials.BaseColor}
              skeleton={nodes.EyeBags.skeleton}
              morphTargetDictionary={nodes.EyeBags.morphTargetDictionary}
              morphTargetInfluences={nodes.EyeBags.morphTargetInfluences}
            >
              <meshStandardMaterial map={texture} map-flipY={false} />
            </skinnedMesh>
            <skinnedMesh
              name="Eyes"
              geometry={nodes.Eyes.geometry}
              material={materials.BaseColor}
              skeleton={nodes.Eyes.skeleton}
            >
              <meshStandardMaterial map={texture} map-flipY={false} />
            </skinnedMesh>
            <skinnedMesh
              name="Pupils"
              geometry={nodes.Pupils.geometry}
              material={materials.BaseColor}
              skeleton={nodes.Pupils.skeleton}
            >
              <meshStandardMaterial map={texture} map-flipY={false} />
            </skinnedMesh>
            <primitive object={nodes.Spine} />
            <primitive object={nodes.Hips} />
          </group>
        </group>
      </group>
    </RigidBody>
  );
}