import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { AdaptiveDpr, PerformanceMonitor, Preload } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'

import { Island } from './components/experience/Island'
import { Character } from './components/experience/Character'
import { CameraRig } from './components/experience/CameraRig'
import { Lighting } from './components/experience/Lighting'
import { ProximitySystem } from './hooks/useProximity'

import { LoadingScreen } from './components/ui/LoadingScreen'
import { Hud } from './components/ui/Hud'
import { InteractionPrompt } from './components/ui/InteractionPrompt'
import { SectionModal } from './components/ui/SectionModal'
import { MobileControls } from './components/ui/MobileControls'
import { DropOverlay } from './components/ui/DropOverlay'

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
      </Physics>
      <ProximitySystem />
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
  const paused = useGameStore((s) => s.activeHouse !== null)

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
        camera={{ fov: 55, near: 0.1, far: 900, position: [10, 12, 22] }}
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
      <SectionModal />
      <LoadingScreen />
    </div>
  )
}
