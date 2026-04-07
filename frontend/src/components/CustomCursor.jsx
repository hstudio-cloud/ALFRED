import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CustomCursor = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const mouseCoords = useRef({ x: 0, y: 0 });
  const ringCoords = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef(null);

  const delayFactor = 0.2;

  useEffect(() => {
    const touchCapable =
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0);

    setIsTouchDevice(touchCapable);
    if (touchCapable) return undefined;

    const onMouseMove = (event) => {
      mouseCoords.current.x = event.clientX;
      mouseCoords.current.y = event.clientY;
    };

    const onMouseOver = (event) => {
      const target = event.target;
      if (
        target.matches(
          'a, button, [role="button"], input[type="submit"], input[type="image"], .cursor-pointer',
        ) ||
        target.closest('a, button, [role="button"], .cursor-pointer')
      ) {
        setIsHovered(true);
      }
    };

    const onMouseOut = () => setIsHovered(false);
    const onMouseEnterWindow = () => setIsVisible(true);
    const onMouseLeaveWindow = () => setIsVisible(false);
    const onMouseDown = () => setIsClicked(true);
    const onMouseUp = () => setIsClicked(false);

    const animateCursor = () => {
      ringCoords.current.x +=
        (mouseCoords.current.x - ringCoords.current.x) * delayFactor;
      ringCoords.current.y +=
        (mouseCoords.current.y - ringCoords.current.y) * delayFactor;

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

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("mouseenter", onMouseEnterWindow);
    document.addEventListener("mouseleave", onMouseLeaveWindow);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);

    animateCursor();

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("mouseenter", onMouseEnterWindow);
      document.removeEventListener("mouseleave", onMouseLeaveWindow);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  if (isTouchDevice) return null;

  return (
    <div
      className={cn(
        "fixed pointer-events-none z-[9999] transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0",
      )}
    >
      <div
        ref={dotRef}
        className={cn(
          "fixed -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background-color,width,height,transform,filter] duration-300",
          !isHovered && "h-1.5 w-1.5 bg-white",
          isHovered && "h-2 w-2 bg-red-700",
          isClicked && "scale-75 brightness-75",
        )}
      />

      <div
        ref={ringRef}
        className={cn(
          "fixed -translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,opacity,border-color,background-color,border-width,transform,filter] duration-300 ease-out",
          !isHovered &&
            "h-8 w-8 border border-gray-400 bg-transparent opacity-50",
          isHovered &&
            "h-12 w-12 border-2 border-red-700 bg-sky-500/10 opacity-100",
          isClicked && "scale-75 border-gray-600 bg-black/20",
        )}
      />
    </div>
  );
};

export default CustomCursor;
