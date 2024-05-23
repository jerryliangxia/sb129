import Enemy from "./components/Enemy";
import Player from "./components/Player";
import { Physics, RigidBody } from "@react-three/rapier";

export default function Experience() {
  return (
    <>
      <ambientLight />
      <pointLight position={[1, 2, 1]} intensity={3} />
      <Physics debug={true}>
        {/* <Enemy /> */}
        <Player />
        <RigidBody type="fixed">
          <mesh receiveShadow position-y={-1.25}>
            <boxGeometry args={[10, 0.5, 10]} />
            <meshStandardMaterial color="greenyellow" />
          </mesh>
        </RigidBody>
      </Physics>
    </>
  );
}
