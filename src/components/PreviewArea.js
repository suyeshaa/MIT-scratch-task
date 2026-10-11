import React, { useEffect, useRef, useState } from "react";
import CatSprite from "./CatSprite";
import { usePlayground } from "../store/PlaygroundContext";
import { selectSprite, setPosition } from "../store/actions";
import { checkCollisions, clampToStage, setStageBounds } from "../runner/engine";

const TINTS = ["", "hue-rotate(140deg)", "hue-rotate(260deg)", "hue-rotate(60deg)"];

function Bubble({ bubble }) {
  if (!bubble) return null;
  if (bubble.kind === "think") {
    return (
      <div className="absolute -top-16 left-6 flex flex-col items-start pointer-events-none">
        <div className="bg-white border border-gray-300 rounded-full px-3 py-1 text-xs text-gray-800 shadow max-w-[160px] break-words">
          {bubble.text}
        </div>
        <div className="w-2 h-2 bg-white border border-gray-300 rounded-full ml-4 mt-0.5" />
        <div className="w-1.5 h-1.5 bg-white border border-gray-300 rounded-full ml-2 mt-0.5" />
      </div>
    );
  }
  return (
    <div className="absolute -top-14 left-6 pointer-events-none">
      <div className="bg-white border border-gray-300 rounded-lg px-3 py-1 text-xs text-gray-800 shadow max-w-[160px] break-words">
        {bubble.text}
      </div>
      <div className="w-3 h-3 bg-white border-b border-l border-gray-300 rotate-[-45deg] ml-4 -mt-1.5" />
    </div>
  );
}

function SpriteNode({ char, index, getCharacters }) {
  const { state, dispatch } = usePlayground();
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const selected = state.selectedId === char.id;

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    dispatch(selectSprite(char.id));
    setDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const baseX = char.x;
    const baseY = char.y;
    let lastX = baseX;
    let lastY = baseY;
    const onMove = (mv) => {
      const dx = mv.clientX - startX;
      const dy = mv.clientY - startY;
      const target = clampToStage(baseX + dx, baseY + dy);
      lastX = target.x;
      lastY = target.y;
      dispatch(setPosition(char.id, target.x, target.y));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setDragging(false);
      checkCollisions(getCharacters, dispatch, { id: char.id, x: lastX, y: lastY });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={dragRef}
      onMouseDown={onMouseDown}
      style={{
        position: "absolute",
        left: `calc(50% + ${char.x}px)`,
        top: `calc(50% + ${char.y}px)`,
        transform: "translate(-50%, -50%)",
        cursor: "grab",
        opacity: selected ? 1 : 0.75,
        zIndex: selected ? 10 : 1,
        transition: dragging ? "none" : "left 0.3s ease-in-out, top 0.3s ease-in-out",
      }}
    >
      <div
        style={{ transform: `rotate(${char.angle || 0}deg)`, filter: TINTS[index % TINTS.length] }}
        className={`relative transition-transform duration-300 ease-in-out ${char.flash ? "ring-4 ring-yellow-400 rounded-full" : ""} ${selected ? "drop-shadow-lg" : ""}`}
      >
        <Bubble bubble={char.bubble} />
        <CatSprite />
        <div
          className={`text-center text-[10px] mt-0.5 px-1 rounded ${selected ? "bg-blue-500 text-white" : "bg-white text-gray-600 border"}`}
        >
          {char.name}
        </div>
      </div>
    </div>
  );
}

export default function PreviewArea({ getCharacters }) {
  const { state, dispatch } = usePlayground();
  const stageRef = useRef(null);

  // Measure the stage box and publish its bounds to the engine gate so
  // moves, go-tos and manual drags can never leave the container.
  useEffect(() => {
    const measure = () => {
      const el = stageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setStageBounds(r.width / 2 - 48, r.height / 2 - 50);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div className="flex-none h-full w-full overflow-y-auto p-2 flex flex-col">
      <div className="text-sm font-semibold text-gray-700 mb-2">
        Stage ({state.characters.length} sprites)
      </div>
      <div
        ref={stageRef}
        onMouseDown={() => {}}
        className="flex-1 relative bg-white border border-gray-200 rounded overflow-hidden w-full self-stretch"
        style={{ height: "50vh", background: "#f8fafc" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-100" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-100" />
        </div>
        {state.characters.map((c, i) => (
          <SpriteNode key={c.id} char={c} index={i} getCharacters={getCharacters} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {state.characters.map((c) => (
          <button
            key={c.id}
            onClick={() => dispatch(selectSprite(c.id))}
            className={`text-xs px-2 py-1 rounded border ${state.selectedId === c.id ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-600"}`}
          >
            {c.name} ({Math.round(c.x)},{Math.round(c.y)})
          </button>
        ))}
      </div>
      <div className="text-[11px] text-gray-500 mt-2">
        Tip: set Sprite1 to <b>Move 10 steps</b> and Sprite2 to <b>Move −10 steps +
        Repeat</b>, press Play — on collision their scripts swap.
      </div>
    </div>
  );
}
