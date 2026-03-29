// src/components/CustomCursor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils'; // Função cn do shadcn/ui para classes condicionais

const CustomCursor = () => {
  // 1. Estados React apenas para lógica de UI (Hover e Visibilidade)
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // 2. Refs para acesso direto aos elementos do DOM (Performance)
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  // 3. Refs para armazenar coordenadas sem causar re-renderização
  // Coordenadas Alvo (onde o mouse real está instantaneamente)
  const mouseCoords = useRef({ x: 0, y: 0 }); 
  // Coordenadas do Ring (que serão calculadas com atraso)
  const ringCoords = useRef({ x: 0, y: 0 }); 
  // ID do loop de animação para limpeza
  const animationFrameId = useRef(null); 

  // 4. CONFIGURAÇÃO DO ATRASO (Fator LERP)
  // Valor entre 0.01 e 0.99. 
  // Menor valor = Mais atraso (parece mais pesado/lento).
  // Maior valor = Menos atraso (persegue mais de perto).
  const delayFactor = 0.20; 

  useEffect(() => {
    // A. Ouvinte de movimento do mouse: Atualiza apenas as coordenadas ALVO instantâneas
    const onMouseMove = (e) => {
      mouseCoords.current.x = e.clientX;
      mouseCoords.current.y = e.clientY;
    };

    // B. Lógica de Hover e Janela (igual ao anterior)
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

    // =========================================================
    // C. O LOOP DE ANIMAÇÃO (O SEGREDO DO ATRASO)
    // =========================================================
    const animateCursor = () => {
      // 1. Cálculo da Interpolação Linear (LERP) para o movimento do Ring
      // ringCoords (posição atual) persegue mouseCoords (alvo) baseado no delayFactor
      ringCoords.current.x += (mouseCoords.current.x - ringCoords.current.x) * delayFactor;
      ringCoords.current.y += (mouseCoords.current.y - ringCoords.current.y) * delayFactor;

      // 2. Manipulação Direta do DOM para o Ponto Central (Dot)
      // Ele snap(gruda) instantaneamente na coordenada do mouse real
      if (dotRef.current) {
        dotRef.current.style.left = `${mouseCoords.current.x}px`;
        dotRef.current.style.top = `${mouseCoords.current.y}px`;
      }

      // 3. Manipulação Direta do DOM para o Círculo Externo (Ring)
      // Ele segue a coordenada calculada com atraso
      if (ringRef.current) {
        ringRef.current.style.left = `${ringCoords.current.x}px`;
        ringRef.current.style.top = `${ringCoords.current.y}px`;
      }

      // 4. Solicita o próximo quadro de animação (cria o loop recursivo)
      animationFrameId.current = requestAnimationFrame(animateCursor);
    };
    // =========================================================

    // Adiciona os ouvintes de evento
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    document.addEventListener('mouseenter', onMouseEnterWindow);
    document.addEventListener('mouseleave', onMouseLeaveWindow);

    // Inicia o loop de animação
    animateCursor();

    // Limpa os ouvintes e o loop na desmontagem do componente
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      document.removeEventListener('mouseenter', onMouseEnterWindow);
      document.removeEventListener('mouseleave', onMouseLeaveWindow);
      // Cancela o loop de animação para evitar vazamento de memória
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Controlamos a visibilidade via CSS (opacity) para manter os refs do DOM válidos
// Controlamos a visibilidade via CSS (opacity) para manter os refs do DOM válidos
  return (
    <div className={cn(
      "fixed pointer-events-none z-[9999] transition-opacity duration-300",
      isVisible ? "opacity-100" : "opacity-0"
    )}>
      {/* 1. O Ponto Central (Dot) */}
      <div
        ref={dotRef}
        className={cn(
          "fixed -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-colors duration-300",
          // Se estiver sobre algo clicável fica azul, senão fica branco
          !isHovered && "bg-white", 
          isHovered && "bg-sky-500 w-2 h-2" 
        )}
      />

      {/* 2. O Círculo Externo (Ring) */}
      <div
        ref={ringRef}
        className={cn(
          // Adicionamos border-color e background-color nas propriedades de transição suave
          "fixed -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,opacity,border-color,background-color,border-width] duration-300 ease-out",
          
          // Estilo Padrão: Borda cinza clara, sem fundo, tamanho normal
          !isHovered && "w-8 h-8 opacity-50 border border-gray-400 bg-transparent",
          
          // Estilo Hover: Borda azul mais grossa, fundo azul translúcido, tamanho maior
          isHovered && "w-12 h-12 opacity-100 border-2 border-sky-500 bg-sky-500/10"
        )}
      />
    </div>
  );
};

export default CustomCursor;