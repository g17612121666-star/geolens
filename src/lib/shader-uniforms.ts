import type * as THREE from "three";

type Uniforms = Record<string, THREE.IUniform>;
const binders = new WeakMap<Uniforms, (material: THREE.ShaderMaterial | null) => void>();

/**
 * Ref for a `<shaderMaterial>` whose uniform values change after it mounts. React Three Fiber
 * copies the `uniforms` prop into the material's own uniform objects when it mounts, so numbers
 * written later to the object you passed (during render or in a frame callback) never reach the
 * shader. This ref makes the material read that object itself:
 *
 *   <shaderMaterial ref={liveUniforms(uniforms)} uniforms={uniforms} … />
 *
 * The returned ref is stable for a given uniforms object.
 */
export function liveUniforms(uniforms: Uniforms) {
  let bind = binders.get(uniforms);
  if (!bind) {
    bind = (material) => {
      if (material && material.uniforms !== uniforms) {
        material.uniforms = uniforms;
        // The renderer caches a material's uniforms with its program; look them up again.
        material.needsUpdate = true;
      }
    };
    binders.set(uniforms, bind);
  }
  return bind;
}
