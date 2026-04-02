import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils'; 

const CustomCursor = () => {
  // 1. Estados React para lógica de UI
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicked, setIsClicked] = useState(false); // Novo estado para o clique

  // 2. Refs para acesso direto aos elementos do DOM
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  // 3. Refs para armazenar coordenadas
  const mouseCoords = useRef({ x: 0, y: 0 }); 
  const ringCoords = useRef({ x: 0, y: 0 }); 
  const animationFrameId = useRef(null); 

  // 4. CONFIGURAÇÃO DO ATRASO
  const delayFactor = 0.20; 

  useEffect(() => {
    // Atualiza coordenadas instantâneas
    const onMouseMove = (e) => {
      mouseCoords.current.x = e.clientX;
      mouseCoords.current.y = e.clientY;
    };

    // Lógica de Hover, Janela e Clique
    const onMouseOver = (e) => {
      const target = e.target;
      if (
        target.matches('a, button, [role="button"], input[type="submit"], input[type="image"], .cursor-pointer') ||
        target.closest('a, button, [role="button"], .cursor-pointer')
      ) {
        setIsHovered(true);
      }
    };
    const onMouseOut = () => setIsHovered(false);
    const onMouseEnterWindow = () => setIsVisible(true);
    const onMouseLeaveWindow = () => setIsVisible(false);
    
    // Novos ouvintes de clique
    const onMouseDown = () => setIsClicked(true);
    const onMouseUp = () => setIsClicked(false);

    // Loop de Animação da Física (Mantido intacto)
    const animateCursor = () => {
      ringCoords.current.x += (mouseCoords.current.x - ringCoords.current.x) * delayFactor;
      ringCoords.current.y += (mouseCoords.current.y - ringCoords.current.y) * delayFactor;

      if (dotRef.current) {
        dotRef.current.style.left = `${mouseCoords.current.x}px`;
        dotRef.current.style.top = `${mouseCoords.current.y}px`;
      }

      if (ringRef.current) {
        ringRef.current.style.left = `${ringCoords.current.x}px`;
        ringRef.current.style.top = `${ringCoords.current.y}px`;
      }

      animationFrameId.current = requestAnimationFrame(animateCursor);
    };

    // Adiciona os ouvintes
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    document.addEventListener('mouseenter', onMouseEnterWindow);
    document.addEventListener('mouseleave', onMouseLeaveWindow);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);

    animateCursor();

    // Limpeza
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      document.removeEventListener('mouseenter', onMouseEnterWindow);
      document.removeEventListener('mouseleave', onMouseLeaveWindow);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <div className={cn(
      "fixed pointer-events-none z-[9999] transition-opacity duration-200",
      isVisible ? "opacity-100" : "opacity-0"
    )}>
      {/* 1. O Ponto Central (Dot) */}
      <div
        ref={dotRef}
        className={cn(
          // CORREÇÃO: Usamos transições específicas em vez de 'transition-all'
          // Assim o CSS não interfere no 'left' e 'top' controlados pelo JS
          "fixed -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background-color,transform,filter] duration-200",
          !isHovered && "bg-white w-1.5 h-1.5", 
          isHovered && "bg-sky-500 w-2 h-2",
          // Efeito de clique
          isClicked && "scale-75 brightness-75" 
        )}
      />

      {/* 2. O Círculo Externo (Ring) */}
      <div
        ref={ringRef}
        className={cn(
          // CORREÇÃO: Adicionamos 'transform' e 'filter' à lista restrita de transições
          "fixed -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,opacity,border-color,background-color,border-width,transform,filter] duration-200 ease-out",
          
          !isHovered && "w-8 h-8 opacity-50 border border-gray-400 bg-transparent",
          isHovered && "w-12 h-12 opacity-100 border-2 border-sky-500 bg-sky-500/10",
          
          // Efeito de clique
          isClicked && "scale-75 border-gray-600 bg-black/20"
        )}
      />
    </div>
  );
};

export default CustomCursor;