import { useState, useEffect } from "react";

export default function FunnyLoader() {
  const phrases = [
    "Hold on, let me cook...",
    "Just wait mf, I'm working...",
    "fk IITM , muthal",
    "Fee toh bharde exam toh hota rahega",
  ];

  const [text, setText] = useState(phrases[0]);

  useEffect(() => {
    // Cycles to a random funny phrase every 2.5 seconds
    const interval = setInterval(() => {
      setText(phrases[Math.floor(Math.random() * phrases.length)]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      {/* Animated SVG (React Logo cooking in a pan) */}
      <div className="relative w-40 h-40 mb-2">
        <svg
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full overflow-visible"
        >
          <style>
            {`
              @keyframes flicker {
                0%, 100% { transform: scaleY(1); opacity: 0.9; }
                50% { transform: scaleY(1.2); opacity: 0.7; }
              }
              @keyframes toss {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                50% { transform: translateY(-40px) rotate(180deg); }
              }
              @keyframes pan-shake {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-3deg); }
                75% { transform: rotate(3deg); }
              }
              .fire-1 { animation: flicker 0.6s infinite ease-in-out; transform-origin: bottom; fill: #ff5722; }
              .fire-2 { animation: flicker 0.8s infinite ease-in-out reverse; transform-origin: bottom; fill: #ff9800; }
              .food { animation: toss 1.5s infinite ease-in-out; transform-origin: center; }
              .pan-group { animation: pan-shake 1.5s infinite ease-in-out; transform-origin: center; }
            `}
          </style>

          {/* Flames */}
          <g transform="translate(0, 15)">
            <path
              className="fire-1"
              d="M80,160 Q70,130 90,120 Q110,140 100,160 Z"
            />
            <path
              className="fire-2"
              d="M100,160 Q90,140 110,130 Q130,150 120,160 Z"
            />
            <path
              className="fire-1"
              d="M60,160 Q50,140 70,130 Q90,150 80,160 Z"
            />
          </g>

          {/* Pan */}
          <g className="pan-group">
            <path d="M 40 130 L 140 130 L 160 100 L 20 100 Z" fill="#2d3748" />
            <path
              d="M 155 110 L 205 90"
              stroke="#1a202c"
              strokeWidth="12"
              strokeLinecap="round"
            />

            {/* React Logo (The Food) */}
            <g className="food" transform="translate(90, 85) scale(0.6)">
              <circle cx="0" cy="0" r="10" fill="#61DAFB" />
              <ellipse
                cx="0"
                cy="0"
                rx="25"
                ry="10"
                fill="none"
                stroke="#61DAFB"
                strokeWidth="4"
                transform="rotate(30)"
              />
              <ellipse
                cx="0"
                cy="0"
                rx="25"
                ry="10"
                fill="none"
                stroke="#61DAFB"
                strokeWidth="4"
                transform="rotate(90)"
              />
              <ellipse
                cx="0"
                cy="0"
                rx="25"
                ry="10"
                fill="none"
                stroke="#61DAFB"
                strokeWidth="4"
                transform="rotate(150)"
              />
            </g>
          </g>
        </svg>
      </div>

      <p className="text-white/90 font-roboto text-lg font-bold animate-pulse tracking-wide">
        {text}
      </p>
    </div>
  );
}
