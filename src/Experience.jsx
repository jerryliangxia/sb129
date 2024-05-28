import Enemy from "./components/Enemy";
import CharacterModel from "./components/CharacterModel";
import { Physics, RigidBody } from "@react-three/rapier";
import { Grid, KeyboardControls } from "@react-three/drei";
import CharacterControl from "./CharacterControl";
import { Floor } from "./components/Floor";

export default function Experience() {
  /**
   * Keyboard control preset
   */
  const keyboardMap = [
    { name: "forward", keys: ["ArrowUp", "KeyW"] },
    { name: "backward", keys: ["ArrowDown", "KeyS"] },
    { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
    { name: "rightward", keys: ["ArrowRight", "KeyD"] },
    { name: "jump", keys: ["Space"] },
    { name: "run", keys: ["Shift"] },
    { name: "action1", keys: ["1"] },
    { name: "action2", keys: ["2"] },
    { name: "action3", keys: ["3"] },
    { name: "action4", keys: ["KeyF"] },
  ];

  return (
    <>
      <ambientLight />
      <pointLight position={[1, 2, 1]} intensity={3} />
      <Physics debug={true}>
        <KeyboardControls map={keyboardMap}>
          <CharacterControl>
            <CharacterModel />
          </CharacterControl>
        </KeyboardControls>
        <Floor />
      </Physics>
    </>
  );
}
