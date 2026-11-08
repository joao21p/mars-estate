import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls, useTexture } from '@react-three/drei';
import { SRGBColorSpace, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import surface from '@/assets/mars-surface.jpg';
import type { Regiao } from '@/data/regioes';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface Props { regioes: Regiao[]; selected: string | null; onSelect: (id: string) => void; paused: boolean; zoom: number; active: boolean }
type SceneColors = { light: string; fill: string; marker: string; selected: string };

function coordinates(latitude: number, longitude: number) {
  const lat = latitude * Math.PI / 180;
  const lon = (longitude + 59) * Math.PI / 180;
  return new Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
}

function Planet({ regioes, selected, onSelect, paused, zoom, active, colors, reduced }: Props & { colors: SceneColors; reduced: boolean }) {
  const texture = useTexture(surface, (t) => { t.colorSpace = SRGBColorSpace; t.anisotropy = 4; });
  const controls = useRef<OrbitControlsType>(null);
  const target = useRef<Vector3 | null>(null);
  useEffect(() => {
    const r = regioes.find((region) => region.id === selected);
    target.current = r ? coordinates(r.latitude, r.longitude).multiplyScalar(zoom) : new Vector3(0, 0.3, zoom);
  }, [regioes, selected, zoom]);
  useFrame(({ camera }, delta) => {
    if (!target.current) return;
    if (reduced) camera.position.copy(target.current);
    else camera.position.lerp(target.current, 1 - Math.exp(-4 * Math.min(delta, .05)));
    controls.current?.update();
    if (camera.position.distanceTo(target.current) < .015) target.current = null;
  });
  return <>
    <ambientLight intensity={.5} />
    <directionalLight position={[-5, 4, 7]} intensity={2.5} color={colors.light} />
    <directionalLight position={[4, -2, -3]} intensity={.65} color={colors.fill} />
    <Environment resolution={64}>
      <Lightformer intensity={.5} position={[0, 5, 0]} scale={[8, 8, 1]} color={colors.light} />
      <Lightformer intensity={.3} position={[-5, 0, 0]} rotation-y={Math.PI / 2} scale={[8, 8, 1]} color={colors.fill} />
    </Environment>
    <mesh>
      <sphereGeometry args={[2, 64, 48]} />
      <meshStandardMaterial map={texture} bumpMap={texture} bumpScale={.035} roughness={.94} metalness={.04} />
    </mesh>
    {active && regioes.map((r) => <Html key={r.id} position={coordinates(r.latitude, r.longitude).multiplyScalar(2.06)} center occlude distanceFactor={5}>
      <Button variant="ghost" size="icon" className="planet-marker" aria-label={`Selecionar ${r.nome}`} title={r.nome} aria-pressed={selected === r.id} onClick={(e) => { e.stopPropagation(); onSelect(r.id); }} />
    </Html>)}
    <OrbitControls ref={controls} enablePan={false} minDistance={4.8} maxDistance={10} zoomSpeed={.5} rotateSpeed={.45} autoRotate={!paused && !reduced && !selected} autoRotateSpeed={.3} enableDamping dampingFactor={.08} onStart={() => { target.current = null; }} />
  </>;
}

export default function MarsGlobe(props: Props) {
  const reduced = useReducedMotion();
  const [colors, setColors] = useState<SceneColors | null>(null);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    setColors({ light: css.getPropertyValue('--scene-light').trim(), fill: css.getPropertyValue('--scene-fill').trim(), marker: css.getPropertyValue('--scene-marker').trim(), selected: css.getPropertyValue('--scene-selected').trim() });
  }, []);
  if (!colors) return null;
  return <Canvas dpr={[1, 1.5]} camera={{ position: [0, .3, 7.7], fov: 38 }} gl={{ antialias: true, alpha: true }} frameloop={reduced || !props.active ? 'demand' : 'always'} aria-label="Globo interativo de Marte">
    <Suspense fallback={null}><Planet {...props} colors={colors} reduced={reduced} /></Suspense>
  </Canvas>;
}