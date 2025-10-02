// src/components/PoolOrbitLoaderModal.jsx
import React, { useEffect, useId, useState } from "react";
import LoaderWrapper from "./LoaderWrapper/LoaderWrapper";


function PoolOrbitAnimation({
  size = 140,
  svgKey,              // optional: when this changes, <svg key> forces SMIL restart
  className,
  style,
  innerDur = "1.6s",
  outerDur = "2.2s",
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
        key={svgKey}             // restart animations every time this key changes
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

          {/* Soft mini shadow for orbiters (tighter bbox for perf) */}
          <filter
            id={ids.miniShadow}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow dx="0" dy="1" stdDeviation="1.1" floodOpacity=".35" />
          </filter>

          {/* Optional subtle highlight (kept for future) */}
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

        {/* ================= Inner ring: SOLIDS (1–7) ================= */}
        <g>
          <g>
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              begin="0s"
              dur={innerDur}
              repeatCount="indefinite"
              calcMode="linear"
              restart="always"
              values="0 80 80; 360 80 80"
            />
            {/* radius = 52; 360/7 ≈ 51.4286 */}
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

        {/* ================= Outer ring: STRIPES (9–15) ================= */}
        <g>
          <g>
            <animateTransform
              attributeName="transform"
              attributeType="XML"
              type="rotate"
              begin="0s"
              dur={outerDur}
              repeatCount="indefinite"
              calcMode="linear"
              restart="always"
              values="360 80 80; 0 80 80"
            />
            {/* radius = 68; half-step offset so rings interleave nicely */}
            <g transform="rotate(25.7143 80 80) translate(0 -68)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#f5f7fb" stroke="rgba(0,0,0,.12)" />
              <ellipse cx="80" cy="80" rx="9" ry="5" fill="#fbbf24" />
              <circle cx="80" cy="80" r="4.8" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8" fontWeight="700" fill="#000">9</text>
            </g>
            <g transform="rotate(77.1429 80 80) translate(0 -68)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#f5f7fb" stroke="rgba(0,0,0,.12)" />
              <ellipse cx="80" cy="80" rx="9" ry="5" fill="#3b82f6" />
              <circle cx="80" cy="80" r="4.8" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8" fontWeight="700" fill="#000">10</text>
            </g>
            <g transform="rotate(128.5715 80 80) translate(0 -68)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#f5f7fb" stroke="rgba(0,0,0,.12)" />
              <ellipse cx="80" cy="80" rx="9" ry="5" fill="#ef4444" />
              <circle cx="80" cy="80" r="4.8" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8" fontWeight="700" fill="#000">11</text>
            </g>
            <g transform="rotate(180 80 80) translate(0 -68)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#f5f7fb" stroke="rgba(0,0,0,.12)" />
              <ellipse cx="80" cy="80" rx="9" ry="5" fill="#8b5cf6" />
              <circle cx="80" cy="80" r="4.8" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8" fontWeight="700" fill="#000">12</text>
            </g>
            <g transform="rotate(231.4286 80 80) translate(0 -68)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#f5f7fb" stroke="rgba(0,0,0,.12)" />
              <ellipse cx="80" cy="80" rx="9" ry="5" fill="#f97316" />
              <circle cx="80" cy="80" r="4.8" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8" fontWeight="700" fill="#000">13</text>
            </g>
            <g transform="rotate(282.8572 80 80) translate(0 -68)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#f5f7fb" stroke="rgba(0,0,0,.12)" />
              <ellipse cx="80" cy="80" rx="9" ry="5" fill="#22c55e" />
              <circle cx="80" cy="80" r="4.8" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8" fontWeight="700" fill="#000">14</text>
            </g>
            <g transform="rotate(334.2858 80 80) translate(0 -68)" filter={`url(#${ids.miniShadow})`}>
              <circle cx="80" cy="80" r="9" fill="#f5f7fb" stroke="rgba(0,0,0,.12)" />
              <ellipse cx="80" cy="80" rx="9" ry="5" fill="#7f1d1d" />
              <circle cx="80" cy="80" r="4.8" fill="#fff" />
              <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                fontFamily="system-ui,Segoe UI,Arial" fontSize="8" fontWeight="700" fill="#000">15</text>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

export default function PoolOrbitLoader({
  open = true,
  message = "Loading…",
  size = 140,
  backdrop = "rgba(0,0,0,.45)",
  zIndex = 999,
  lockScroll = true,
  closable = false,
  onClose,
  onBackdropClick,
  className,
  closeButtonLabel = "X",
  innerDur = "1s",
  outerDur = "1.1s",
}) {
  const [svgKey, setSvgKey] = useState(0);

  useEffect(() => {
    if (open) setSvgKey((k) => k + 1);
  }, [open]);

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
      <PoolOrbitAnimation size={size} svgKey={svgKey} innerDur={innerDur} outerDur={outerDur} />
    </LoaderWrapper>
  );
}
