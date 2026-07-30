import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useGameStore } from '../../store/useGameStore'

/**
 * Post-processing stack.
 *
 * Two passes, both chosen for visible-change-per-millisecond:
 *  - N8AO grounds every object. Without contact darkening, low-poly props read
 *    as stickers floating on the grass no matter how good the materials are.
 *  - Bloom is what makes the house beacons glow instead of just being brightly
 *    coloured cylinders.
 *
 * Tone mapping has to be a pass here, not just `gl.toneMapping`: three compiles
 * the tone-mapping chunk out whenever it renders into a render target, and the
 * composer renders into one. Leaving it on the renderer alone silently drops
 * ACES and the whole island comes back blown out. It goes last so bloom still
 * happens in HDR, where it belongs.
 *
 * Deliberately absent: a vignette pass — there's already a CSS one over the
 * canvas, see App.
 *
 * On phones the AO pass goes, MSAA goes with it, and bloom stays — that's the
 * 30fps floor from the brief, and AO is by far the most expensive thing here.
 */
export function PostFx() {
  const isMobile = useGameStore((s) => s.isMobile)

  // MSAA and N8AO cannot coexist: resolving a multisampled buffer blits the
  // depth attachment into the same image the AO pass is sampling, and WebGL
  // spams `glBlitFramebuffer: Read and write depth stencil attachments cannot
  // be the same image`. So desktop gets AO plus SMAA, and phones — which skip
  // AO anyway — keep plain MSAA, which is the cheaper AA there.
  return (
    <EffectComposer multisampling={isMobile ? 4 : 0} enableNormalPass={false}>
      {isMobile ? (
        <></>
      ) : (
        <N8AO
          // Radius in world units: roughly the width of a doorway, so the AO
          // darkens corners and prop bases without hazing whole walls.
          aoRadius={1.8}
          distanceFalloff={1.2}
          intensity={2.4}
          halfRes
          quality="low"
        />
      )}
      <Bloom
        mipmapBlur
        // The beacons and the sun are the only things meant to bloom; the
        // bright grass sits just under this threshold.
        luminanceThreshold={0.82}
        luminanceSmoothing={0.28}
        intensity={0.55}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {isMobile ? <></> : <SMAA />}
    </EffectComposer>
  )
}
