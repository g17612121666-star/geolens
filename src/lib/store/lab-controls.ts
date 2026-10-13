import { create } from "zustand";
import type { LabLayout, PanelTab } from "@/lib/labs/types";

export type LabParams = Record<string, number>;

export type InspectChip = { name: string; note: string };

type LabControlsState = {
  playing: boolean;
  speed: number;
  t: number;
  explode: number;
  slice: number;
  labels: boolean;
  examLanguage: boolean;
  graticule: boolean;
  trueScale: boolean;
  inspect: InspectChip | null;
  step: number;
  panelTab: PanelTab;
  params: LabParams;
  layout: LabLayout;
  viewKey: number;
  liveText: string;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (n: number) => void;
  setT: (n: number) => void;
  setExplode: (n: number) => void;
  setSlice: (n: number) => void;
  setLabels: (v: boolean) => void;
  setExam: (v: boolean) => void;
  setGraticule: (v: boolean) => void;
  setTrueScale: (v: boolean) => void;
  setInspect: (v: InspectChip | null) => void;
  setStep: (n: number) => void;
  setPanelTab: (tab: PanelTab) => void;
  setParam: (key: string, value: number) => void;
  setLayout: (layout: LabLayout) => void;
  resetView: () => void;
  setLiveText: (t: string) => void;
  tick: (dt: number, rate: number) => void;
  reset: (defaults?: LabParams) => void;
  hydrate: (defaults: LabParams) => void;
};

export const useLabControls = create<LabControlsState>((set, get) => ({
  playing: false,
  speed: 1,
  t: 0.4,
  explode: 0,
  slice: 0,
  labels: true,
  examLanguage: false,
  graticule: false,
  trueScale: false,
  inspect: null,
  step: 0,
  panelTab: "why",
  params: {},
  layout: "hud",
  viewKey: 0,
  liveText: "",
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  toggle: () => set({ playing: !get().playing }),
  setSpeed: (speed) => set({ speed: Number.isFinite(speed)?Math.max(.25,Math.min(4,speed)):1 }),
  setT: (t) => set({ playing: false, t: Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0 }),
  setExplode: (explode) => set({ explode: Math.min(1, Math.max(0, explode)) }),
  setSlice: (slice) => set({ slice: Math.min(1, Math.max(0, slice)) }),
  setLabels: (labels) => set({ labels }),
  setExam: (examLanguage) => set({ examLanguage }),
  setGraticule: (graticule) => set({ graticule }),
  setTrueScale: (trueScale) => set({ trueScale }),
  setInspect: (inspect) => set({ inspect }),
  setStep: (step) => set({ step: Math.max(0,Math.min(3,Math.floor(step))) }),
  setPanelTab: (panelTab) => set({ panelTab }),
  setParam: (key, value) => {
    if(!Number.isFinite(value))return;
    const params={...get().params,[key]:value};
    if((key==='sand'||key==='clay')&&'sand' in params&&'clay' in params){const other=key==='sand'?'clay':'sand';params[key]=Math.max(0,Math.min(100,value));params[other]=Math.min(params[other],100-params[key]);}
    set({params});
  },
  setLayout: (layout) => set({ layout }),
  resetView: () => set({ viewKey: get().viewKey + 1 }),
  setLiveText: (liveText) => set({ liveText }),
  tick: (dt, rate) => {
    const { playing, speed, t } = get();
    if (!playing) return;
    const next = t + Math.min(dt, 0.1) * speed * rate;
    set({ t: next - Math.floor(next) });
  },
  reset: (defaults) =>
    set({
      playing: false,
      speed: 1,
      t: 0.4,
      explode: 0,
      slice: 0,
      labels: true,
      graticule: false,
      trueScale: false,
      inspect: null,
      step: 0,
      panelTab: "why",
      params: defaults ?? get().params,
      viewKey: get().viewKey + 1,
    }),
  hydrate: (defaults) =>
    set({
      playing: false,
      speed: 1,
      t: 0.4,
      explode: 0,
      slice: 0,
      labels: true,
      examLanguage: false,
      graticule: false,
      trueScale: false,
      inspect: null,
      step: 0,
      panelTab: "why",
      params: defaults,
      layout: get().layout,
      viewKey: get().viewKey,
    }),
}));
