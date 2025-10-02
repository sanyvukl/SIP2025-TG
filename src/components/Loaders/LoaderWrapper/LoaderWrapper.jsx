import React, { useEffect, useCallback,useState } from "react";
import { createPortal } from "react-dom";

export default function LoaderWrapper({
  children,
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
}) {

  const [internalOpen, setInternalOpen] = useState(true);

  useEffect(() => {
    setInternalOpen(open);
    if (!open || !lockScroll) return;
    // Only lock scroll when we are a true modal
    if (closable) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, lockScroll, closable]);

  const onKeyDown = useCallback((e) => {
    if (e.key === "Escape" && closable) onClose?.();
  }, [closable, onClose]);
  
const handleClose = useCallback(() => {
    // if self-managing, close internally
    if (closable) {
      setInternalOpen(false);
    }
    // always call external handler if given
    onClose?.();
  }, [closable, onClose])

  useEffect(() => {
    setInternalOpen(open);
    if (!open) return;
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onKeyDown]);

  if (!open) return null;
  if (!internalOpen) return null;

  const frameStyles = closable
    ? {
        width: "300px",
        minHeight: "350px",
        background: "rgb(25, 32, 41)",
        borderRadius: 16,
        paddingBottom: "40px",
        paddingLeft: "10px",
        paddingRight: "10px",
        boxShadow: "0 12px 34px rgba(0,0,0,.35)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "end",
        position: "relative",
        textAlign: "center",
        alignItems: "center",
        backdropFilter: "blur(4px)",
        pointerEvents: "auto",
      }
    : {
        textAlign: "center",
        pointerEvents: "auto",
      };

  const overlayStyle = {
    position: (internalOpen && closable) ? "fixed" : "absolute",
    inset: 0,
    background: closable ? "rgba(0,0,0,.45)" : backdrop,
    zIndex,
    display: "grid",
    placeItems: "center",
    width: "100%",
    height:"100%",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  };

  return (
    <div
      role="dialog"
      // Only modal when backdrop is active
      aria-modal={closable ? undefined : true}
      aria-label="Loading"
      onMouseDown={(e) => {
        // Backdrop clicks only apply when we’re modal
        if (!closable && e.target === e.currentTarget) {
          onBackdropClick?.();
        }
      }}
      style={overlayStyle}
      className={className}
    >
      <div
        // The frame regains interactivity
        onMouseDown={(e) => e.stopPropagation()}
        style={frameStyles}
      >
        {/* Close button when closable */}
        {closable && (
          <div>
            <button
              type="button"
              onClick={() => handleClose()}
              aria-label={closeButtonLabel}
              title={closeButtonLabel}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                minWidth: 36,
                minHeight: 32,
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid rgba(255,255,255,.15)",
                background: "rgba(25,30,40,.85)",
                color: "#e6edf7",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background .2s, border .2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#ff6a2f";
                e.currentTarget.style.border = "1px solid rgba(255,255,255,.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(25,30,40,.85)";
                e.currentTarget.style.border = "1px solid rgba(255,255,255,.15)";
              }}
            >
              {closeButtonLabel}
            </button>
          </div>
        )}

        {/* Animation / loader content */}
        <div style={{display: "flex", justifyContent: "center", alignItems:"center"}}>{children}</div>

        {/* Message */}
        {message ? (
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
        ) : null}
      </div>
    </div>
  );
}
