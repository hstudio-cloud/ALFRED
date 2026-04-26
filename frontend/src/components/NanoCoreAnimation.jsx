import React, { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

const STATE_MAP = {
  idle: {
    nodeCount: 52,
    radius: 116,
    drift: 0.18,
    pulse: 0.2,
    alpha: 0.34,
    lineDistance: 94,
  },
  thinking: {
    nodeCount: 84,
    radius: 156,
    drift: 0.38,
    pulse: 0.58,
    alpha: 0.76,
    lineDistance: 124,
  },
  executing: {
    nodeCount: 96,
    radius: 174,
    drift: 0.46,
    pulse: 0.72,
    alpha: 0.88,
    lineDistance: 136,
  },
  speaking: {
    nodeCount: 88,
    radius: 162,
    drift: 0.52,
    pulse: 0.94,
    alpha: 0.92,
    lineDistance: 132,
  },
};

const CORE_TRANSITIONS = {
  idle: { scale: 0.76, opacity: 0.34 },
  thinking: { scale: 1, opacity: 0.92 },
  executing: { scale: 1.08, opacity: 0.98 },
  speaking: { scale: 1.02, opacity: 1 },
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const buildParticles = (count, center) =>
  Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count;
    const offset = Math.random() * 0.9 + 0.2;
    return {
      angle,
      radiusOffset: offset,
      orbitSpeed: 0.0016 + Math.random() * 0.0035,
      orbitDrift: (Math.random() - 0.5) * 0.0009,
      seed: Math.random() * Math.PI * 2,
      x: center,
      y: center,
      size: 0.8 + Math.random() * 2.6,
      glow: 0.2 + Math.random() * 0.8,
    };
  });

const NanoCoreAnimation = ({
  nanoState = "idle",
  amplitude = 0.1,
  className = "",
  overlay = false,
}) => {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const particlesRef = useRef([]);
  const reducedMotion = useReducedMotion();

  const canvasSize = overlay ? 680 : 420;
  const center = canvasSize / 2;
  const normalizedAmplitude = clamp(amplitude || 0.1, 0.05, 1);
  const stateConfig = useMemo(
    () => STATE_MAP[nanoState] || STATE_MAP.idle,
    [nanoState],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d");
    if (!context) return undefined;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    particlesRef.current = buildParticles(stateConfig.nodeCount, center);

    return () => {
      particlesRef.current = [];
    };
  }, [canvasSize, center, stateConfig.nodeCount]);

  useEffect(() => {
    if (reducedMotion) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    if (!context) return undefined;

    let lastTime = performance.now();

    const drawGlow = (time, intensity) => {
      const outerRadius =
        stateConfig.radius + 62 + Math.sin(time * 0.0012) * 18 * intensity;
      const middleRadius =
        stateConfig.radius * 0.74 + 26 + Math.cos(time * 0.0018) * 12 * intensity;
      const innerRadius = 34 + intensity * 28;

      const outer = context.createRadialGradient(
        center,
        center,
        stateConfig.radius * 0.24,
        center,
        center,
        outerRadius,
      );
      outer.addColorStop(0, `rgba(255, 42, 42, ${0.16 + intensity * 0.12})`);
      outer.addColorStop(0.55, `rgba(255, 42, 42, ${0.08 + intensity * 0.08})`);
      outer.addColorStop(1, "rgba(255, 42, 42, 0)");
      context.fillStyle = outer;
      context.beginPath();
      context.arc(center, center, outerRadius, 0, Math.PI * 2);
      context.fill();

      const middle = context.createRadialGradient(
        center,
        center,
        0,
        center,
        center,
        middleRadius,
      );
      middle.addColorStop(0, `rgba(255, 164, 164, ${0.18 + intensity * 0.18})`);
      middle.addColorStop(1, "rgba(255, 42, 42, 0)");
      context.fillStyle = middle;
      context.beginPath();
      context.arc(center, center, middleRadius, 0, Math.PI * 2);
      context.fill();

      const inner = context.createRadialGradient(center, center, 0, center, center, innerRadius);
      inner.addColorStop(0, `rgba(255, 240, 240, ${0.8 + intensity * 0.12})`);
      inner.addColorStop(0.4, `rgba(255, 90, 90, ${0.42 + intensity * 0.14})`);
      inner.addColorStop(1, "rgba(255, 42, 42, 0)");
      context.fillStyle = inner;
      context.beginPath();
      context.arc(center, center, innerRadius, 0, Math.PI * 2);
      context.fill();
    };

    const render = (time) => {
      const delta = time - lastTime;
      lastTime = time;
      const intensity = clamp(
        stateConfig.pulse + normalizedAmplitude * (nanoState === "speaking" ? 0.52 : 0.28),
        0.18,
        1,
      );

      context.clearRect(0, 0, canvasSize, canvasSize);
      drawGlow(time, intensity);

      particlesRef.current.forEach((particle) => {
        particle.angle += particle.orbitSpeed * delta + particle.orbitDrift;
        const wave =
          Math.sin(time * 0.0014 + particle.seed) * 18 * intensity +
          Math.cos(time * 0.0009 + particle.seed) * 12;
        const voiceWave =
          nanoState === "speaking"
            ? Math.sin(time * 0.009 + particle.seed) * 26 * normalizedAmplitude
            : 0;
        const orbitalRadius =
          stateConfig.radius * particle.radiusOffset + wave + voiceWave;

        particle.x =
          center + Math.cos(particle.angle) * orbitalRadius;
        particle.y =
          center +
          Math.sin(particle.angle) * orbitalRadius * (0.64 + Math.sin(particle.seed) * 0.08);
      });

      for (let i = 0; i < particlesRef.current.length; i += 1) {
        const pointA = particlesRef.current[i];
        for (let j = i + 1; j < particlesRef.current.length; j += 1) {
          const pointB = particlesRef.current[j];
          const dx = pointA.x - pointB.x;
          const dy = pointA.y - pointB.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > stateConfig.lineDistance) continue;
          const opacity =
            (1 - distance / stateConfig.lineDistance) * (0.1 + stateConfig.alpha * 0.34);
          context.beginPath();
          context.moveTo(pointA.x, pointA.y);
          context.lineTo(pointB.x, pointB.y);
          context.strokeStyle = `rgba(255, 42, 42, ${opacity})`;
          context.lineWidth = 0.6 + opacity * 0.8;
          context.stroke();
        }
      }

      particlesRef.current.forEach((particle) => {
        const sizeBoost =
          nanoState === "speaking" ? normalizedAmplitude * 1.6 : intensity * 0.72;
        context.beginPath();
        context.arc(
          particle.x,
          particle.y,
          particle.size + sizeBoost * 0.7,
          0,
          Math.PI * 2,
        );
        context.fillStyle = `rgba(255, 66, 66, ${0.18 + particle.glow * 0.38})`;
        context.fill();

        context.beginPath();
        context.arc(
          particle.x,
          particle.y,
          Math.max(0.8, particle.size * 0.54),
          0,
          Math.PI * 2,
        );
        context.fillStyle = `rgba(255, 238, 238, ${0.44 + particle.glow * 0.34})`;
        context.fill();
      });

      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [
    canvasSize,
    center,
    nanoState,
    normalizedAmplitude,
    reducedMotion,
    stateConfig.alpha,
    stateConfig.lineDistance,
    stateConfig.pulse,
    stateConfig.radius,
  ]);

  return (
    <motion.div
      animate={CORE_TRANSITIONS[nanoState] || CORE_TRANSITIONS.idle}
      transition={{
        duration: reducedMotion ? 0 : 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={`relative flex items-center justify-center ${className}`}
    >
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,42,42,0.12),transparent_62%)] blur-3xl" />
      <canvas
        ref={canvasRef}
        className="relative z-10 max-w-full"
        aria-hidden="true"
      />
    </motion.div>
  );
};

export default NanoCoreAnimation;
