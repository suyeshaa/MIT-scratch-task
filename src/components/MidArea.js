import React, { useRef } from "react";
import { usePlayground, makeBlock } from "../store/PlaygroundContext";
import {
  addBlock,
  clearHistory,
  moveBlock,
  removeBlock,
  setView,
  updateBlock,
} from "../store/actions";
import { BLOCK_DEFS, DRAG_MIME } from "../blocks/catalog";
import { runOne } from "../runner/engine";

function WNum({ value, onChange }) {
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
      className="w-16 mx-1 px-1 py-0.5 text-xs text-gray-900 rounded-full text-center outline-none"
    />
  );
}

function WText({ value, onChange }) {
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
      className="w-24 mx-1 px-2 py-0.5 text-xs text-gray-900 rounded-full outline-none"
    />
  );
}

function readPayload(e) {
  try {
    const raw = e.dataTransfer.getData(DRAG_MIME);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function BlockBody({ block, charId, dispatch }) {
  const p = block.params || {};
  const set = (patch) => dispatch(updateBlock(charId, block.instanceId, patch));
  switch (block.kind) {
    case "move":
      return (
        <span className="flex items-center">
          Move <WNum value={p.steps} onChange={(v) => set({ steps: Number(v) || 0 })} /> steps
        </span>
      );
    case "turn":
      return (
        <span className="flex items-center">
          Turn <WNum value={p.degrees} onChange={(v) => set({ degrees: Number(v) || 0 })} /> degrees
        </span>
      );
    case "goto":
      return (
        <span className="flex items-center">
          Go to x: <WNum value={p.x} onChange={(v) => set({ x: Number(v) || 0 })} /> y:{" "}
          <WNum value={p.y} onChange={(v) => set({ y: Number(v) || 0 })} />
        </span>
      );
    case "say":
      return (
        <span className="flex items-center">
          Say <WText value={p.text} onChange={(v) => set({ text: v })} /> for{" "}
          <WNum value={p.secs} onChange={(v) => set({ secs: Number(v) || 0 })} /> sec
        </span>
      );
    case "think":
      return (
        <span className="flex items-center">
          Think <WText value={p.text} onChange={(v) => set({ text: v })} /> for{" "}
          <WNum value={p.secs} onChange={(v) => set({ secs: Number(v) || 0 })} /> sec
        </span>
      );
    case "repeat":
      return (
        <span className="flex items-center">
          Repeat <WNum value={p.count} onChange={(v) => set({ count: Number(v) || 0 })} /> times
        </span>
      );
    default:
      return <span>{block.kind}</span>;
  }
}

function Gap({ onDropAt }) {
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const payload = readPayload(e);
        if (payload) onDropAt(payload);
      }}
      className="h-2 rounded hover:h-5 hover:bg-blue-200 transition-all"
    />
  );
}

function WorkspaceRow({ block, charId, index, parentRepeatId, depth, onDropAt, getCharacters }) {
  const { state, dispatch } = usePlayground();
  const def = BLOCK_DEFS[block.kind];
  const isRepeat = block.kind === "repeat";

  const onDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.setData(
      DRAG_MIME,
      JSON.stringify({
        kind: block.kind,
        params: block.params,
        inner: block.inner || undefined,
        instanceId: block.instanceId,
        fromChar: charId,
        fromIndex: index,
        fromParentRepeatId: parentRepeatId || null,
      })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const runThis = async () => {
    await runOne(dispatch, getCharacters, charId, block);
  };

  const remove = () => dispatch(removeBlock(charId, block.instanceId));

  return (
    <div draggable onDragStart={onDragStart} className="cursor-grab">
      <div
        className={`flex items-center justify-between ${def.color} text-white pl-2 pr-1 py-1.5 text-xs rounded shadow`}
      >
        <BlockBody block={block} charId={charId} dispatch={dispatch} />
        <span className="flex items-center ml-1">
          <button
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              runThis();
            }}
            title="Run this block"
            className="bg-white bg-opacity-25 hover:bg-opacity-40 rounded-full w-5 h-5 flex items-center justify-center mr-1 text-[10px]"
          >
            ▶
          </button>
          <button
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              remove();
            }}
            title="Remove"
            className="bg-white bg-opacity-25 hover:bg-opacity-40 rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
          >
            ✕
          </button>
        </span>
      </div>
      {isRepeat && (
        <div
          className="ml-4 mt-1 mb-1 pl-2 pr-1 py-1 rounded bg-orange-100 border border-orange-300 min-h-[28px]"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const payload = readPayload(e);
            if (!payload) return;
            if (payload.instanceId === block.instanceId) return;
            onDropAt(payload, block.instanceId, (block.inner || []).length);
          }}
        >
          {(block.inner || []).map((ib, ii) => (
            <React.Fragment key={ib.instanceId}>
              <Gap onDropAt={(pl) => onDropAt(pl, block.instanceId, ii)} />
              <WorkspaceRow
                block={ib}
                charId={charId}
                index={ii}
                parentRepeatId={block.instanceId}
                depth={depth + 1}
                onDropAt={onDropAt}
                getCharacters={getCharacters}
              />
            </React.Fragment>
          ))}
          <Gap onDropAt={(pl) => onDropAt(pl, block.instanceId, (block.inner || []).length)} />
          {(block.inner || []).length === 0 && (
            <div className="text-[11px] text-orange-500 px-1 py-1">Drop blocks here to repeat</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MidArea({ getCharacters }) {
  const { state, dispatch } = usePlayground();
  const char = state.characters.find((c) => c.id === state.selectedId);
  const script = char ? char.script : [];
  const view = state.view || "code";

  const handleDropAt = (payload, parentRepeatId, targetIndex) => {
    if (!char) return;
    const targetParent = parentRepeatId || null;
    if (!payload.fromChar) {
      const fresh =
        payload.kind === "repeat"
          ? makeBlock("repeat", { count: Number(payload.params?.count) || 12 }, [])
          : makeBlock(payload.kind, payload.params || {});
      // preserve nested inner when copying a repeat from palette is empty anyway
      dispatch(
        addBlock({ charId: char.id, block: fresh, index: targetIndex, parentRepeatId: targetParent })
      );
    } else {
      let idx = targetIndex;
      const sameList =
        payload.fromChar === char.id &&
        (payload.fromParentRepeatId || null) === targetParent;
      if (sameList && payload.fromIndex < targetIndex) idx = targetIndex - 1;
      if (
        payload.fromChar === char.id &&
        payload.instanceId &&
        payload.instanceId === targetParent
      )
        return;
      dispatch(
        moveBlock({
          fromChar: payload.fromChar,
          toChar: char.id,
          instanceId: payload.instanceId,
          index: idx,
          parentRepeatId: targetParent,
        })
      );
    }
  };

  return (
    <div
      className="flex-1 h-full w-1/3 overflow-auto p-3 bg-blue-50"
      style={{ minHeight: "33vh" }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const payload = readPayload(e);
        if (!payload || !char) return;
        e.preventDefault();
        handleDropAt(payload, null, script.length);
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-gray-700">
          {view === "code" ? `Script — ${char ? char.name : "none"}` : "History"}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => dispatch(setView("code"))}
            className={`text-xs px-2 py-1 rounded ${view === "code" ? "bg-blue-500 text-white" : "bg-white text-gray-600 border"}`}
          >
            Code
          </button>
          <button
            onClick={() => dispatch(setView("history"))}
            className={`text-xs px-2 py-1 rounded ${view === "history" ? "bg-blue-500 text-white" : "bg-white text-gray-600 border"}`}
          >
            History
          </button>
        </div>
      </div>

      {view === "history" ? (
        <HistoryList />
      ) : !char ? (
        <div className="text-sm text-gray-500">Add a sprite to begin.</div>
      ) : (
        <div>
          {script.map((b, i) => (
            <React.Fragment key={b.instanceId}>
              <Gap onDropAt={(pl) => handleDropAt(pl, null, i)} />
              <WorkspaceRow
                block={b}
                charId={char.id}
                index={i}
                parentRepeatId={null}
                depth={0}
                onDropAt={handleDropAt}
                getCharacters={getCharacters}
              />
            </React.Fragment>
          ))}
          <Gap onDropAt={(pl) => handleDropAt(pl, null, script.length)} />
          {script.length === 0 && (
            <div className="border-2 border-dashed border-blue-200 rounded p-6 text-center text-sm text-gray-400 mt-2">
              Drag blocks here to build a script for {char.name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryList() {
  const { state, dispatch } = usePlayground();
  const nameOf = (id) => (state.characters.find((c) => c.id === id) || {}).name || id;
  if (state.history.length === 0)
    return <div className="text-sm text-gray-500">Nothing has run yet.</div>;
  return (
    <div>
      <button
        onClick={() => dispatch(clearHistory())}
        className="text-xs px-2 py-1 mb-2 bg-white border rounded text-gray-600"
      >
        Clear
      </button>
      <ul className="space-y-1">
        {state.history.map((h, i) => (
          <li key={i} className="text-xs bg-white border rounded px-2 py-1 text-gray-700">
            {h.type === "swap" ? (
              <span>
                ⚡ Collision: <b>{h.aName}</b> ⇄ <b>{h.bName}</b> swapped scripts
              </span>
            ) : (
              <span>
                {h.kind} {h.params ? JSON.stringify(h.params) : ""} → {nameOf(h.charId)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
