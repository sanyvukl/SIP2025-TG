import React, { useEffect, useId } from "react";

/**
 * EightBallBounce
 * A scalable 8-ball bounce loader.
 *
 * Props:
 *  - size?: number        // ball diameter in px (default 52)
 *  - speed?: number       // ms per bounce cycle (default 1000)
 *  - style?: React.CSSProperties
 *  - className?: string
 */
export function EightBallBounce({ size = 52, speed = 1000, style, className }) {
  const rawId = useId();
  const ns = String(rawId).replace(/[^a-zA-Z0-9_-]/g, "");

  // scale all parts from ball size
  const containerW = Math.round(size * 2.7);      // ~140 when size=52
  const containerH = Math.round(size * 2.3);      // ~120
  const floorInset = Math.max(8, Math.round(size * 0.19));
  const floorBottom = Math.round(size * 0.35);
  const bounce = Math.round(size * 0.88);

  const shadowW = Math.round(size * 1.23);        // ~64
  const shadowH = Math.max(6, Math.round(size * 0.19)); // ~10
  const shadowBottom = Math.round(size * 0.27);
  const badgeD = Math.round(size * 0.42);
  const badgeFont = Math.round(size * 0.35);      // ~18

  const blurPx = Math.max(4, Math.round(size * 0.12));  // ~6
  const borderAlpha = 0.12;

  const updownKey = `updown_${ns}`;
  const shadowKey = `shadow_${ns}`;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={className}
      style={{ width: containerW, height: containerH, position: "relative", ...style }}
    >
      {/* Scoped styles */}
      <style>{`
            @keyframes ${updownKey} {
                0%, 100% { transform: translateY(0); }
                50%      { transform: translateY(-${bounce}px); }
            }
            @keyframes ${shadowKey} {
                0%,100% { transform: scaleX(1); }
                50%     { transform: scaleX(.6); }
            }
            @media (prefers-reduced-motion: reduce) {
                .rb-${ns} .ball { animation-duration: ${Math.round(speed * 2.5)}ms !important; }
                .rb-${ns} .shadow { animation-duration: ${Math.round(speed * 2.5)}ms !important; }
            }
      `}</style>


        <div className={`rb-${ns}`} style={{ position: "absolute", inset: 0 }}>
        {/* floor line */}
        <div
            className="floor"
            style={{
            position: "absolute",
            left: floorInset,
            right: floorInset,
            bottom: floorBottom,
            height: 2,
            background: "#1c2330",
            borderRadius: 1,
            }}
        />

        {/* ---- centered BALL (wrapper centers; inner animates) ---- */}
        <div
            className="ballWrap"
            style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            // (optional) nudge if you want the ball to "sit" on the line:
            // bottom: floorBottom - 1,
            top: 0, // keep your original vertical layout; remove if you prefer bottom anchoring
            }}
        >
            <div
            className="ball"
            style={{
                display:"flex",
                justifyContent:"center",
                alignItems:"center",
                width: size,
                height: size,
                borderRadius: "50%",
                background:
                "radial-gradient(35% 35% at 35% 35%, #333 0%, #0a0a0c 60%, #070709 100%)",
                border: `1px solid rgba(255,255,255,${borderAlpha})`,
                animation: `${updownKey} ${speed}ms cubic-bezier(.3,.7,.3,1) infinite`,
                filter: `drop-shadow(0 2px 4px rgba(0,0,0,.4))`,
                willChange: "transform",
            }}
            >
                <div
                    className="badge"
                    style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: badgeD,
                    height: badgeD,
                    borderRadius: "50%",
                    background: "#fff",
                    color: "#000",
                    fontWeight: 700,
                    fontFamily: "system-ui, Segoe UI, Arial, sans-serif",
                    fontSize: badgeFont,
                    lineHeight: 1,
                    }}
                >
                    8
                </div>
            </div>
        </div>

        {/* ---- centered SHADOW (wrapper centers; inner scales) ---- */}
        <div
            className="shadowWrap"
            style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: shadowBottom,
            }}
        >
            <div
            className="shadow"
            style={{
                width: shadowW,
                height: shadowH,
                borderRadius: shadowH,
                background: "rgba(0,0,0,.45)",
                filter: `blur(${blurPx}px)`,
                animation: `${shadowKey} ${speed}ms cubic-bezier(.3,.7,.3,1) infinite`,
                willChange: "transform",
            }}
            />
        </div>
        </div>

    </div>
  );
}

/**
 * EightBallBounceModal
 * Full-screen overlay with the bounce loader centered.
 *
 * Props:
 *  - open?: boolean (default true)
 *  - message?: string (text under the loader)
 *  - size?: number (passed to EightBallBounce)
 *  - speed?: number
 *  - backdrop?: string (CSS color)
 *  - zIndex?: number
 *  - lockScroll?: boolean (default true)
 *  - onBackdropClick?: () => void
 */
export function EightBallBounceModal({
  open = true,
  message = "Loading…",
  size = 52,
  speed = 1000,
  backdrop = "rgba(0,0,0,.55)",
  zIndex = 9999,
  lockScroll = true,
  onBackdropClick,
}) {
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
      <div onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <EightBallBounce size={size} speed={speed} />
        <div
          style={{
            marginTop: 10,
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
  );
}

export default EightBallBounce;
