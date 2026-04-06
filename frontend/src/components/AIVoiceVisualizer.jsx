import React, { useEffect, useMemo, useRef } from "react";

const RED_PALETTE = [
  { r: 255, g: 26, b: 26 },
  { r: 200, g: 0, b: 0 },
  { r: 255, g: 80, b: 80 },
  { r: 150, g: 0, b: 0 },
  { r: 255, g: 140, b: 140 },
];

const MODE_TO_STATE = {
  idle: "idle",
  listening: "listening",
  processing: "thinking",
  speaking: "speaking",
};

const randomColor = () => RED_PALETTE[Math.floor(Math.random() * RED_PALETTE.length)];

const AIVoiceVisualizer = ({ mode = "idle", amplitude = 0.12 }) => {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const particlesRef = useRef([]);
  const stateRef = useRef(MODE_TO_STATE[mode] || "idle");
  const timeRef = useRef(0);

  const size = 320;
  const center = size / 2;

  const normalizedAmplitude = useMemo(() => Math.max(0.05, Math.min(amplitude || 0.12, 1)), [amplitude]);

  useEffect(() => {
    stateRef.current = MODE_TO_STATE[mode] || "idle";
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    canvas.width = size;
    canvas.height = size;

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = Math.random() * 30;

        this.x = center + radius * Math.sin(phi) * Math.cos(theta);
        this.y = center + radius * Math.sin(phi) * Math.sin(theta);
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.life = Math.random();
        this.lifeDecay = 0.003 + Math.random() * 0.004;
        this.size = 0.8 + Math.random() * 1.8;
        this.color = randomColor();
        this.angle = Math.random() * Math.PI * 2;
        this.angleVelocity = (Math.random() - 0.5) * 0.012;
        this.radius = 20 + Math.random() * 100;
        this.targetRadius = this.radius;
        this.phase = Math.random() * Math.PI * 2;
      }

      update(time, amp) {
        const state = stateRef.current;

        if (state === "idle") {
          this.angle += this.angleVelocity * 0.4;
          this.targetRadius = 40 + Math.sin(time * 0.5 + this.phase) * 15;
        } else if (state === "listening") {
          this.angle += this.angleVelocity * 1.2;
          this.targetRadius = 50 + Math.sin(time * 1.5 + this.phase) * 25 * amp;
        } else if (state === "speaking") {
          this.angle += this.angleVelocity * 2;
          this.targetRadius = 35 + amp * 80 * (0.5 + 0.5 * Math.sin(time * 3 + this.phase));
        } else {
          this.angle += this.angleVelocity * 0.7;
          this.targetRadius = 30 + Math.sin(time * 0.8 + this.phase) * 40;
        }

        this.radius += (this.targetRadius - this.radius) * 0.04;

        const nextX = Math.cos(this.angle) * this.radius;
        const nextY = Math.sin(this.angle) * this.radius * 0.6;

        this.x += (center + nextX - this.x) * 0.05 + this.vx;
        this.y += (center + nextY - this.y) * 0.05 + this.vy;

        this.vx *= 0.98;
        this.vy *= 0.98;

        this.life -= this.lifeDecay;
        if (this.life <= 0) this.reset();
      }

      draw(context) {
        const { r, g, b } = this.color;
        const alpha = this.life * 0.9;
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        context.fill();
      }
    }

    particlesRef.current = Array.from({ length: 200 }, () => new Particle());

    const getAmplitude = (time) => {
      const state = stateRef.current;
      const ext = normalizedAmplitude;

      if (state === "speaking") {
        const base = 0.5;
        const wave =
          Math.sin(time * 4.7) * 0.2 +
          Math.sin(time * 11.3) * 0.15 +
          Math.sin(time * 2.1) * 0.15;
        return Math.max(0.18, base + wave + ext * 0.35);
      }

      if (state === "listening") return 0.3 + Math.sin(time * 2) * 0.2 + ext * 0.2;
      if (state === "thinking") return 0.2 + Math.sin(time * 0.9) * 0.1 + ext * 0.1;
      return 0.15 + Math.sin(time * 0.4) * 0.05 + ext * 0.06;
    };

    const drawCore = (time, amp) => {
      const r1 = 14 + amp * 12;
      const r2 = 28 + amp * 30;
      const r3 = 60 + amp * 50;

      const g3 = ctx.createRadialGradient(center, center, r2, center, center, r3);
      g3.addColorStop(0, `rgba(200,0,0,${0.08 + amp * 0.05})`);
      g3.addColorStop(1, "rgba(200,0,0,0)");
      ctx.beginPath();
      ctx.arc(center, center, r3, 0, Math.PI * 2);
      ctx.fillStyle = g3;
      ctx.fill();

      const g1 = ctx.createRadialGradient(center, center, 0, center, center, r2);
      g1.addColorStop(0, `rgba(255,120,120,${0.25 + amp * 0.2})`);
      g1.addColorStop(0.4, `rgba(220,0,0,${0.15 + amp * 0.1})`);
      g1.addColorStop(1, "rgba(100,0,0,0)");
      ctx.beginPath();
      ctx.arc(center, center, r2, 0, Math.PI * 2);
      ctx.fillStyle = g1;
      ctx.fill();

      const g2 = ctx.createRadialGradient(center, center, 0, center, center, r1);
      g2.addColorStop(0, `rgba(255,200,200,${0.6 + amp * 0.3})`);
      g2.addColorStop(1, "rgba(255,26,26,0)");
      ctx.beginPath();
      ctx.arc(center, center, r1, 0, Math.PI * 2);
      ctx.fillStyle = g2;
      ctx.fill();
    };

    const render = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;
      const amp = getAmplitude(time);

      ctx.clearRect(0, 0, size, size);

      ctx.fillStyle = "rgba(5,0,0,0.12)";
      ctx.fillRect(0, 0, size, size);

      drawCore(time, amp);

      particlesRef.current.forEach((particle) => {
        particle.update(time, amp);
        particle.draw(ctx);
      });

      frameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [center, normalizedAmplitude, size]);

  return (
    <div className="relative flex h-[320px] w-[320px] items-center justify-center">
      <div className="absolute inset-0 rounded-[22px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_56%)]" />
      <canvas
        ref={canvasRef}
        className="h-full w-full opacity-[0.92]"
      />
    </div>
  );
};

export default AIVoiceVisualizer;
