import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const useFollowCam = function (props) {
  const { scene, camera } = useThree();
  let isMouseDown = false;

  let originZDis = props.camInitDis;
  const camMaxDis = props.camMaxDis;
  const camMinDis = props.camMinDis;
  const camMoveSpeed = props.camMoveSpeed;
  const camZoomSpeed = props.camZoomSpeed;
  const camCollisionOffset = props.camCollisionOffset;
  const pivot = useMemo(() => new THREE.Object3D(), []);
  const followCam = useMemo(() => {
    const origin = new THREE.Object3D();
    origin.position.set(0, 0, originZDis);
    return origin;
  }, []);

  /** Camera collison detect setups */
  let smallestDistance = null;
  let cameraDistance = null;
  let intersects = null;
  let intersectObjects = [];
  const cameraRayDir = useMemo(() => new THREE.Vector3(), []);
  const cameraRayOrigin = useMemo(() => new THREE.Vector3(), []);
  const cameraPosition = useMemo(() => new THREE.Vector3(), []);
  const camLerpingPoint = useMemo(() => new THREE.Vector3(), []);
  const camRayCast = new THREE.Raycaster(
    cameraRayOrigin,
    cameraRayDir,
    0,
    -camMaxDis
  );

  // Mouse move event
  const onDocumentMouseMove = (e) => {
    if (document.pointerLockElement || isMouseDown) {
      pivot.rotation.y -= e.movementX * 0.002 * camMoveSpeed;
      const vy = followCam.rotation.x + e.movementY * 0.002 * camMoveSpeed;

      cameraDistance = followCam.position.length();

      if (vy >= -0.5 && vy <= 1.5) {
        followCam.rotation.x = vy;
        followCam.position.y = -cameraDistance * Math.sin(-vy);
        followCam.position.z = -cameraDistance * Math.cos(-vy);
      }
    }
    return false;
  };

  // Mouse scroll event
  const onDocumentMouseWheel = (e) => {
    const vz = originZDis - e.deltaY * 0.002 * camZoomSpeed;
    const vy = followCam.rotation.x;

    if (vz >= camMaxDis && vz <= camMinDis) {
      originZDis = vz;
      followCam.position.z = originZDis * Math.cos(-vy);
      followCam.position.y = originZDis * Math.sin(-vy);
    }
    return false;
  };

  /**
   * Custom traverse function
   */
  // Prepare intersect objects for camera collision
  function customTraverse(object) {
    // Chekc if the object's userData camExcludeCollision is true
    if (object.userData && object.userData.camExcludeCollision === true) {
      return;
    }

    // Check if the object is a Mesh, and not Text ("InstancedBufferGeometry")
    if (object.isMesh && object.geometry.type !== "InstancedBufferGeometry") {
      intersectObjects.push(object);
    }

    // Recursively traverse child objects
    object.children.forEach((child) => {
      customTraverse(child); // Continue the traversal for all child objects
    });
  }

  /**
   * Camera collision detection function
   */
  const cameraCollisionDetect = (delta) => {
    // Update collision detect ray origin and pointing direction
    // Which is from pivot point to camera position
    cameraRayOrigin.copy(pivot.position);
    camera.getWorldPosition(cameraPosition);
    cameraRayDir.subVectors(cameraPosition, pivot.position);

    // casting ray hit, if object in between character and camera,
    // change the smallestDistance to the ray hit toi
    // otherwise the smallestDistance is same as camera original position (originZDis)
    intersects = camRayCast.intersectObjects(intersectObjects);
    if (intersects.length && intersects[0].distance <= -originZDis) {
      smallestDistance =
        -intersects[0].distance * camCollisionOffset < -0.7
          ? -intersects[0].distance * camCollisionOffset
          : -0.7;
    } else {
      smallestDistance = originZDis;
    }

    // Update camera next lerping position, and lerp the camera
    camLerpingPoint.set(
      followCam.position.x,
      smallestDistance * Math.sin(-followCam.rotation.x),
      smallestDistance * Math.cos(-followCam.rotation.x)
    );

    followCam.position.lerp(camLerpingPoint, delta * 4); // delta * 2 for rapier ray setup
  };

  useEffect(() => {
    // Prepare for camera ray intersect objects
    scene.children.forEach((child) => customTraverse(child));

    // Prepare for followCam and pivot point
    followCam.add(camera);
    pivot.add(followCam);

    document.addEventListener("mousedown", () => {
      isMouseDown = true;
    });
    document.addEventListener("mouseup", () => {
      isMouseDown = false;
    });
    document.addEventListener("mousemove", onDocumentMouseMove);
    document.addEventListener("mousewheel", onDocumentMouseWheel);

    return () => {
      document.removeEventListener("mousedown", () => {
        isMouseDown = true;
      });
      document.removeEventListener("mouseup", () => {
        isMouseDown = false;
      });
      document.removeEventListener("mousemove", onDocumentMouseMove);
      document.removeEventListener("mousewheel", onDocumentMouseWheel);
      // Remove camera from followCam
      followCam.remove(camera);
    };
  });

  return { pivot, followCam, cameraCollisionDetect };
};
