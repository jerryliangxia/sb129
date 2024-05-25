import "./style.css";
import { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import Experience from "./Experience";
import { OrbitControls } from "@react-three/drei";

const root = ReactDOM.createRoot(document.querySelector("#root"));

root.render(
  <Canvas
    style={{ position: "fixed" }}
    shadows
    camera={{
      fov: 65,
      near: 0.1,
      far: 1000,
    }}
    onPointerDown={(e) => {
      if (e.pointerType === "mouse") {
        e.preventDefault();
        e.stopPropagation();
        e.target.requestPointerLock();
      }
    }}
  >
    <Suspense fallback={null}>
      <Experience />
    </Suspense>
  </Canvas>
);
