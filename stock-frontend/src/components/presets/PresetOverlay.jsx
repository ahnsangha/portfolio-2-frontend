import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

/** 프리셋 오버레이: 버튼(anchorEl) 오른쪽에 고정 표시(공간 부족 시 자동 좌측), 다크/라이트 테마 동기화 */
export default function PresetOverlay({
  open,
  onClose,
  anchorEl,          // 버튼 DOM 엘리먼트
  presets = [],
  onSaveClick,
  onApply,
  onRename,
  onDelete,
}) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 360 });

  const margin = 8;
  const width = 360;
  const maxH = 520;

  const PAGE_SIZE = 5;
    const [page, setPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil((presets?.length || 0) / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE;
    const view = (presets || []).slice(start, start + PAGE_SIZE);

    // 프리셋 개수가 줄거나 오버레이가 열릴 때 페이지 범위 보정
    useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    }, [page, totalPages, presets, open]);

  const place = () => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    const vw = window.innerWidth;

    // 기본: 버튼 오른쪽
    let left = r.right + margin;
    let top = r.top;

    // 오른쪽이 부족하면 왼쪽으로 뒤집기
    if (left + width > vw - margin) {
      left = Math.max(margin, r.left - width - margin);
    }

    setPos({ top: Math.round(top), left: Math.round(left), width });
  };

  const [listAnim, setListAnim] = useState(false);

    // 패널 등장 애니메이션
    const animateOpen = () => {
        const el = panelRef.current;
        if (!el) return;
        el.style.opacity = "0";
        el.style.transform = "translateY(-6px) scale(0.98)";
        el.style.transition = "none";
        el.style.willChange = "opacity, transform";
        requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.style.transition = "opacity 160ms ease, transform 160ms ease";
            el.style.opacity = "1";
            el.style.transform = "translateY(0) scale(1)";
        });
        });
    };
    
    useLayoutEffect(() => {
        if (open) {
        place();
        animateOpen();
        setListAnim(false);
        requestAnimationFrame(() => setListAnim(true));
        }
    }, [open, anchorEl]);
  

  // 리사이즈/스크롤 시 재배치
  useEffect(() => {
    if (!open) return;
    const onR = () => place();
    window.addEventListener("resize", onR);
    window.addEventListener("scroll", onR, true);
    return () => {
      window.removeEventListener("resize", onR);
      window.removeEventListener("scroll", onR, true);
    };
  }, [open, anchorEl]);

  // 렌더 후 실제 높이를 보고 세로 클램핑
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const vh = window.innerHeight;
    const h = panelRef.current.offsetHeight;
    let top = pos.top;
    if (top + h > vh - margin) {
      top = Math.max(margin, vh - h - margin);
      if (top !== pos.top) setPos((p) => ({ ...p, top }));
    }
  }, [open, pos.top, pos.left]);

  // 바깥 클릭/ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    const onDown = (e) => {
      const t = e.target;
      if (panelRef.current && !panelRef.current.contains(t) &&
          anchorEl && !anchorEl.contains(t)) {
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, anchorEl, onClose]);

  // 현재 전역 테마를 감지해 오버레이 자신에게 theme-light / theme-dark 클래스를 부여
  const detectThemeClass = () => {
    try {
      const ls = localStorage.getItem("appTheme");
      if (ls === "dark") return "theme-dark";
      if (ls === "light") return "theme-light";
    } catch {}
    const de = document.documentElement;
    const b  = document.body;
    const isDark =
      de.classList.contains("dark") ||
      b.classList.contains("dark") ||
      de.classList.contains("theme-dark") ||
      b.classList.contains("theme-dark") ||
      de.dataset.theme === "dark" ||
      (b && b.dataset && b.dataset.theme === "dark") ||
      !!document.querySelector(".theme-dark, .dark-mode, [data-theme='dark']");
    return isDark ? "theme-dark" : "theme-light";
  };

  const [themeClass, setThemeClass] = useState(detectThemeClass());

  useEffect(() => {
    const update = () => setThemeClass(detectThemeClass());

    const obsHtml = new MutationObserver(update);
    const obsBody = new MutationObserver(update);
    obsHtml.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    if (document.body) obsBody.observe(document.body, { attributes: true, attributeFilter: ["class", "data-theme"] });

    window.addEventListener("storage", update);
    window.addEventListener("themechange", update);
    const mq = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    mq && mq.addEventListener && mq.addEventListener("change", update);

    return () => {
      obsHtml.disconnect();
      obsBody.disconnect();
      window.removeEventListener("storage", update);
      window.removeEventListener("themechange", update);
      mq && mq.removeEventListener && mq.removeEventListener("change", update);
    };
  }, []);

  if (!open) return null;

  const node = (
    <div
      ref={panelRef}
      className={`preset-overlay ${themeClass}`}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: maxH,
        background: "var(--sov-bg)",
        color: "var(--sov-fg)",
        border: "1px solid var(--sov-border)",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,.18)",
        overflow: "auto",
        zIndex: 1000
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: "var(--sov-border)" }}
      >
        <div className="text-sm font-bold">종목 프리셋</div>
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-2 py-1 rounded"
            onClick={onSaveClick}
          >
            저장
          </button>
          <button
            aria-label="닫기"
            className="text-slate-500 hover:text-slate-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="py-1">
        {presets.length === 0 && (
          <div className="px-3 py-4 text-xs text-slate-500">
            저장된 프리셋이 없습니다.
          </div>
        )}
        {view.map((p, i) => (
            <div
                key={p.id}
                className="flex items-center justify-between px-3 py-2 cursor-pointer"
                style={{
                transition: "background .12s ease, opacity .16s ease, transform .16s ease",
                opacity: listAnim ? 1 : 0,
                transform: listAnim ? "translateY(0)" : "translateY(4px)",
                transitionDelay: `${i * 15}ms`
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--summary-hover-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => onApply?.(p.id)}
            >
                <div className="truncate text-sm" title={p.name}>{p.name}</div>
                <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
                >
                <button
                    title="이름 수정"
                    aria-label="이름 수정"
                    className="p-1"
                    onClick={() => {
                    const v = prompt("프리셋 이름 수정", p.name);
                    if (v != null && v.trim()) onRename?.(p.id, v.trim());
                    }}
                >
                    <Pencil size={16} strokeWidth={2} />
                </button>
                <button
                    title="삭제"
                    aria-label="프리셋 삭제"
                    className="p-1"
                    onClick={() => onDelete?.(p.id)}
                >
                    <Trash2 size={16} strokeWidth={2} />
                </button>
                </div>
            </div>
        ))}
      </div>
      <div
        className="preset-pagination"
        style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 8, padding: "8px 12px", borderTop: "1px solid var(--sov-border)" }}
        >
        <button
            type="button"
            onClick={() => setPage((v) => Math.max(1, v - 1))}
            disabled={page <= 1}
            aria-label="이전 페이지"
            title="이전 페이지"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, border: "1px solid var(--sov-border)" }}
        >
            <ChevronLeft size={16} strokeWidth={2} />
        </button>

        <span style={{ minWidth: 56, textAlign: "center" }}>{page} / {totalPages}</span>

        <button
            type="button"
            onClick={() => setPage((v) => Math.min(totalPages, v + 1))}
            disabled={page >= totalPages}
            aria-label="다음 페이지"
            title="다음 페이지"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, border: "1px solid var(--sov-border)" }}
        >
            <ChevronRight size={16} strokeWidth={2} />
        </button>
        </div>
    </div>
  );

  return createPortal(node, document.body);
}
