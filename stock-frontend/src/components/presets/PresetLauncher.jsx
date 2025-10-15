// components/presets/PresetLauncher.jsx
import { useState, useRef } from "react";
import { usePresets } from "../../hooks/usePresets";
import PresetOverlay from "./PresetOverlay";

/** 컨트롤 패널에서 프리셋 버튼 + 오버레이 띄우기 (UI 전용) */
export default function PresetLauncher({ getCurrentSymbols, applySymbols }) {
  const [open, setOpen] = useState(false);
  const { items, add, remove, rename } = usePresets();
  function nextPresetName(list = []) {
    const used = new Set(
      list
        .map((p) => {
          const m = String(p?.name || "").match(/^프리셋\s*(\d+)$/);
          return m ? parseInt(m[1], 10) : null;
        })
        .filter((n) => n !== null)
    );
    let n = 1;
    while (used.has(n)) n++;
    return `프리셋 ${String(n).padStart(2, "0")}`;
  }
  const onSaveClick = () => {
    const symbols = getCurrentSymbols ? getCurrentSymbols() : [];
    if (!symbols || symbols.length === 0) return;
    const name = nextPresetName(items);
    add(name, symbols);
  };


  const onApply = (id) => {
    const p = items.find(x => x.id === id);
    if (!p) return;
    if (applySymbols) applySymbols(p.symbols || []);
  };

  const btnRef = useRef(null);

  return (
    <div className="preset-launcher w-full">
      <button
        ref={btnRef}
        type="button"
        // ✅ 새로운 Tailwind CSS 클래스 적용
        className="preset-btn w-full"
        onClick={() => setOpen(v => !v)}
        title="종목 프리셋"
      >
        종목 프리셋
      </button>

      <PresetOverlay
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={btnRef.current}
        presets={items}
        onSaveClick={onSaveClick}
        onApply={onApply}
        onRename={rename}
        onDelete={remove}
      />
    </div>
  );
}