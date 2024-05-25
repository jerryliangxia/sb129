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

      curHealth: 10,
      setCurHealth: (health) => {
        set((state) => {
          return { ...state, curHealth: health };
        });
      },

      // Character Animations
      curAnimation: null,
      setCurAnimation: (animation) => {
        set(() => ({ curAnimation: animation }));
      },

      animationSet: {},
      initializeAnimationSet: (animationSet) => {
        set((state) => {
          if (Object.keys(state.animationSet).length === 0) {
            return { animationSet };
          }
          return { animationSet: animationSet };
        });
      },

      reset: () => {
        set((state) => {
          return { curAnimation: state.animationSet.idle };
        });
      },
    };
  })
);
