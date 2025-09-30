import React, { useEffect, useId } from "react";

/**
 * PoolOrbitLoaderModal
 * - Fullscreen overlay (modal) with dim backdrop
 * - Absolute-positioned loader, "Loading…" text beneath
 * - Pure SVG animation (no JS timers), unique <defs> IDs via useId
 *
 * Props:
 *  - open?: boolean (default: true)
 *  - message?: string (default: "Loading…")
 *  - size?: number (px width/height of the SVG, default: 140)
 *  - backdrop?: string (CSS color, default: "rgba(0,0,0,.45)")
 *  - zIndex?: number (default: 9999)
 *  - lockScroll?: boolean (default: true)  // prevents page scrolling while open
 *  - onBackdropClick?: () => void          // optional click-to-close
 */
export default function PoolOrbitLoaderModal({
  open = true,
  message = "Loading…",
  size = 140,
  backdrop = "rgba(0,0,0,.45)",
  zIndex = 9999,
  lockScroll = true,
  onBackdropClick,
}) {
  const rawId = useId();
  const uid = String(rawId).replace(/[^a-zA-Z0-9_-]/g, "");

  const ids = {
    grad: `g8-center-${uid}`,
    miniShadow: `miniShadow-${uid}`,
    gloss: `gloss-${uid}`,
  };

  // Lock body scroll while the modal is open
  useEffect(() => {
    if (!open || !lockScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, lockScroll]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Loading"
      onClick={onBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        background: backdrop,
        zIndex,
        display: "grid",
        placeItems: "center",
      }}
    >
      {/* stop click from bubbling if you don't want backdrop-click close */}
      <div onClick={(e) => e.stopPropagation()} style={{ pointerEvents: "auto" }}>
        {/* Absolute loader + text */}
        <div
          style={{
            position: "relative",
            width: size,
            height: size + 36, // room for the label
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <svg
              viewBox="0 0 160 160"
              width={size}
              height={size}
              aria-label="Loading"
              role="status"
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

                {/* (Optional) subtle moving highlight for 8-ball */}
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
                    type="rotate"
                    from="0 80 80"
                    to="360 80 80"
                    dur="1.6s"
                    repeatCount="indefinite"
                  />
                  {/* radius = 52 */}
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
                    type="rotate"
                    from="360 80 80"
                    to="0 80 80"
                    dur="2.2s"
                    repeatCount="indefinite"
                  />
                  {/* radius = 68; offset angles by half-step to alternate with inner ring */}
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

          {/* Label below the loader */}
          <div
            style={{
              width: "max-content",
              position: "absolute",
              top: size + 8,
              left: "50%",
              transform: "translateX(-50%)",
              fontWeight: 700,
              color: "#e6edf7",
              textShadow: "0 1px 2px rgba(0,0,0,.35)",
              fontSize: 14,
            }}
          >
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}
