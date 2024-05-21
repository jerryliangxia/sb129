import * as THREE from "three";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export const useGame = create(
  subscribeWithSelector((set, get) => {
    return {
      // Canvas
      overlayVisible: true,
      setOverlayVisible: (visible) => {
        set(() => ({ overlayVisible: visible }));
      },
    };
  })
);
