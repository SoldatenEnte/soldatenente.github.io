import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { Suspense, useMemo, useRef, useEffect, createRef } from "react";
import { EffectComposer, N8AO, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Water } from "./components/water";
import { Lights } from "./Lights.tsx";
import { PlayerShip } from "./components/PlayerShip.tsx";
import { IslandModel } from "./IslandModel.tsx";
import { PlayerCamera } from "./components/PlayerCamera.tsx";
import { Intro } from "./components/Intro.tsx";
import { Minimap } from "./components/Minimap.tsx";
import { useSceneControls } from "./hooks/useSceneControls.ts";
import { useShipControls } from "./hooks/useShipControls.ts";
import { useWaterControls } from "./hooks/useWaterControls.ts";
import soundManager from "./hooks/useSoundManager.ts";
import { useDucks } from "./hooks/useDucks.ts";
import { Duck } from "./components/Duck.tsx";
import { InteractionUI } from "./components/InteractionUI.tsx";
import { Map } from "./components/Map.tsx";
import { UIController } from "./components/UIController.tsx";
import { useGameState } from "./context/GameStateContext.tsx";
import { FADE_DURATION, ISLAND_INTERACTION_RADIUS } from "./config/constants.ts";
import { DialogueBox } from "./components/DialogueBox";
import { isMobile } from "./utils/isMobile.ts";
import { TouchControls } from "./components/TouchControls.tsx";
import { ActionButtons } from "./components/ActionButtons.tsx";
import { PROJECTS } from "./config/projects.ts";
import { asset } from "./utils/assetUrl.ts";

const onMobile = isMobile;

type GroundFogProps = { color: string; y: number };

function GroundFog({ color, y }: GroundFogProps) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={y} renderOrder={-1}>
      <planeGeometry args={[10000, 10000]} />
      <meshBasicMaterial color={color} depthWrite={false} />
    </mesh>
  );
}

type ExperienceProps = {
  shipRef: React.RefObject<THREE.Group | null>;
  islandRefs: React.RefObject<THREE.Group | null>[];
  uiRefs: {
    minimapRotatorRef: React.RefObject<HTMLDivElement | null>;
    minimapTranslatorRef: React.RefObject<HTMLDivElement | null>;
    mapPlayerIconRef: React.RefObject<HTMLDivElement | null>;
    mapImageContainerRef: React.RefObject<HTMLDivElement | null>;
  };
  isPhysicsPaused: boolean;
  isCameraPaused: boolean;
  areControlsEnabled: boolean;
};

function Experience({ shipRef, islandRefs, uiRefs, isPhysicsPaused, isCameraPaused, areControlsEnabled, gameMode }: ExperienceProps & { gameMode: string }) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { state, dispatch } = useGameState();

  const { waterLevel, fogEnabled, fogColor, fogNear, fogFar, aoEnabled, shadowBias, normalBias } = useSceneControls();
  const { shipDimensions, shipScale } = useShipControls();
  const { waterUniforms } = useWaterControls();
  const { ducks, collectDuck } = useDucks();

  const effects = useMemo(() => {
    const effectList = [<Vignette key="vignette" offset={0.4} darkness={0.4} />];
    if (aoEnabled && !onMobile) {
      effectList.push(<N8AO key="n8ao" aoRadius={10} intensity={5} screenSpaceRadius />);
    }
    return effectList;
  }, [aoEnabled]);

  useFrame(() => {
    if (!shipRef.current) return;

    let closestIslandId: string | null = null;
    let minDistance = ISLAND_INTERACTION_RADIUS;

    PROJECTS.forEach(project => {
      const distance = shipRef.current!.position.distanceTo(project.position);
      if (distance < minDistance) {
        minDistance = distance;
        closestIslandId = project.id;
      }
    });

    if (closestIslandId !== state.nearIslandId) {
      dispatch({ type: 'SET_NEAR_ISLAND', payload: closestIslandId });
    }
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isPhysicsPaused || event.key.toLowerCase() !== 'e' || !state.nearIslandId) return;
      dispatch({ type: 'ENTER_ISLAND', payload: state.nearIslandId });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, isPhysicsPaused, state.nearIslandId]);

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enabled={areControlsEnabled}
        enableRotate={!onMobile}
        enableZoom={true}
        minDistance={onMobile ? 30 : 20}
        maxDistance={onMobile ? 80 : 100}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2 - 0.1}
        enablePan={false}
      />
      <PlayerCamera shipRef={shipRef} controlsRef={controlsRef} waterLevel={waterLevel} islandRefs={islandRefs} isPaused={isCameraPaused} gameMode={gameMode} />
      {fogEnabled ? <fog attach="fog" args={[fogColor, fogNear, fogFar]} /> : null}
      <Suspense fallback={null}>
        <UIController shipRef={shipRef} {...uiRefs} />
        <Environment files={asset("sky.hdr")} background />
        <Lights shadowBias={shadowBias} normalBias={normalBias} />
        {fogEnabled ? <GroundFog color={fogColor} y={waterLevel - 0.1} /> : null}
        <PlayerShip ref={shipRef} waterUniforms={waterUniforms} waterLevel={waterLevel} shipDimensions={shipDimensions} shipScale={shipScale} updateSailingSound={soundManager.updateSailingSound} isPhysicsPaused={isPhysicsPaused} />
        {PROJECTS.map((project, index) => (
          <IslandModel
            key={project.id}
            ref={islandRefs[index]}
            modelUrl={project.modelUrl}
            position={project.position}
            rotation-y={project.rotationY}
            scale={project.scale}
          />
        ))}
        {ducks.map(duck => (<Duck key={duck.id} duckData={duck} shipRef={shipRef} waterUniforms={waterUniforms} waterLevel={waterLevel} onCollect={collectDuck} />))}
        <Water waterUniforms={waterUniforms} position-y={waterLevel} fogColor={fogColor} fogNear={fogFar} fogFar={fogFar} />
        <EffectComposer>{effects}</EffectComposer>
      </Suspense>
    </>
  );
}

const INTRO_DIALOGUE_PAGES = [
  "Welcome, Captain! This is a small world I built to explore the ocean and showcase some of my web projects.",
  "Use W-A-S-D or the Arrow Keys to steer your ship. Press 'M' to open and close the world map.",
  "Sail towards the islands on the horizon. When you get close, you can dock to view a project. Let's set sail!"
];

function LoadingController() {
  const { active } = useProgress();
  const { state, dispatch } = useGameState();

  useEffect(() => {
    if (state.isLoading && !active) {
      dispatch({ type: 'FINISH_LOADING' });
    }
  }, [active, state.isLoading, dispatch]);

  return null;
}

export default function App() {
  const { state, dispatch } = useGameState();
  const { gameMode, mapMode, projectRendered, isLoading, isLoaded } = state;

  const shipRef = useRef<THREE.Group>(null);
  const islandRefs = useMemo(() => Array.from({ length: PROJECTS.length }, () => createRef<THREE.Group | null>()), []);
  const minimapRotatorRef = useRef<HTMLDivElement>(null);
  const minimapTranslatorRef = useRef<HTMLDivElement>(null);
  const mapPlayerIconRef = useRef<HTMLDivElement>(null);
  const mapImageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    PROJECTS.forEach(project => useGLTF.preload(project.modelUrl));
  }, []);

  useEffect(() => {
    let timeoutId: number;
    if (gameMode === 'transitioning') {
      timeoutId = window.setTimeout(() => dispatch({ type: 'TRANSITION_COMPLETE' }), FADE_DURATION);
    }
    return () => clearTimeout(timeoutId);
  }, [gameMode, dispatch]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'm') {
        event.stopPropagation();
        dispatch({ type: 'TOGGLE_MAP' });
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [dispatch]);

  const showFullMap = gameMode === 'ocean' && mapMode === 'full';
  const showMinimap = gameMode === 'ocean' && mapMode === 'minimap';

  const isPhysicsPaused = gameMode !== 'ocean';
  const isCameraPaused = gameMode === 'island' || gameMode === 'transitioning';
  const areControlsEnabled = gameMode === 'ocean' && mapMode === 'minimap';

  const isCanvasVisible = isLoaded;
  const isCanvasHidden = gameMode === 'island' || (gameMode === 'transitioning' && projectRendered);
  const shouldRenderCanvas = isLoading || isLoaded;

  const uiRefs = { minimapRotatorRef, minimapTranslatorRef, mapPlayerIconRef, mapImageContainerRef };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {shouldRenderCanvas && (
        <div className={`game-ui-container ${isCanvasVisible ? 'visible' : ''} ${isCanvasHidden ? 'hidden' : ''}`}>
          <Canvas dpr={[1, 1.5]} shadows={{ type: THREE.PCFSoftShadowMap }} camera={{ fov: 50, near: 0.1, far: 2000, position: [0, 20, 50] }}>
            <Experience
              shipRef={shipRef}
              islandRefs={islandRefs}
              uiRefs={uiRefs}
              isPhysicsPaused={isPhysicsPaused}
              isCameraPaused={isCameraPaused}
              areControlsEnabled={areControlsEnabled}
              gameMode={gameMode}
            />
            <LoadingController />
          </Canvas>
          <Minimap show={showMinimap} rotatorRef={minimapRotatorRef} translatorRef={minimapTranslatorRef} />
        </div>
      )}

      <Intro />
      <InteractionUI />
      <Map show={showFullMap} playerIconRef={mapPlayerIconRef} imageContainerRef={mapImageContainerRef} />

      <TouchControls />
      <ActionButtons />

      <DialogueBox
        show={gameMode === 'dialogue'}
        pages={INTRO_DIALOGUE_PAGES}
        onComplete={() => dispatch({ type: 'DIALOGUE_COMPLETE' })}
      />
    </div>
  );
}