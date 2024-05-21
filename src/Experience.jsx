import Enemy from "./components/Enemy";
import { Physics, RigidBody } from "@react-three/rapier";

export default function Experience() {
  return (
    <>
      <Physics debug={true}>
        <Enemy />
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
