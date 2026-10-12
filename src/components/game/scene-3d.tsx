"use client";
import { useEffect, useRef, useState } from "react";
import { GAME_PALETTE } from "@/lib/theme/palette";
import { Orbit, Trophy } from "lucide-react";
import { useExperience } from "@/components/game/experience";

// Three.js is imported only for an on-screen scene, never in the question UI bundle.
export function Scene3D({ variant = "planet" }: { variant?: "planet" | "trophy" }) {
  const host = useRef<HTMLDivElement>(null);
  const { mode, visible } = useExperience();
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: "60px" });
    observer.observe(element); return () => observer.disconnect();
  }, []);
  const enabled = mode !== "reduced" && visible && inView && !failed;
  useEffect(() => {
    const element = host.current;
    if (!element || !enabled) return;
    let cancelled = false;
    let cleanup = () => {};
    import("three").then(THREE => {
      if (cancelled) return;
      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      const canvas = document.createElement("canvas");
      if (!canvas.getContext("webgl2")) { setFailed(true); return; }
      try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: mode === "full", powerPreference: "low-power" }); }
      catch { setFailed(true); return; }
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, .1, 30);
      camera.position.set(0, .6, 7);
      camera.lookAt(0, 0, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mode === "full" ? 1.5 : 1));
      renderer.setClearColor(0x000000, 0);
      canvas.setAttribute("aria-hidden", "true");
      element.appendChild(canvas);
      scene.add(new THREE.HemisphereLight(GAME_PALETTE.cream, GAME_PALETTE.ink, 2.5));
      const light = new THREE.DirectionalLight(0xffffff, 4); light.position.set(-3, 4, 5); scene.add(light);
      const rim = new THREE.DirectionalLight(GAME_PALETTE.wine, 3); rim.position.set(3, -1, -2); scene.add(rim);
      const group = new THREE.Group(); scene.add(group);
      const geometries: import("three").BufferGeometry[] = [];
      const materials: InstanceType<typeof THREE.Material>[] = [];
      const add = (geometry: import("three").BufferGeometry, color: number, position: [number, number, number], metalness = .3) => {
        const material = new THREE.MeshStandardMaterial({ color, roughness: .36, metalness, flatShading: true });
        geometries.push(geometry); materials.push(material);
        const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); group.add(mesh); return mesh;
      };
      if (variant === "planet") {
        add(new THREE.IcosahedronGeometry(.95, 2), GAME_PALETTE.mist, [0, 0, 0]);
        const ring = add(new THREE.TorusGeometry(1.42, .045, 8, 64), GAME_PALETTE.wine, [0, 0, 0], .6);
        ring.rotation.x = 1.12; ring.rotation.y = -.3;
        add(new THREE.IcosahedronGeometry(.18, 0), GAME_PALETTE.gold, [1.8, .52, .3]);
        const orbit = add(new THREE.TorusGeometry(1.92, .012, 4, 72), GAME_PALETTE.blueInk, [0, 0, 0]); orbit.rotation.x = .9;
      } else {
        add(new THREE.CylinderGeometry(.67, .32, .75, 12, 1, true), GAME_PALETTE.gold, [0, .35, 0], .65);
        add(new THREE.CylinderGeometry(.31, .18, .16, 12), GAME_PALETTE.parchment, [0, -.1, 0], .65);
        add(new THREE.CylinderGeometry(.1, .14, .48, 12), GAME_PALETTE.gold, [0, -.4, 0], .65);
        add(new THREE.CylinderGeometry(.4, .48, .12, 12), GAME_PALETTE.gold, [0, -.7, 0], .65);
        add(new THREE.BoxGeometry(1.02, .2, .78), GAME_PALETTE.wine, [0, -.87, 0]);
        for (const side of [-1, 1]) {
          const handle = add(new THREE.TorusGeometry(.32, .055, 8, 20), GAME_PALETTE.gold, [side * .64, .25, 0], .65); handle.scale.x = .75;
        }
        group.rotation.x = .1;
      }
      const resize = () => {
        const width = element.clientWidth, height = element.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.render(scene, camera);
      };
      const observer = new ResizeObserver(resize); observer.observe(element); resize();
      let lastFrame = 0;
      const frameDuration = mode === "full" ? 1000 / 45 : 1000 / 24;
      renderer.setAnimationLoop((time: number) => {
        if (time - lastFrame < frameDuration) return;
        lastFrame = time;
        group.rotation.y = Math.sin(time / 7000) * (variant === "trophy" ? .55 : .2);
        group.position.y = Math.sin(time / 2300) * .065;
        renderer.render(scene, camera);
      });
      const onLost = (event: Event) => { event.preventDefault(); setFailed(true); };
      canvas.addEventListener("webglcontextlost", onLost);
      setReady(true);
      cleanup = () => {
        observer.disconnect(); canvas.removeEventListener("webglcontextlost", onLost); renderer.setAnimationLoop(null);
        geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
        renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
      };
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; cleanup(); };
  }, [enabled, mode, variant]);
  const Icon = variant === "trophy" ? Trophy : Orbit;
  return <div ref={host} className={`scene-3d scene-${variant}`} data-renderer={ready && enabled ? "webgl" : "fallback"} aria-hidden="true"><div className="scene-fallback"><Icon size={variant === "trophy" ? 100 : 128} strokeWidth={1} /></div></div>;
}
