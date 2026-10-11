import React, { useEffect, useState } from "react";
import { usePlayground } from "../store/PlaygroundContext";
import { BLOCK_DEFS, DRAG_MIME } from "../blocks/catalog";
import { runOne } from "../runner/engine";

function NumInput({ value, onChange, width = "w-12" }) {
  return (
    <input
      type="number"
      value={value}
      draggable={false}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      className={`${width} mx-1 px-1 py-0.5 text-xs text-gray-900 rounded-full text-center outline-none`}
    />
  );
}

function TextInput({ value, onChange, width = "w-20" }) {
  return (
    <input
      type="text"
      value={value}
      draggable={false}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      className={`${width} mx-1 px-2 py-0.5 text-xs text-gray-900 rounded-full outline-none`}
    />
  );
}

// Hide the browser's default static drag ghost so only our animated
// custom preview follows the cursor.
function hideNativeGhost(e) {
  const el = document.createElement("div");
  el.style.cssText =
    "position:absolute;top:-1000px;left:-1000px;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(el);
  try {
    e.dataTransfer.setDragImage(el, 0, 0);
  } catch {
    // older browsers: fall back to the default ghost
  }
  setTimeout(() => el.remove(), 0);
}

function PaletteRow({ kind, children, params, onPreviewStart, onPreviewEnd, onPlay }) {
  const def = BLOCK_DEFS[kind];
  const [active, setActive] = useState(false);
  const onDragStart = (e) => {
    e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind, params }));
    e.dataTransfer.effectAllowed = "copy";
    hideNativeGhost(e);
    setActive(true);
    onPreviewStart(kind, params, e.clientX, e.clientY);
  };
  const onDragEnd = () => {
    setActive(false);
    onPreviewEnd();
  };
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex flex-row flex-wrap items-center ${def.color} text-white px-2 py-1.5 my-2 text-xs rounded cursor-grab select-none shadow transition-opacity duration-150 ${active ? "opacity-40" : "opacity-100"}`}
    >
      {children}
      {onPlay && (
        <button
          draggable={false}
          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          title="Run on selected sprite"
          className="ml-auto bg-white bg-opacity-25 hover:bg-opacity-40 rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
        >
          ▶
        </button>
      )}
    </div>
  );
}

function previewLabel(kind, params) {
  const p = params || {};
  switch (kind) {
    case "move":
      return <span>Move {p.steps} steps</span>;
    case "turn":
      return <span>Turn {p.degrees}°</span>;
    case "goto":
      return (
        <span>
          Go to x:{p.x} y:{p.y}
        </span>
      );
    case "say":
      return (
        <span>
          Say “{p.text}” {p.secs}s
        </span>
      );
    case "think":
      return (
        <span>
          Think “{p.text}” {p.secs}s
        </span>
      );
    case "repeat":
      return <span>Repeat {p.count}x</span>;
    default:
      return <span>{kind}</span>;
  }
}

function DragPreview({ preview }) {
  if (!preview) return null;
  const def = BLOCK_DEFS[preview.kind];
  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: preview.x + 14,
        top: preview.y + 14,
        transition: "left 0.12s ease-out, top 0.12s ease-out",
      }}
    >
      <div
        className={`drag-preview-pop flex items-center ${def.color} text-white px-3 py-2 text-xs rounded-lg shadow-2xl whitespace-nowrap`}
        style={{ transform: "rotate(3deg) scale(1.06)", opacity: 0.94 }}
      >
        {previewLabel(preview.kind, preview.params)}
      </div>
    </div>
  );
}

export default function Sidebar({ getCharacters }) {
  const { state, dispatch } = usePlayground();
  const [steps, setSteps] = useState(10);
  const [degrees, setDegrees] = useState(15);
  const [gx, setGx] = useState(0);
  const [gy, setGy] = useState(0);
  const [sayText, setSayText] = useState("Hello!");
  const [saySecs, setSaySecs] = useState(2);
  const [thinkText, setThinkText] = useState("Hmm...");
  const [thinkSecs, setThinkSecs] = useState(2);
  const [preview, setPreview] = useState(null);

  // Track the cursor for the whole page while a palette drag is active.
  useEffect(() => {
    const onDragOver = (e) => {
      if (e.clientX === 0 && e.clientY === 0) return;
      setPreview((p) => (p ? { ...p, x: e.clientX, y: e.clientY } : p));
    };
    const onEnd = () => setPreview(null);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragend", onEnd);
    document.addEventListener("drop", onEnd);
    return () => {
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragend", onEnd);
      document.removeEventListener("drop", onEnd);
    };
  }, []);

  const startPreview = (kind, params, x, y) => setPreview({ kind, params, x, y });
  const endPreview = () => setPreview(null);

  // Run a palette block immediately on the selected sprite.
  const playOnSelected = (kind, params) => {
    if (!state.selectedId) return;
    runOne(dispatch, getCharacters, state.selectedId, { kind, params });
  };

  return (
    <div className="w-60 flex-none h-full overflow-y-auto flex flex-col items-stretch p-2 border-r border-gray-200 bg-gray-50">
      <style>{`@keyframes drag-preview-pop { from { transform: rotate(-2deg) scale(0.85); opacity: 0; } to { transform: rotate(3deg) scale(1.06); opacity: 0.94; } } .drag-preview-pop { animation: drag-preview-pop 0.16s ease-out; }`}</style>
      <div className="font-bold text-sm text-gray-700">Motion</div>
      <PaletteRow
        kind="move"
        params={{ steps: Number(steps) || 0 }}
        onPreviewStart={startPreview}
        onPreviewEnd={endPreview}
        onPlay={() => playOnSelected("move", { steps: Number(steps) || 0 })}
      >
        <span>Move</span>
        <NumInput value={steps} onChange={setSteps} />
        <span>steps</span>
      </PaletteRow>
      <PaletteRow
        kind="turn"
        params={{ degrees: Number(degrees) || 0 }}
        onPreviewStart={startPreview}
        onPreviewEnd={endPreview}
        onPlay={() => playOnSelected("turn", { degrees: Number(degrees) || 0 })}
      >
        <span>Turn</span>
        <NumInput value={degrees} onChange={setDegrees} />
        <span>degrees</span>
      </PaletteRow>
      <PaletteRow
        kind="goto"
        params={{ x: Number(gx) || 0, y: Number(gy) || 0 }}
        onPreviewStart={startPreview}
        onPreviewEnd={endPreview}
        onPlay={() => playOnSelected("goto", { x: Number(gx) || 0, y: Number(gy) || 0 })}
      >
        <span>Go to x:</span>
        <NumInput value={gx} onChange={setGx} />
        <span>y:</span>
        <NumInput value={gy} onChange={setGy} />
      </PaletteRow>

      <div className="font-bold text-sm text-gray-700 mt-3">Looks</div>
      <PaletteRow
        kind="say"
        params={{ text: sayText, secs: Number(saySecs) || 0 }}
        onPreviewStart={startPreview}
        onPreviewEnd={endPreview}
        onPlay={() => playOnSelected("say", { text: sayText, secs: Number(saySecs) || 0 })}
      >
        <span>Say</span>
        <TextInput value={sayText} onChange={setSayText} />
        <span>for</span>
        <NumInput value={saySecs} onChange={setSaySecs} />
        <span>sec</span>
      </PaletteRow>
      <PaletteRow
        kind="think"
        params={{ text: thinkText, secs: Number(thinkSecs) || 0 }}
        onPreviewStart={startPreview}
        onPreviewEnd={endPreview}
        onPlay={() => playOnSelected("think", { text: thinkText, secs: Number(thinkSecs) || 0 })}
      >
        <span>Think</span>
        <TextInput value={thinkText} onChange={setThinkText} />
        <span>for</span>
        <NumInput value={thinkSecs} onChange={setThinkSecs} />
        <span>sec</span>
      </PaletteRow>

      <div className="text-[11px] text-gray-500 mt-1 leading-snug">
        Drag blocks into the workspace. Drop blocks inside Repeat to loop them. Edit numbers before
        or after dragging. Press ▶ on a block to run it on the selected sprite.
      </div>
      <DragPreview preview={preview} />
    </div>
  );
}
