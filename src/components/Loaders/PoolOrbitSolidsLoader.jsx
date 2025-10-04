import React, { useEffect, useId } from "react";
import LoaderWrapper from "./LoaderWrapper/LoaderWrapper";


function PoolOrbitSolidsAnimation({
  size = 140,
  className,
  style,
}) {
  const rawId = useId();
  const uid = String(rawId).replace(/[^a-zA-Z0-9_-]/g, "");

  const ids = {
    grad: `g8-center-${uid}`,
    miniShadow: `miniShadow-${uid}`,
    gloss: `gloss-${uid}`,
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={className}
      style={{ width: size, height: size, ...style }}
    >
      <svg
        viewBox="0 0 160 160"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <defs>
          {/* Central 8-ball shading */}
          <radialGradient id={ids.grad} cx="35%" cy="35%">
            <stop offset="0%" stopColor="#333" />
            <stop offset="60%" stopColor="#0a0a0c" />
            <stop offset="100%" stopColor="#070709" />
          </radialGradient>

          {/* Soft mini shadow for orbiters */}
          <filter id={ids.miniShadow} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.1" floodOpacity=".35" />
          </filter>

          {/* Optional subtle highlight (unused now, kept for future) */}
          <filter id={ids.gloss} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Central 8-ball */}
        <g transform="translate(80,80)">
          <circle r="28" fill={`url(#${ids.grad})`} stroke="rgba(255,255,255,.12)" />
          <circle r="11" fill="#fff" />
          <text
            y="4"
            textAnchor="middle"
            fontFamily="system-ui,Segoe UI,Arial"
            fontSize="14"
            fontWeight="700"
            fill="#000"
          >
            8
          </text>
        </g>

        {/* Inner ring: SOLIDS (1–7), radius=52 */}
        <g>
          <g>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 80 80"
              to="360 80 80"
              dur="2.6s"
              repeatCount="indefinite"
            />
            {/* 7 positions around the circle */}
            <g transform="rotate(0 80 80) translate(0 -52)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#fbbf24" />
              <circle cx="80" cy="80" r="5.4" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8.5" fontWeight="700" fill="#000">1</text>
            </g>

            <g transform="rotate(51.4286 80 80) translate(0 -52)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#3b82f6" />
              <circle cx="80" cy="80" r="5.4" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8.5" fontWeight="700" fill="#000">2</text>
            </g>

            <g transform="rotate(102.8572 80 80) translate(0 -52)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#ef4444" />
              <circle cx="80" cy="80" r="5.4" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8.5" fontWeight="700" fill="#000">3</text>
            </g>

            <g transform="rotate(154.2858 80 80) translate(0 -52)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#8b5cf6" />
              <circle cx="80" cy="80" r="5.4" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8.5" fontWeight="700" fill="#000">4</text>
            </g>

            <g transform="rotate(205.7144 80 80) translate(0 -52)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#f97316" />
              <circle cx="80" cy="80" r="5.4" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8.5" fontWeight="700" fill="#000">5</text>
            </g>

            <g transform="rotate(257.143 80 80) translate(0 -52)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#22c55e" />
              <circle cx="80" cy="80" r="5.4" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8.5" fontWeight="700" fill="#000">6</text>
            </g>

            <g transform="rotate(308.5716 80 80) translate(0 -52)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#7f1d1d" />
              <circle cx="80" cy="80" r="5.4" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8.5" fontWeight="700" fill="#000">7</text>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

export default function PoolOrbitSolidsLoader({
  open = true,
  message = "Loading…",
  size = 140,
  backdrop = "rgba(0,0,0,.45)",
  zIndex = 9999,
  lockScroll = true,
  closable = false,
  onClose,
  onBackdropClick,
  className,
  closeButtonLabel = "X",
}) {
  return (
    <LoaderWrapper
      open={open}
      message={message}
      backdrop={backdrop}
      zIndex={zIndex}
      lockScroll={lockScroll}
      closable={closable}
      onClose={onClose}
      onBackdropClick={onBackdropClick}
      className={className}
      closeButtonLabel={closeButtonLabel}
    >
      {/* Pass size directly because your current wrapper doesn't clone size */}
      <PoolOrbitSolidsAnimation size={size} />
    </LoaderWrapper>
  );
}