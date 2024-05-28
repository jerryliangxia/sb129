import { Grid } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";

export const Floor = () => {
  return (
    <>
      {/* <Grid
        args={[300, 300]}
        sectionColor={"lightgray"}
        cellColor={"gray"}
        position={[0, -0.99, 0]}
        userData={{ camExcludeCollision: true }} // this won't be collide by camera ray
      /> */}
      <RigidBody type="fixed">
        <mesh receiveShadow position={[0, -3.5, 0]}>
          <boxGeometry args={[10, 5, 10]} />
          {/* <meshStandardMaterial color="lightblue" transparent /> */}
        </mesh>
      </RigidBody>
    </>
  );
};
