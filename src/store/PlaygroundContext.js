import React, { createContext, useContext, useMemo, useReducer } from "react";
import { ActionTypes } from "./actions";

let uidCounter = 0;
export function nextId(prefix = "id") {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter}`;
}

export function makeBlock(kind, params = {}, inner) {
  const base = { instanceId: nextId("blk"), kind, params: { ...params } };
  if (kind === "repeat") base.inner = Array.isArray(inner) ? inner : [];
  return base;
}

function cloneBlock(block) {
  const copy = {
    instanceId: nextId("blk"),
    kind: block.kind,
    params: { ...(block.params || {}) },
  };
  if (block.kind === "repeat") {
    copy.inner = (block.inner || []).map(cloneBlock);
  }
  return copy;
}

const initialCharacters = [
  {
    id: "sprite1",
    name: "Sprite1",
    x: -120,
    y: 0,
    angle: 0,
    bubble: null,
    flash: false,
    scriptVersion: 0,
    script: [],
  },
  {
    id: "sprite2",
    name: "Sprite2",
    x: 120,
    y: 0,
    angle: 0,
    bubble: null,
    flash: false,
    scriptVersion: 0,
    script: [],
  },
];

const initialState = {
  characters: initialCharacters,
  selectedId: "sprite1",
  history: [],
  spriteCount: 2,
  view: "code",
};

function removeInstance(list, instanceId) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].instanceId === instanceId) {
      const next = list.slice();
      const [removed] = next.splice(i, 1);
      return { next, removed, parentRepeatId: null };
    }
    if (list[i].kind === "repeat" && list[i].inner) {
      const idx = list[i].inner.findIndex((b) => b.instanceId === instanceId);
      if (idx !== -1) {
        const next = list.slice();
        const repCopy = { ...next[i], inner: next[i].inner.slice() };
        const [removed] = repCopy.inner.splice(idx, 1);
        next[i] = repCopy;
        return { next, removed, parentRepeatId: list[i].instanceId };
      }
    }
  }
  return { next: list, removed: null, parentRepeatId: null };
}

function insertInstance(list, instance, index, parentRepeatId) {
  const next = list.slice();
  if (!parentRepeatId) {
    const at = Math.max(0, Math.min(index == null ? next.length : index, next.length));
    next.splice(at, 0, instance);
    return next;
  }
  const ri = next.findIndex((b) => b.instanceId === parentRepeatId);
  if (ri === -1) {
    next.push(instance);
    return next;
  }
  const rep = { ...next[ri], inner: [...(next[ri].inner || [])] };
  const at = Math.max(0, Math.min(index == null ? rep.inner.length : index, rep.inner.length));
  rep.inner.splice(at, 0, instance);
  next[ri] = rep;
  return next;
}

function updateInstance(list, instanceId, patchParams, patchInner) {
  return list.map((b) => {
    if (b.instanceId === instanceId) {
      const out = { ...b, params: { ...(b.params || {}), ...(patchParams || {}) } };
      if (patchInner !== undefined) out.inner = patchInner;
      return out;
    }
    if (b.kind === "repeat" && b.inner) {
      const inner = b.inner.map((ib) =>
        ib.instanceId === instanceId
          ? { ...ib, params: { ...(ib.params || {}), ...(patchParams || {}) } }
          : ib
      );
      if (inner !== b.inner) return { ...b, inner };
    }
    return b;
  });
}

function reducer(state, action) {
  switch (action.type) {
    case ActionTypes.SELECT:
      return { ...state, selectedId: action.id };
    case ActionTypes.ADD_CHARACTER: {
      const n = state.spriteCount + 1;
      const ch = {
        id: nextId("sprite"),
        name: `Sprite${n}`,
        x: -80 + (n % 3) * 80,
        y: -40 + (n % 2) * 80,
        angle: 0,
        bubble: null,
        flash: false,
        scriptVersion: 0,
        script: [],
      };
      return {
        ...state,
        characters: [...state.characters, ch],
        selectedId: ch.id,
        spriteCount: n,
      };
    }
    case ActionTypes.ADD_BLOCK: {
      const { charId, block, index, parentRepeatId } = action;
      return {
        ...state,
        characters: state.characters.map((c) =>
          c.id !== charId
            ? c
            : { ...c, script: insertInstance(c.script, block, index, parentRepeatId || null) }
        ),
      };
    }
    case ActionTypes.MOVE_BLOCK: {
      const { fromChar, toChar, instanceId, index, parentRepeatId } = action;
      const src = state.characters.find((c) => c.id === fromChar);
      if (!src) return state;
      const { next: srcNext, removed } = removeInstance(src.script, instanceId);
      if (!removed) return state;
      return {
        ...state,
        characters: state.characters.map((c) => {
          if (c.id === fromChar && c.id === toChar) {
            let target = srcNext;
            // same-list index correction is handled by caller via adjusted index;
            // insert into the post-removal list
            return { ...c, script: insertInstance(target, removed, index, parentRepeatId || null) };
          }
          if (c.id === fromChar) return { ...c, script: srcNext };
          if (c.id === toChar)
            return { ...c, script: insertInstance(c.script, removed, index, parentRepeatId || null) };
          return c;
        }),
      };
    }
    case ActionTypes.REMOVE_BLOCK: {
      const { charId, instanceId } = action;
      return {
        ...state,
        characters: state.characters.map((c) =>
          c.id !== charId ? c : { ...c, script: removeInstance(c.script, instanceId).next }
        ),
      };
    }
    case ActionTypes.UPDATE_BLOCK: {
      const { charId, instanceId, params } = action;
      return {
        ...state,
        characters: state.characters.map((c) =>
          c.id !== charId ? c : { ...c, script: updateInstance(c.script, instanceId, params) }
        ),
      };
    }
    case ActionTypes.TURN: {
      const { charId, degrees } = action;
      return {
        ...state,
        characters: state.characters.map((c) =>
          c.id !== charId ? c : { ...c, angle: (c.angle || 0) + degrees }
        ),
      };
    }
    case ActionTypes.SET_POS: {
      const { charId, x, y } = action;
      return {
        ...state,
        characters: state.characters.map((c) => (c.id !== charId ? c : { ...c, x, y })),
      };
    }
    case ActionTypes.SET_BUBBLE: {
      const { charId, bubble } = action;
      return {
        ...state,
        characters: state.characters.map((c) => (c.id !== charId ? c : { ...c, bubble })),
      };
    }
    case ActionTypes.CLEAR_BUBBLE: {
      const { charId } = action;
      return {
        ...state,
        characters: state.characters.map((c) => (c.id !== charId ? c : { ...c, bubble: null })),
      };
    }
    case ActionTypes.SET_FLASH: {
      const { charId, flash } = action;
      return {
        ...state,
        characters: state.characters.map((c) => (c.id !== charId ? c : { ...c, flash })),
      };
    }
    case ActionTypes.SWAP_SCRIPTS: {
      const { aId, bId } = action;
      const a = state.characters.find((c) => c.id === aId);
      const b = state.characters.find((c) => c.id === bId);
      if (!a || !b) return state;
      return {
        ...state,
        characters: state.characters.map((c) => {
          if (c.id === aId)
            return { ...c, script: b.script, flash: true, scriptVersion: (c.scriptVersion || 0) + 1 };
          if (c.id === bId)
            return { ...c, script: a.script, flash: true, scriptVersion: (c.scriptVersion || 0) + 1 };
          return c;
        }),
        history: [
          ...state.history,
          { type: "swap", aId, bId, aName: a.name, bName: b.name, at: Date.now() },
        ],
      };
    }
    case ActionTypes.LOG: {
      return { ...state, history: [...state.history, action.entry] };
    }
    case ActionTypes.CLEAR_HISTORY:
      return { ...state, history: [] };
    case ActionTypes.COPY_SCRIPT: {
      const { fromId, toId } = action;
      if (!fromId || !toId || fromId === toId) return state;
      const src = state.characters.find((c) => c.id === fromId);
      if (!src || !state.characters.some((c) => c.id === toId)) return state;
      const clones = src.script.map(cloneBlock);
      return {
        ...state,
        characters: state.characters.map((c) => (c.id !== toId ? c : { ...c, script: clones })),
      };
    }
    case ActionTypes.SET_VIEW:
      return { ...state, view: action.view };
    default:
      return state;
  }
}

const PlaygroundContext = createContext(null);

export function PlaygroundProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <PlaygroundContext.Provider value={value}>{children}</PlaygroundContext.Provider>;
}

export function usePlayground() {
  const ctx = useContext(PlaygroundContext);
  if (!ctx) throw new Error("usePlayground must be used inside PlaygroundProvider");
  return ctx;
}

export { cloneBlock };
