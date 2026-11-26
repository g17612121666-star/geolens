/** The element that describes a lab's model in words, for screen readers (see the lab player). */
export const MODEL_DESCRIPTION_ID = "lab-model-description";

/** The keys a lab's 3D view answers to while it has focus (see keyboard-orbit.tsx). */
export const ORBIT_KEYS = [
  { key: "← → ↑ ↓", does: "Turn and tilt the model" },
  { key: "+ −", does: "Zoom in or out" },
  { key: "0", does: "Reset the view" },
];
