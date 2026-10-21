import { useEffect, useState } from "react";

let webglSupport: boolean | undefined;
/** null = not yet tested (avoid a black canvas while we probe). */
export function useWebGL(): boolean | null {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (webglSupport !== undefined) {
      setOk(webglSupport);
      return;
    }
    try {
      const c = document.createElement("canvas");
      const gl =
        c.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) || c.getContext("webgl");
      webglSupport = Boolean(gl);
      setOk(webglSupport);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}
