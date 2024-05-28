import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  quat,
  RigidBody,
  CapsuleCollider,
  useRapier,
} from "@react-three/rapier";
import { forwardRef, useRef, useMemo, useEffect, useState } from "react";
import { useFollowCam } from "./hooks/useFollowCam";
import { useGame } from "./stores/useGame";
import * as THREE from "three";

export { useFollowCam } from "./hooks/useFollowCam";
export { CharacterAnimation } from "./CharacterAnimation";

const getMovingDirection = (forward, backward, leftward, rightward, pivot) => {
  if (!forward && !backward && !leftward && !rightward) return null;
  if (forward && leftward) return pivot.rotation.y - Math.PI / 4; // Changed + to -
  if (forward && rightward) return pivot.rotation.y + Math.PI / 4; // Changed - to +
  if (backward && leftward) return pivot.rotation.y + Math.PI / 4 + Math.PI; // Changed - to +
  if (backward && rightward) return pivot.rotation.y - Math.PI / 4 + Math.PI; // Changed + to -
  if (backward) return pivot.rotation.y; // Removed + Math.PI
  if (leftward) return pivot.rotation.y - Math.PI / 2; // Changed + to -
  if (rightward) return pivot.rotation.y + Math.PI / 2; // Changed - to +
  if (forward) return pivot.rotation.y + Math.PI; // Added + Math.PI
};

const CharacterControl = forwardRef(
  (
    {
      children,
      capsuleHalfHeight = 0.35,
      capsuleRadius = 0.3,
      floatHeight = 0.3,
      characterInitDir = 0,
      // Follow camera setups
      camInitDis = -2,
      camMaxDis = -2,
      camMinDis = -2,
      camInitDir = { x: 0, y: 0, z: 0 }, // in rad
      camTargetPos = { x: 0, y: 0, z: 0 },
      camMoveSpeed = 1,
      camZoomSpeed = 1,
      camCollision = true,
      camCollisionOffset = 0.7,
      springK = 1.2, // extra props defined from top
      dampingC = 0.08,
      gravityScale = 1,
      ...props
    },
    ref
  ) => {
    const characterRef = ref || useRef();
    const characterModelRef = useRef();
    const characterModelIndicator = useMemo(() => new THREE.Object3D(), []);

    // In game variables
    const curHealth = useGame((state) => state.curHealth);
    const overlayVisible = false;

    /**
     * Body collider setup
     */
    const modelFacingVec = useMemo(() => new THREE.Vector3(), []);
    const bodyFacingVec = useMemo(() => new THREE.Vector3(), []);
    const bodyBalanceVec = useMemo(() => new THREE.Vector3(), []);
    const bodyBalanceVecOnX = useMemo(() => new THREE.Vector3(), []);
    const bodyFacingVecOnY = useMemo(() => new THREE.Vector3(), []);
    const bodyBalanceVecOnZ = useMemo(() => new THREE.Vector3(), []);
    const vectorY = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    const bodyContactForce = useMemo(() => new THREE.Vector3(), []);

    // Animation change functions
    const idleAnimation = useGame((state) => state.idle);
    const walkAnimation = useGame((state) => state.walk);
    const runAnimation = useGame((state) => state.run);
    const jumpAnimation = useGame((state) => state.jump);
    const jumpIdleAnimation = useGame((state) => state.jumpIdle);
    const fallAnimation = useGame((state) => state.fall);
    const action1Animation = useGame((state) => state.action1);
    const action2Animation = useGame((state) => state.action2);
    const action3Animation = useGame((state) => state.action3);
    const action4Animation = useGame((state) => state.action4);

    // Base Control setups
    const maxVelLimit = 2.5;
    const turnVelMultiplier = 0.2;
    const turnSpeed = 15;
    const sprintMult = 2;
    const jumpVel = 4;
    const jumpForceToGroundMult = 5;
    const slopJumpMult = 0.25;
    const sprintJumpMult = 1.2;
    const airDragMultiplier = 0.2;
    const dragDampingC = 0.15;
    const accDeltaTime = 8;
    const rejectVelMult = 4;
    const moveImpulsePointY = 0.5;
    const camFollowMult = 15;
    const fallingGravityScale = 2.5;
    const fallingMaxVel = -20;
    const wakeUpDelay = 200;

    // Floating Ray setups
    const rayOriginOffset = { x: 0, y: -capsuleHalfHeight, z: 0 };
    const rayHitForgiveness = 0.1;
    const rayLength = capsuleRadius + 2;
    const rayDir = { x: 0, y: -1, z: 0 };
    const floatingDis = capsuleRadius + floatHeight;
    // const springK = 1.2; // already passed through as props
    // const dampingC = 0.08; // already passed through as props

    // Slope Ray setups
    const showSlopeRayOrigin = false;
    const slopeMaxAngle = 1; // in radians
    const slopeRayOriginOffset = capsuleRadius - 0.03;
    const slopeRayLength = capsuleRadius + 3;
    const slopeRayDir = { x: 0, y: -1, z: 0 };
    const slopeUpExtraForce = 0.1;
    const slopeDownExtraForce = 0.2;

    // AutoBalance Force setups
    const autoBalance = true;
    const autoBalanceSpringK = 0.3;
    const autoBalanceDampingC = 0.03;
    const autoBalanceSpringOnY = 0.5;
    const autoBalanceDampingOnY = 0.015;

    /**
     * keyboard controls setup
     */
    const [subscribeKeys, getKeys] = useKeyboardControls();
    const presetKeys = {
      forward: false,
      backward: false,
      leftward: false,
      rightward: false,
      jump: false,
      run: false,
    };
    const { rapier, world } = useRapier();

    // can jump setup
    let canJump = false;
    let isFalling = false;
    const initialGravityScale = useMemo(() => gravityScale || 1, []);

    // holding space bar
    const [holdingSpaceBar, setHoldingSpacebar] = useState(false);

    useEffect(() => {
      const handleKeyDown = (event) => {
        // Check if the spacebar is pressed
        if (
          event.code === "Space" &&
          !holdingSpaceBar &&
          curHealth > 0 &&
          !overlayVisible
        ) {
          setHoldingSpacebar(true);
          jumpAnimation();
        }
      };

      const handleKeyUp = (event) => {
        // Check if the spacebar is released
        if (event.code === "Space") {
          setHoldingSpacebar(false);
        }
      };

      // Add event listeners for keydown and keyup
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);

      // Cleanup event listeners
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, []);

    // on moving object state
    let massRatio = 1;
    let isOnMovingObject = false;
    const standingForcePoint = useMemo(() => new THREE.Vector3(), []);
    const movingObjectDragForce = useMemo(() => new THREE.Vector3(), []);
    const movingObjectVelocity = useMemo(() => new THREE.Vector3(), []);
    const movingObjectVelocityInCharacterDir = useMemo(
      () => new THREE.Vector3(),
      []
    );
    const distanceFromCharacterToObject = useMemo(
      () => new THREE.Vector3(),
      []
    );
    const objectAngvelToLinvel = useMemo(() => new THREE.Vector3(), []);
    const velocityDiff = useMemo(() => new THREE.Vector3(), []);

    /**
     * Initial light setup
     */
    let dirLight = null;

    /**
     * Follow camera initial setups from props
     */
    const cameraSetups = {
      camInitDis,
      camMaxDis,
      camMinDis,
      camMoveSpeed,
      camZoomSpeed,
      camCollisionOffset,
    };

    /**
     * Load camera pivot and character move preset
     */
    const { pivot, cameraCollisionDetect } = useFollowCam(cameraSetups);
    const pivotPosition = useMemo(() => new THREE.Vector3(), []);
    const modelEuler = useMemo(() => new THREE.Euler(), []);
    const modelQuat = useMemo(() => new THREE.Quaternion(), []);
    const moveImpulse = useMemo(() => new THREE.Vector3(), []);
    const movingDirection = useMemo(() => new THREE.Vector3(), []);
    const moveAccNeeded = useMemo(() => new THREE.Vector3(), []);
    const jumpVelocityVec = useMemo(() => new THREE.Vector3(), []);
    const jumpDirection = useMemo(() => new THREE.Vector3(), []);
    const currentVel = useMemo(() => new THREE.Vector3(), []);
    const currentPos = useMemo(() => new THREE.Vector3(), []);
    const dragForce = useMemo(() => new THREE.Vector3(), []);
    const dragAngForce = useMemo(() => new THREE.Vector3(), []);
    const wantToMoveVel = useMemo(() => new THREE.Vector3(), []);
    const rejectVel = useMemo(() => new THREE.Vector3(), []);

    /**
     * Floating Ray setup
     */
    let floatingForce = null;
    const springDirVec = useMemo(() => new THREE.Vector3(), []);
    const characterMassForce = useMemo(() => new THREE.Vector3(), []);
    const rayOrigin = useMemo(() => new THREE.Vector3(), []);
    const rayCast = new rapier.Ray(rayOrigin, rayDir);
    let rayHit = null;

    /**Test shape ray */
    // const shape = new rapier.Capsule(0.2,0.1)

    /**
     * Slope detection ray setup
     */
    let slopeAngle = null;
    let actualSlopeNormal = null;
    let actualSlopeAngle = null;
    const actualSlopeNormalVec = useMemo(() => new THREE.Vector3(), []);
    const floorNormal = useMemo(() => new THREE.Vector3(0, 1, 0), []);
    const slopeRayOriginRef = useRef();
    const slopeRayorigin = useMemo(() => new THREE.Vector3(), []);
    const slopeRayCast = new rapier.Ray(slopeRayorigin, slopeRayDir);
    let slopeRayHit = null;

    /**
     * Character moving function
     */
    const moveCharacter = (_, run, slopeAngle, movingObjectVelocity) => {
      /**
       * Setup moving direction
       */
      // Only apply slope extra force when slope angle is between 0.2 and slopeMaxAngle, actualSlopeAngle < slopeMaxAngle
      if (
        actualSlopeAngle < slopeMaxAngle &&
        Math.abs(slopeAngle) > 0.2 &&
        Math.abs(slopeAngle) < slopeMaxAngle
      ) {
        movingDirection.set(0, Math.sin(slopeAngle), Math.cos(slopeAngle));
      } else if (actualSlopeAngle >= slopeMaxAngle) {
        movingDirection.set(
          0,
          Math.sin(slopeAngle) > 0 ? 0 : Math.sin(slopeAngle),
          Math.sin(slopeAngle) > 0 ? 0.1 : 1
        );
      } else {
        movingDirection.set(0, 0, 1);
      }

      // Apply character quaternion to moving direction
      movingDirection.applyQuaternion(characterModelIndicator.quaternion);

      /**
       * Moving object conditions
       */
      // Calculate moving object velocity direction according to character moving direction
      movingObjectVelocityInCharacterDir
        .copy(movingObjectVelocity)
        .projectOnVector(movingDirection)
        .multiply(movingDirection);
      // Calculate angle between moving object velocity direction and character moving direction
      const angleBetweenCharacterDirAndObjectDir =
        movingObjectVelocity.angleTo(movingDirection);

      /**
       * Setup rejection velocity, (currently only work on ground)
       */
      const wantToMoveMeg = currentVel.dot(movingDirection);
      wantToMoveVel.set(
        movingDirection.x * wantToMoveMeg,
        0,
        movingDirection.z * wantToMoveMeg
      );
      rejectVel.copy(currentVel).sub(wantToMoveVel);

      /**
       * Calculate required accelaration and force: a = Δv/Δt
       * If it's on a moving/rotating platform, apply platform velocity to Δv accordingly
       * Also, apply reject velocity when character is moving opposite of it's moving direction
       */
      moveAccNeeded.set(
        (movingDirection.x *
          (maxVelLimit * (run ? sprintMult : 1) +
            movingObjectVelocityInCharacterDir.x) -
          (currentVel.x -
            movingObjectVelocity.x *
              Math.sin(angleBetweenCharacterDirAndObjectDir) +
            rejectVel.x * (isOnMovingObject ? 0 : rejectVelMult))) /
          accDeltaTime,
        0,
        (movingDirection.z *
          (maxVelLimit * (run ? sprintMult : 1) +
            movingObjectVelocityInCharacterDir.z) -
          (currentVel.z -
            movingObjectVelocity.z *
              Math.sin(angleBetweenCharacterDirAndObjectDir) +
            rejectVel.z * (isOnMovingObject ? 0 : rejectVelMult))) /
          accDeltaTime
      );

      // Wanted to move force function: F = ma
      const moveForceNeeded = moveAccNeeded.multiplyScalar(
        characterRef.current.mass()
      );

      /**
       * Check if character complete turned to the wanted direction
       */
      const characterRotated =
        Math.sin(characterModelIndicator.rotation.y).toFixed(3) ==
        Math.sin(modelEuler.y).toFixed(3);

      // If character hasn't complete turning, change the impulse quaternion follow characterModelIndicator quaternion
      if (!characterRotated) {
        moveImpulse.set(
          moveForceNeeded.x *
            turnVelMultiplier *
            (canJump ? 1 : airDragMultiplier), // if it's in the air, give it less control
          slopeAngle === null || slopeAngle == 0 // if it's on a slope, apply extra up/down force to the body
            ? 0
            : movingDirection.y *
                turnVelMultiplier *
                (movingDirection.y > 0 // check it is on slope up or slope down
                  ? slopeUpExtraForce
                  : slopeDownExtraForce) *
                (run ? sprintMult : 1),
          moveForceNeeded.z *
            turnVelMultiplier *
            (canJump ? 1 : airDragMultiplier) // if it's in the air, give it less control
        );
      }
      // If character complete turning, change the impulse quaternion default
      else {
        moveImpulse.set(
          moveForceNeeded.x * (canJump ? 1 : airDragMultiplier),
          slopeAngle === null || slopeAngle == 0 // if it's on a slope, apply extra up/down force to the body
            ? 0
            : movingDirection.y *
                (movingDirection.y > 0 // check it is on slope up or slope down
                  ? slopeUpExtraForce
                  : slopeDownExtraForce) *
                (run ? sprintMult : 1),
          moveForceNeeded.z * (canJump ? 1 : airDragMultiplier)
        );
      }

      // Move character at proper direction and impulse
      characterRef.current.applyImpulseAtPoint(
        moveImpulse,
        {
          x: currentPos.x,
          y: currentPos.y + moveImpulsePointY,
          z: currentPos.z,
        },
        true
      );
    };

    /**
     * Character auto balance function
     */
    const autoBalanceCharacter = () => {
      // Match body component to character model rotation on Y
      bodyFacingVec
        .set(0, 0, 1)
        .applyQuaternion(quat(characterRef.current.rotation()));
      bodyBalanceVec
        .set(0, 1, 0)
        .applyQuaternion(quat(characterRef.current.rotation()));

      bodyBalanceVecOnX.set(0, bodyBalanceVec.y, bodyBalanceVec.z);
      bodyFacingVecOnY.set(bodyFacingVec.x, 0, bodyFacingVec.z);
      bodyBalanceVecOnZ.set(bodyBalanceVec.x, bodyBalanceVec.y, 0);

      characterModelIndicator.getWorldDirection(modelFacingVec);
      const crossVecOnX = vectorY.clone().cross(bodyBalanceVecOnX);
      const crossVecOnY = modelFacingVec.clone().cross(bodyFacingVecOnY);
      const crossVecOnZ = vectorY.clone().cross(bodyBalanceVecOnZ);

      dragAngForce.set(
        (crossVecOnX.x < 0 ? 1 : -1) *
          autoBalanceSpringK *
          bodyBalanceVecOnX.angleTo(vectorY) -
          characterRef.current.angvel().x * autoBalanceDampingC,
        (crossVecOnY.y < 0 ? 1 : -1) *
          autoBalanceSpringOnY *
          modelFacingVec.angleTo(bodyFacingVecOnY) -
          characterRef.current.angvel().y * autoBalanceDampingOnY,
        (crossVecOnZ.z < 0 ? 1 : -1) *
          autoBalanceSpringK *
          bodyBalanceVecOnZ.angleTo(vectorY) -
          characterRef.current.angvel().z * autoBalanceDampingC
      );

      // Apply balance torque impulse
      characterRef.current.applyTorqueImpulse(dragAngForce, true);
    };

    /**
     * Character sleep function
     */
    const sleepCharacter = () => {
      if (characterRef.current) {
        if (document.visibilityState === "hidden") {
          characterRef.current.sleep();
        } else {
          setTimeout(() => {
            characterRef.current.wakeUp();
          }, wakeUpDelay);
        }
      }
    };

    // useEffect(() => {
    //   // Initialize directional light
    //   if (followLight) {
    //     dirLight = characterModelRef.current.parent.parent.children.find(
    //       (item) => {
    //         return item.name === "followLight";
    //       }
    //     );
    //   }
    // });

    /**
     * Keyboard controls subscribe setup
     */
    // If inside keyboardcontrols, active subscribeKeys
    useEffect(() => {
      // Action 1 key subscribe for special animation
      const unSubscribeAction1 = subscribeKeys(
        (state) => state.action1,
        (value) => {
          if (value) {
            action1Animation();
          }
        }
      );

      // Action 2 key subscribe for special animation
      const unSubscribeAction2 = subscribeKeys(
        (state) => state.action2,
        (value) => {
          if (value) {
            action2Animation();
          }
        }
      );

      // Action 3 key subscribe for special animation
      const unSubscribeAction3 = subscribeKeys(
        (state) => state.action3,
        (value) => {
          if (value) {
            action3Animation();
          }
        }
      );

      // Trigger key subscribe for special animation
      const unSubscribeAction4 = subscribeKeys(
        (state) => state.action4,
        (value) => {
          if (value) {
            action4Animation();
          }
        }
      );

      //   // Mouse click listener for action4
      //   const handleClick = (event) => {
      //     // Check if the left mouse button was clicked
      //     if (event.button === 0) {
      //       // 0 is the button code for the left mouse button
      //       action4Animation();
      //     }
      //   };

      //   window.addEventListener("click", handleClick);

      return () => {
        unSubscribeAction1();
        unSubscribeAction2();
        unSubscribeAction3();
        unSubscribeAction4();
        // window.removeEventListener("click", handleClick);
      };
    });

    // TODO what is this
    useEffect(() => {
      // Lock character rotations at Y axis
      characterRef.current.setEnabledRotations(
        autoBalance ? true : false,
        autoBalance ? true : false,
        autoBalance ? true : false,
        false
      );

      // Reset character quaternion
      return () => {
        if (characterRef.current && characterModelRef.current) {
          characterModelRef.current.quaternion.set(0, 0, 0, 1);
          characterRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, false);
        }
      };
    }, [autoBalance]);

    // TODO is this useful
    useEffect(() => {
      // Initialize character facing direction
      modelEuler.y = characterInitDir;
      // Initialize camera facing direction
      pivot.rotation.x = camInitDir.x;
      pivot.rotation.y = camInitDir.y;
      pivot.rotation.z = camInitDir.z;

      window.addEventListener("visibilitychange", sleepCharacter);

      return () => {
        window.removeEventListener("visibilitychange", sleepCharacter);
      };
    }, []);

    // Big movement function
    useFrame((state, delta) => {
      // Character current position
      if (characterRef.current) {
        currentPos.copy(characterRef.current.translation());
      }

      /**
       * Getting all the useful keys from useKeyboardControls
       */
      const { forward, backward, leftward, rightward, jump, run } = getKeys();

      // Getting moving directions (IIFE)
      modelEuler.y = ((movingDirection) =>
        movingDirection === null ? modelEuler.y : movingDirection)(
        getMovingDirection(forward, backward, leftward, rightward, pivot)
      );
      // Move character to the moving direction
      if ((forward || backward || leftward || rightward) && curHealth > 0)
        moveCharacter(delta, run, slopeAngle, movingObjectVelocity);

      // Character current velocity
      if (characterRef.current) currentVel.copy(characterRef.current.linvel());

      // Jump impulse
      if (jump && canJump && curHealth > 0 && !overlayVisible) {
        // characterRef.current.applyImpulse(jumpDirection.set(0, 0.5, 0), true);
        jumpVelocityVec.set(
          currentVel.x,
          run ? sprintJumpMult * jumpVel : jumpVel,
          currentVel.z
        );
        // Apply slope normal to jump direction
        characterRef.current.setLinvel(
          jumpDirection
            .set(
              0,
              (run ? sprintJumpMult * jumpVel : jumpVel) * slopJumpMult,
              0
            )
            .projectOnVector(actualSlopeNormalVec)
            .add(jumpVelocityVec),
          true
        );
        // Apply jump force downward to the standing platform
        characterMassForce.y *= jumpForceToGroundMult;
        rayHit.collider
          .parent()
          ?.applyImpulseAtPoint(characterMassForce, standingForcePoint, true);
      }

      // Rotate character Indicator
      if (curHealth > 0 && !overlayVisible) {
        modelQuat.setFromEuler(modelEuler);
        characterModelIndicator.quaternion.rotateTowards(
          modelQuat,
          delta * turnSpeed
        );
      }
      // REMOVED CODE - Autobalance is always on

      /**
       *  Camera movement
       */
      pivotPosition.set(
        currentPos.x + camTargetPos.x,
        currentPos.y +
          (camTargetPos.y || capsuleHalfHeight + capsuleRadius / 2),
        currentPos.z + camTargetPos.z
      );
      pivot.position.lerp(pivotPosition, 1 - Math.exp(-camFollowMult * delta));
      state.camera.lookAt(pivot.position);

      /**
       * Ray casting detect if on ground
       */
      rayOrigin.addVectors(currentPos, rayOriginOffset);
      rayHit = world.castRay(
        rayCast,
        rayLength,
        true,
        null,
        null,
        // I have no idea
        characterRef.current,
        characterRef.current,
        // this exclude with sensor collider
        (collider) => !collider.isSensor()
      );
      /**Test shape ray */
      // rayHit = world.castShape(
      //   currentPos,
      //   { w: 0, x: 0, y: 0, z: 0 },
      //   {x:0,y:-1,z:0},
      //   shape,
      //   rayLength,
      //   true,
      //   null,
      //   null,
      //   characterRef.current
      // );

      if (rayHit && rayHit.toi < floatingDis + rayHitForgiveness) {
        if (slopeRayHit && actualSlopeAngle < slopeMaxAngle) {
          canJump = true;
        }
      } else {
        canJump = false;
      }

      /**
       * Ray detect if on rigid body or dynamic platform, then apply the linear velocity and angular velocity to character
       */
      if (rayHit && canJump) {
        if (rayHit.collider.parent()) {
          // Getting the standing force apply point
          standingForcePoint.set(
            rayOrigin.x,
            rayOrigin.y - rayHit.toi,
            rayOrigin.z
          );
          const rayHitObjectBodyType = rayHit.collider.parent().bodyType();
          const rayHitObjectBodyMass = rayHit.collider.parent().mass();
          massRatio = characterRef.current.mass() / rayHitObjectBodyMass;
          // Body type 0 is rigid body, body type 1 is fixed body, body type 2 is kinematic body
          if (rayHitObjectBodyType === 0 || rayHitObjectBodyType === 2) {
            isOnMovingObject = true;
            // Calculate distance between character and moving object
            distanceFromCharacterToObject
              .copy(currentPos)
              .sub(rayHit.collider.parent().translation());
            // Moving object linear velocity
            const movingObjectLinvel = rayHit.collider.parent().linvel();
            // Moving object angular velocity
            const movingObjectAngvel = rayHit.collider.parent().angvel();
            // Combine object linear velocity and angular velocity to movingObjectVelocity
            movingObjectVelocity
              .set(
                movingObjectLinvel.x +
                  objectAngvelToLinvel.crossVectors(
                    movingObjectAngvel,
                    distanceFromCharacterToObject
                  ).x,
                movingObjectLinvel.y,
                movingObjectLinvel.z +
                  objectAngvelToLinvel.crossVectors(
                    movingObjectAngvel,
                    distanceFromCharacterToObject
                  ).z
              )
              .multiplyScalar(Math.min(1, 1 / massRatio));
            // If the velocity diff is too high (> 30), ignore movingObjectVelocity
            velocityDiff.subVectors(movingObjectVelocity, currentVel);
            if (velocityDiff.length() > 30)
              movingObjectVelocity.multiplyScalar(1 / velocityDiff.length());

            // Apply opposite drage force to the stading rigid body, body type 0
            // Character moving and unmoving should provide different drag force to the platform
            if (rayHitObjectBodyType === 0) {
              if (!forward && !backward && !leftward && !rightward && canJump) {
                movingObjectDragForce
                  .copy(bodyContactForce)
                  .multiplyScalar(delta)
                  .multiplyScalar(Math.min(1, 1 / massRatio)) // Scale up/down base on different masses ratio
                  .negate();
                bodyContactForce.set(0, 0, 0);
              } else {
                movingObjectDragForce
                  .copy(moveImpulse)
                  .multiplyScalar(Math.min(1, 1 / massRatio)) // Scale up/down base on different masses ratio
                  .negate();
              }
              rayHit.collider
                .parent()
                .applyImpulseAtPoint(
                  movingObjectDragForce,
                  standingForcePoint,
                  true
                );
            }
          } else {
            // on fixed body
            massRatio = 1;
            isOnMovingObject = false;
            bodyContactForce.set(0, 0, 0);
            movingObjectVelocity.set(0, 0, 0);
          }
        }
      } else {
        // in the air
        massRatio = 1;
        isOnMovingObject = false;
        bodyContactForce.set(0, 0, 0);
        movingObjectVelocity.set(0, 0, 0);
      }

      /**
       * Slope ray casting detect if on slope
       */
      slopeRayOriginRef.current.getWorldPosition(slopeRayorigin);
      slopeRayorigin.y = rayOrigin.y;
      slopeRayHit = world.castRay(
        slopeRayCast,
        slopeRayLength,
        true,
        null,
        null,
        // Still no idea
        characterRef.current,
        characterRef.current,
        // this exclude with sensor collider
        (collider) => !collider.isSensor()
      );

      // Calculate slope angle
      if (slopeRayHit) {
        actualSlopeNormal = slopeRayHit.collider.castRayAndGetNormal(
          slopeRayCast,
          slopeRayLength,
          false
        )?.normal;
        if (actualSlopeNormal) {
          actualSlopeNormalVec?.set(
            actualSlopeNormal.x,
            actualSlopeNormal.y,
            actualSlopeNormal.z
          );
          actualSlopeAngle = actualSlopeNormalVec?.angleTo(floorNormal);
        }
      }
      if (slopeRayHit && rayHit && slopeRayHit.toi < floatingDis + 0.5) {
        if (canJump) {
          // Round the slope angle to 2 decimal places
          slopeAngle = Number(
            Math.atan((rayHit.toi - slopeRayHit.toi) / rayOriginOffset).toFixed(
              2
            )
          );
        } else {
          slopeAngle = null;
        }
      } else {
        slopeAngle = null;
      }

      /**
       * Apply floating force
       */
      if (rayHit != null) {
        if (canJump && rayHit.collider.parent()) {
          floatingForce =
            springK * (floatingDis - rayHit.toi) -
            characterRef.current.linvel().y * dampingC;
          characterRef.current.applyImpulse(
            springDirVec.set(0, floatingForce, 0),
            false
          );

          // Apply opposite force to standing object (gravity g in rapier is 0.11 ?_?)
          characterMassForce.set(0, floatingForce > 0 ? -floatingForce : 0, 0);
          rayHit.collider
            .parent()
            ?.applyImpulseAtPoint(characterMassForce, standingForcePoint, true);
        }
      }

      /**
       * Apply drag force if it's not moving
       */
      if (!forward && !backward && !leftward && !rightward && canJump) {
        // not on a moving object
        if (!isOnMovingObject) {
          dragForce.set(
            -currentVel.x * dragDampingC,
            0,
            -currentVel.z * dragDampingC
          );
          characterRef.current.applyImpulse(dragForce, false);
        }
        // on a moving object
        else {
          dragForce.set(
            (movingObjectVelocity.x - currentVel.x) * dragDampingC,
            0,
            (movingObjectVelocity.z - currentVel.z) * dragDampingC
          );
          characterRef.current.applyImpulse(dragForce, true);
        }
      }

      /**
       * Detect character falling state
       */
      isFalling = currentVel.y < 0 && !canJump ? true : false;

      /**
       * Apply larger gravity when falling
       */
      if (characterRef.current) {
        if (
          currentVel.y < fallingMaxVel &&
          characterRef.current.gravityScale() !== 0
        ) {
          characterRef.current.setGravityScale(0, true);
        } else if (
          isFalling &&
          characterRef.current.gravityScale() !== fallingGravityScale
        ) {
          characterRef.current.setGravityScale(fallingGravityScale, true);
        } else if (
          !isFalling &&
          characterRef.current.gravityScale() !== initialGravityScale
        ) {
          characterRef.current.setGravityScale(initialGravityScale, true);
        }
      }

      /**
       * Apply auto balance force to the character
       */
      if (autoBalance && characterRef.current) autoBalanceCharacter();

      /**
       * Camera collision detect
       */
      camCollision && cameraCollisionDetect(delta);

      /**
       * Apply all the animations
       */
      if (curHealth <= 0 || overlayVisible) return;
      if (
        !forward &&
        !backward &&
        !leftward &&
        !rightward &&
        !jump &&
        canJump
      ) {
        idleAnimation();
      } else if (jump && canJump && !holdingSpaceBar) {
        jumpAnimation();
      } else if (
        canJump &&
        (forward || backward || leftward || rightward) &&
        !holdingSpaceBar
      ) {
        run ? runAnimation() : walkAnimation();
      } else if (!canJump) {
        jumpIdleAnimation();
      }
      // On high sky, play falling animation
      if (rayHit == null && isFalling) {
        fallAnimation();
      }
    });

    return (
      <RigidBody
        colliders={false}
        ref={characterRef}
        userData={{ type: "character" }}
        position={props.position || [0, 5, 0]}
        friction={props.friction || -0.5}
        onContactForce={(e) => {
          if (curHealth > 0 && !overlayVisible) {
            bodyContactForce.set(
              e.totalForce.x,
              e.totalForce.y,
              e.totalForce.z
            );
          }
        }}
        onCollisionExit={() => bodyContactForce.set(0, 0, 0)}
        {...props}
      >
        <CapsuleCollider
          name="character-capsule-collider"
          args={[capsuleHalfHeight, capsuleRadius]}
        />
        <group ref={characterModelRef} userData={{ camExcludeCollision: true }}>
          {/* This mesh is used for positioning the slope ray origin */}
          <mesh
            position={[
              rayOriginOffset.x,
              rayOriginOffset.y,
              rayOriginOffset.z + slopeRayOriginOffset,
            ]}
            ref={slopeRayOriginRef}
            visible={showSlopeRayOrigin}
            userData={{ camExcludeCollision: true }} // this won't be collide by camera ray
          >
            <boxGeometry args={[0.15, 0.15, 0.15]} />
          </mesh>
          {/* Character model */}
          {children}
        </group>
      </RigidBody>
    );
  }
);

export default CharacterControl;
