import React, { useRef, useState, useEffect } from "react";

/**
 * ZoomableImage
 * - 휠/트랙패드 줌, 터치 핀치 줌, 드래그 이동, 더블클릭(또는 더블탭) 리셋
 * - 이미지 비율 유지, 컨테이너 중앙 정렬을 위해 wrapper에서 width만 조절
 *
 * props:
 *  - src: string
 *  - alt?: string
 *  - maxWidth?: string | number    // 예: "1100px"
 *  - widthPercent?: number         // 예: 92 (뷰포트 %)
 *  - className?: string
 */
export default function ZoomableImage({
  src,
  alt = "",
  maxWidth = "1100px",
  widthPercent = 92,
  className = "",
}) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const draggingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const pinchRef = useRef({ active: false, d0: 0, s0: 1, cx: 0, cy: 0 });

  // 휠 줌
  const onWheel = (e) => {
    if (!wrapRef.current) return;
    e.preventDefault();
    const rect = wrapRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const k = Math.exp((-e.deltaY / 250) * 0.9); // 부드러운 줌
    const newScale = Math.min(6, Math.max(1, scale * k));
    if (newScale === scale) return;

    // 커서 기준 줌 (좌표 보정)
    const nx = px - ((px - tx) * newScale) / scale;
    const ny = py - ((py - ty) * newScale) / scale;

    setScale(newScale);
    setTx(nx);
    setTy(ny);
  };

  // 드래그 이동
  const onMouseDown = (e) => {
    draggingRef.current = true;
    startRef.current = { x: e.clientX, y: e.clientY, tx, ty };
  };
  const onMouseMove = (e) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    setTx(startRef.current.tx + dx);
    setTy(startRef.current.ty + dy);
  };
  const endDrag = () => (draggingRef.current = false);

  // 터치 핀치/드래그
  const dist = (t0, t1) => Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
  const center = (t0, t1) => ({ x: (t0.clientX + t1.clientX) / 2, y: (t0.clientY + t1.clientY) / 2 });

  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      draggingRef.current = true;
      const t = e.touches[0];
      startRef.current = { x: t.clientX, y: t.clientY, tx, ty };
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const d0 = dist(e.touches[0], e.touches[1]);
      const c = center(e.touches[0], e.touches[1]);
      const rect = wrapRef.current.getBoundingClientRect();
      pinchRef.current = {
        active: true,
        d0,
        s0: scale,
        cx: c.x - rect.left,
        cy: c.y - rect.top,
      };
    }
  };
  const onTouchMove = (e) => {
    if (pinchRef.current.active && e.touches.length === 2) {
      e.preventDefault();
      const d1 = dist(e.touches[0], e.touches[1]);
      const k = d1 / pinchRef.current.d0;
      const newScale = Math.min(6, Math.max(1, pinchRef.current.s0 * k));

      const { cx, cy } = pinchRef.current;
      const nx = cx - ((cx - tx) * newScale) / scale;
      const ny = cy - ((cy - ty) * newScale) / scale;

      setScale(newScale);
      setTx(nx);
      setTy(ny);
    } else if (draggingRef.current && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;
      setTx(startRef.current.tx + dx);
      setTy(startRef.current.ty + dy);
    }
  };
  const onTouchEnd = () => {
    draggingRef.current = false;
    pinchRef.current.active = false;
  };

  // 더블클릭/더블탭 리셋
  let clickTimer = useRef(null);
  const onClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      reset();
    } else {
      clickTimer.current = setTimeout(() => {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }, 250);
    }
  };

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  // ESC 리셋
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && reset();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const wheelHandler = (e) => {
      // 페이지 스크롤 완전 차단
      e.preventDefault();
      onWheel(e);
    };
    // passive:false 로 등록해야 preventDefault가 유효
    el.addEventListener("wheel", wheelHandler, { passive: false });
    return () => el.removeEventListener("wheel", wheelHandler, { passive: false });
  }, [scale, tx, ty]);

  // 이미지가 바뀌면 확대/이동 상태 초기화
    useEffect(() => {
        reset();
    }, [src]);

  return (
        <div
        ref={wrapRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={onClick}
        className={`relative mx-auto select-none ${className}`}
        style={{
            width: `min(${maxWidth}, ${widthPercent}vw)`,
            overflow: "hidden",
            borderRadius: "0.75rem",
            touchAction: "none",
            overscrollBehavior: "contain",   // 부모로 스크롤 전파 차단
            cursor: draggingRef.current ? "grabbing" : scale > 1 ? "grab" : "default",
        }}
        >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width: "100%",
          height: "auto",
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
          display: "block",
        }}
      />

      {/* 우하단 컨트롤 */}
      <div
        className="absolute top-2 right-2 flex gap-1 rounded-md bg-black/40 text-white px-1 py-1"
        style={{ backdropFilter: "blur(2px)" }}
        >
        <button
          onClick={(e) => {
            e.stopPropagation();
            const newScale = Math.max(1, scale * 0.9);
            setTx((x) => x * (newScale / scale));
            setTy((y) => y * (newScale / scale));
            setScale(newScale);
          }}
          className="px-2 leading-none"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const newScale = Math.min(6, scale * 1.1);
            setTx((x) => x * (newScale / scale));
            setTy((y) => y * (newScale / scale));
            setScale(newScale);
          }}
          className="px-2 leading-none"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            reset();
          }}
          className="px-2 leading-none"
          aria-label="Reset"
        >
          ↺
        </button>
      </div>
    </div>
  );
}
