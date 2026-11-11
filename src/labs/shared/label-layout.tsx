import { useEffect, useMemo, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { LabelLayoutContext, LabelStore } from "./label-store";

/** Runs the collision pass every rendered frame for the labels of one canvas. */
export function LabelLayout({ children }: { children: ReactNode }) {
  const invalidate = useThree((s) => s.invalidate);
  const store = useMemo(() => new LabelStore(invalidate), [invalidate]);
  useEffect(() => () => store.dispose(), [store]);
  useFrame(({ camera, size }) => store.update(camera, size.width, size.height));
  return <LabelLayoutContext.Provider value={store}>{children}</LabelLayoutContext.Provider>;
}
