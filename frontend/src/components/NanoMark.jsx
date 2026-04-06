import React from "react";

const NanoMark = ({ className = "h-10 w-10" }) => {
  return (
    <svg
      viewBox="0 0 140 140"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      <defs>
        <linearGradient id="nano-mark-main" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff5555" />
          <stop offset="50%" stopColor="#cc0000" />
          <stop offset="100%" stopColor="#7a0000" />
        </linearGradient>
        <linearGradient id="nano-mark-soft" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff3333" />
          <stop offset="100%" stopColor="#4a0000" />
        </linearGradient>
        <filter id="nano-mark-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M 28 112 L 28 36 C 28 24 36 18 46 18 C 52 18 57 21 60 26 L 86 72 L 86 46 C 86 30 94 18 108 18 C 118 18 124 26 124 36 L 124 112 C 124 120 118 126 110 126 C 102 126 96 120 94 112 L 68 66 L 68 94 C 68 108 60 126 46 126 C 36 126 28 120 28 112 Z"
        fill="#3a0000"
        transform="translate(2,3)"
        opacity="0.6"
      />

      <path
        d="M 28 112 L 28 36 C 28 24 36 18 46 18 C 52 18 57 21 60 26 L 86 72 L 86 46 C 86 30 94 18 108 18 C 118 18 124 26 124 36 L 124 112 C 124 120 118 126 110 126 C 102 126 96 120 94 112 L 68 66 L 68 94 C 68 108 60 126 46 126 C 36 126 28 120 28 112 Z"
        fill="url(#nano-mark-main)"
        filter="url(#nano-mark-glow)"
      />

      <path
        d="M 28 50 L 28 36 C 28 24 36 18 46 18 C 52 18 57 21 60 26 L 72 47 C 60 42 48 44 40 52 Z"
        fill="url(#nano-mark-soft)"
        opacity="0.55"
      />

      <path
        d="M 86 68 L 68 38 L 68 66 Z"
        fill="#ff6666"
        opacity="0.15"
      />

      <path
        d="M 90 20 C 96 18 104 18 110 20 L 124 36 C 118 28 108 20 98 20 Z"
        fill="#ff8888"
        opacity="0.2"
      />
    </svg>
  );
};

export default NanoMark;
