// src/components/LoaderOne/LoaderOne.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./LoaderStyles.css";
import LoaderWrapper from "../LoaderWrapper/LoaderWrapper";

// small hook: prefers-reduced-motion
function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setPrefers(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return prefers;
}

function LoaderTwoAnimation({
  size,
  color,
  thickness,
  innerDur,
  outerDur,
  restartKey,
  reduced
}) {
  // allow number (px) or full CSS size strings
  const toSize = (v) => (typeof v === "number" ? `${v}px` : String(v));

  const styleVars = useMemo(
    () => ({
      // Your CSS should read these variables; fallbacks remain in CSS
      "--loader-size": toSize(size),
      "--loader-color": color || "currentColor",
      "--loader-thickness": thickness != null ? toSize(thickness) : undefined,
      "--loader-inner-dur": innerDur,
      "--loader-outer-dur": outerDur,
      "--loader-reduced": reduced ? 1 : 0, // if you want to branch in CSS
    }),
    [size, color, thickness, innerDur, outerDur, reduced]
  );

  return (
    <div style={{marginBottom: "20px"}}>
        <div
        key={restartKey}                
        className="loaderTwo"
        style={styleVars}
        aria-hidden="true"
        />
    </div>
  );
}

export default function LoaderTwo({
  // Wrapper / shell options (handled by LoaderWrapper)
  open = true,
  message = "Loading…",
  backdrop = "rgba(0,0,0,.45)",
  zIndex = 999,
  lockScroll = true,
  closable = false,
  onClose,
  onBackdropClick,
  className,
  closeButtonLabel = "X",

  // Loader controls
  size = 140,          // px or CSS size string
  color,               // e.g. "#e6edf7" or "var(--ink)"
  thickness,           // px or CSS size (optional)
  innerDur = "1s",
  outerDur = "1.1s",

  // Behavior
  restartOnOpen = true // set false if you do not want animation to restart
}) {
  const [restartKey, setRestartKey] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (open && restartOnOpen) setRestartKey((k) => k + 1);
  }, [open, restartOnOpen]);

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
      // 🔊 Accessibility from the wrapper side
      role="status"
      aria-live="polite"
      aria-busy={open ? "true" : "false"}
    >
      <LoaderTwoAnimation
        size={size}
        color={color}
        thickness={thickness}
        innerDur={innerDur}
        outerDur={outerDur}
        restartKey={restartKey}
        reduced={prefersReducedMotion}
      />
    </LoaderWrapper>
  );
}
