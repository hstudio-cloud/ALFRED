/**
 * NanoBackgroundAnimation.jsx
 * Background neural vivo - partículas conectadas, movimento contínuo
 * Paleta: Vermelho/Preto apenas
 */

import React, { useEffect, useRef } from 'react';

const NanoBackgroundAnimation = ({ 
  density = 0.5, 
  speed = 0.3, 
  blur = false,
  interactive = true,
  className = '',
}) => {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Número de partículas baseado em densidade
    const particleCount = Math.floor((canvas.width * canvas.height) / (2000 / density));

    // Classe de partícula
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;
        this.radius = Math.random() * 1.5 + 0.5;
        this.alpha = Math.random() * 0.5 + 0.3;
        this.originalAlpha = this.alpha;
        this.life = Math.random() * 100 + 50;
        this.maxLife = this.life;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around edges
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        // Pulsação de vida
        this.life--;
        if (this.life < 0) {
          this.life = this.maxLife;
        }

        // Alpha varia com vida
        this.alpha = this.originalAlpha * (this.life / this.maxLife);
      }

      draw(ctx) {
        // Partícula principal
        ctx.fillStyle = `rgba(239, 68, 68, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Glow menor
        ctx.fillStyle = `rgba(239, 68, 68, ${this.alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Inicializa partículas
    particlesRef.current = Array.from(
      { length: particleCount },
      () => new Particle()
    );

    // Mouse tracking para interatividade
    const handleMouseMove = (e) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    let animationTime = 0;

    // Loop de animação
    const animate = () => {
      // Clear com fade trail para efeito de movimento
      ctx.fillStyle = 'rgba(9, 2, 3, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationTime += 0.01;

      // Update e draw partículas
      particlesRef.current.forEach((particle) => {
        particle.update();
        particle.draw(ctx);
      });

      // Desenha linhas conectando partículas próximas
      const connectionDistance = 120;
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p1 = particlesRef.current[i];
          const p2 = particlesRef.current[j];

          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < connectionDistance) {
            const opacity = (1 - distance / connectionDistance) * 0.3;
            ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Efeito de mouse (se habilitado)
      if (interactive) {
        const mousePullDistance = 150;
        const pullStrength = 0.02;

        particlesRef.current.forEach((particle) => {
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < mousePullDistance) {
            const force = (1 - distance / mousePullDistance) * pullStrength;
            particle.vx += (dx / distance) * force;
            particle.vy += (dy / distance) * force;
          }
        });
      }

      // Efeito de movimento base (onda)
      const wave = Math.sin(animationTime) * 0.1;
      particlesRef.current.forEach((particle, idx) => {
        if (idx % 10 === 0) {
          particle.vy += wave * 0.01;
        }
      });

      // Glow central sutil (respira)
      const centralGlowSize = 300 + Math.sin(animationTime * 0.5) * 100;
      const centralGlowOpacity = 0.05 + Math.sin(animationTime * 0.3) * 0.02;

      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        centralGlowSize
      );

      gradient.addColorStop(0, `rgba(239, 68, 68, ${centralGlowOpacity})`);
      gradient.addColorStop(0.5, `rgba(239, 68, 68, ${centralGlowOpacity * 0.3})`);
      gradient.addColorStop(1, `rgba(239, 68, 68, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      frameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [density, speed, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className={className || "fixed inset-0 h-full w-full -z-10"}
      style={{
        background: 'linear-gradient(180deg, rgba(9, 2, 3, 0.9), rgba(20, 3, 4, 0.95))',
        filter: blur ? 'blur(0.5px)' : 'none',
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}
    />
  );
};

export default NanoBackgroundAnimation;
