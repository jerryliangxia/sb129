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

      idle: () => {
        set((state) => {
          if (state.curAnimation === state.animationSet.jumpIdle) {
            return { curAnimation: state.animationSet.jumpLand };
          } else if (
            state.curAnimation !== state.animationSet.action1 &&
            state.curAnimation !== state.animationSet.action2 &&
            state.curAnimation !== state.animationSet.action3 &&
            state.curAnimation !== state.animationSet.action4
          ) {
            return { curAnimation: state.animationSet.idle };
          }
          return {};
        });
      },

      walk: () => {
        set((state) => {
          if (state.curAnimation !== state.animationSet.action4) {
            return { curAnimation: state.animationSet.walk };
          }
          return {};
        });
      },

      run: () => {
        set((state) => {
          if (state.curAnimation !== state.animationSet.action4) {
            return { curAnimation: state.animationSet.run };
          }
          return {};
        });
      },

      jump: () => {
        set((state) => {
          return { curAnimation: state.animationSet.jump };
        });
      },

      jumpIdle: () => {
        set((state) => {
          if (state.curAnimation === state.animationSet.jump) {
            return { curAnimation: state.animationSet.jumpIdle };
          }
          return {};
        });
      },

      jumpLand: () => {
        set((state) => {
          if (state.curAnimation === state.animationSet.jumpIdle) {
            return { curAnimation: state.animationSet.jumpLand };
          }
          return {};
        });
      },

      fall: () => {
        set((state) => {
          return { curAnimation: state.animationSet.fall };
        });
      },
    };
  })
);
