import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { AdaptiveDpr, PerformanceMonitor, Preload } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'

import { Island } from './components/experience/Island'
import { Character } from './components/experience/Character'
import { CameraRig } from './components/experience/CameraRig'
import { Lighting } from './components/experience/Lighting'
import { PostFx } from './components/experience/PostFx'
import { Weapon } from './components/experience/range/Weapon'
import { ProximitySystem } from './hooks/useProximity'

import { LoadingScreen } from './components/ui/LoadingScreen'
import { Hud } from './components/ui/Hud'
import { InteractionPrompt } from './components/ui/InteractionPrompt'
import { SectionModal } from './components/ui/SectionModal'
import { FullMap } from './components/ui/FullMap'
import { Crosshair } from './components/ui/Crosshair'
import { MobileControls } from './components/ui/MobileControls'
import { DropOverlay } from './components/ui/DropOverlay'
import { FallbackShell } from './components/ui/FallbackShell'
import { hasWebGL } from './lib/webgl'

import { useKeyboardControls } from './hooks/useKeyboardControls'
import { usePointerLook } from './hooks/usePointerLook'
import { useGameStore } from './store/useGameStore'

/** Touch-first device detection — decides joystick vs keyboard. */
function useDeviceDetect() {
  const setIsMobile = useGameStore((s) => s.setIsMobile)
  useEffect(() => {
    const check = () => {
      const coarse = window.matchMedia('(pointer: coarse)').matches
      const narrow = window.innerWidth < 900
      setIsMobile(coarse && narrow)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [setIsMobile])
}

function Scene() {
  return (
    <>
      <Lighting />
      {/* CameraRig lives inside <Physics> because its boom-collision ray is
          cast against the same world the character collides with. */}
      <Physics gravity={[0, -24, 0]} timeStep="vary">
        <Island />
        <Character />
        <CameraRig />
        {/* Inside Physics: its shot raycast uses the same world. */}
        <Weapon />
      </Physics>
      <ProximitySystem />
      {/* Last, so the composer's render pass sees the finished scene. */}
      <PostFx />
      <Preload all />
    </>
  )
}

export default function App() {
  useDeviceDetect()
  useKeyboardControls()
  usePointerLook()

  // While a panel is open the player is frozen and nothing in the scene needs
  // to move, so stop rendering entirely instead of spinning the GPU behind a
  // modal. The last frame stays on screen as the backdrop. Every useFrame in
  // the scene clamps its delta, so the jump on resume is harmless.
  const paused = useGameStore((s) => s.activeHouse !== null || s.mapOpen)

  // Probed once. Without WebGL the island can never start, so serve the same
  // content as a plain document rather than stranding the visitor on a
  // loading screen that will never finish.
  const [webgl] = useState(hasWebGL)
  const setReducedMode = useGameStore((s) => s.setReducedMode)
  useEffect(() => {
    setReducedMode(!webgl)
  }, [webgl, setReducedMode])

  if (!webgl) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-steel-900">
        <FallbackShell />
        <SectionModal />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-steel-900">
      <Canvas
        shadows
        frameloop={paused ? 'never' : 'always'}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.02,
        }}
        // far covers the 1300-unit ocean plane; the sky dome is exempt because
        // three's sky shader forces its depth to the far plane. near comes up
        // from 0.1 to claw back depth precision at that range — the boom never
        // gets closer than MIN_BOOM, so nothing clips.
        camera={{ fov: 55, near: 0.3, far: 1400, position: [10, 12, 22] }}
        // `?debug` hands the renderer to scripts/visual-check.mjs so it can
        // assert on draw calls and culling instead of eyeballing screenshots.
        // Opt-in by query string because `verify` runs the production build.
        onCreated={(s) => {
          if (new URLSearchParams(location.search).has('debug')) {
            ;(window as unknown as { __r3f?: unknown }).__r3f = s
          }
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
        {/* Drop resolution rather than frame rate when the GPU is struggling. */}
        <PerformanceMonitor />
        <AdaptiveDpr pixelated />
      </Canvas>

      {/* Subtle screen framing over the 3D view */}
      <div className="vignette pointer-events-none fixed inset-0 z-10 opacity-70" />

      <DropOverlay />
      <Hud />
      <InteractionPrompt />
      <MobileControls />
      <Crosshair />
      <FullMap />
      <SectionModal />
      <LoadingScreen />
    </div>
  )
}
