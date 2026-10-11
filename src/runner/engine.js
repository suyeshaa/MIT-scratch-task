import { describeBlock } from "../blocks/catalog";
import {
  clearBubble,
  logRun,
  setBubble,
  setFlash,
  setPosition,
  swapScripts,
  turnSprite,
} from "../store/actions";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sprite footprint on stage (SVG ~95x100 plus the name label below it).
// Two sprites collide exactly when these boxes overlap.
export const SPRITE_W = 95;
export const SPRITE_H = 116;
// Bounds restarts when scripts keep swapping mid-run (pathological loops).
const MAX_RESTARTS = 6;

// Stage gate: half-extents (px from stage center) inside which sprite
// centers must stay. Measured by PreviewArea on mount/resize.
const stageGate = { hx: Infinity, hy: Infinity };

export function setStageBounds(hx, hy) {
  stageGate.hx = Math.max(0, hx);
  stageGate.hy = Math.max(0, hy);
}

export function clampToStage(x, y) {
  return {
    x: Math.max(-stageGate.hx, Math.min(stageGate.hx, x)),
    y: Math.max(-stageGate.hy, Math.min(stageGate.hy, y)),
  };
}

let lastSwapAt = 0;
const activePairs = new Set();

function pairKey(a, b) {
  return [a, b].sort().join("::");
}

function boxesOverlap(a, b) {
  return Math.abs(a.x - b.x) < SPRITE_W && Math.abs(a.y - b.y) < SPRITE_H;
}

function getChar(getCharacters, charId) {
  return getCharacters().find((c) => c.id === charId);
}

function isSwapped(ctx) {
  const c = getChar(ctx.getCharacters, ctx.charId);
  return !c || (c.scriptVersion || 0) !== ctx.startVersion;
}

// `moved` is the just-dispatched position of the sprite that moved, so the
// check evaluates exact post-move positions instead of whatever the store
// reader has flushed so far (readers can lag one step behind the dispatch).
export function checkCollisions(getCharacters, dispatch, moved) {
  const chars = getCharacters();
  const pos = (c) => (moved && moved.id === c.id ? { x: moved.x, y: moved.y } : c);
  for (let i = 0; i < chars.length; i++) {
    for (let j = i + 1; j < chars.length; j++) {
      const a = chars[i];
      const b = chars[j];
      const key = pairKey(a.id, b.id);
      if (boxesOverlap(pos(a), pos(b))) {
        if (activePairs.has(key)) continue;
        if (Date.now() - lastSwapAt < 800) continue;
        activePairs.add(key);
        lastSwapAt = Date.now();
        dispatch(swapScripts(a.id, b.id));
        [a.id, b.id].forEach((id) => {
          setTimeout(() => dispatch(setFlash(id, false)), 700);
        });
      } else {
        if (activePairs.has(key)) activePairs.delete(key);
      }
    }
  }
}

// Runs one block. Returns false when a collision swap happened mid-block,
// signalling the caller to abort and restart with the new live script.
async function runBlock(block, ctx) {
  const { dispatch, charId, getCharacters } = ctx;
  const p = block.params || {};
  switch (block.kind) {
    case "move": {
      const c = getChar(getCharacters, charId);
      if (c) {
        const target = clampToStage(c.x + (Number(p.steps) || 0), c.y);
        dispatch(setPosition(charId, target.x, target.y));
        checkCollisions(getCharacters, dispatch, { id: charId, x: target.x, y: target.y });
      } else {
        checkCollisions(getCharacters, dispatch);
      }
      await sleep(180);
      return true;
    }
    case "turn": {
      dispatch(turnSprite(charId, Number(p.degrees) || 0));
      await sleep(150);
      return true;
    }
    case "goto": {
      const target = clampToStage(Number(p.x) || 0, Number(p.y) || 0);
      dispatch(setPosition(charId, target.x, target.y));
      checkCollisions(getCharacters, dispatch, { id: charId, x: target.x, y: target.y });
      await sleep(180);
      return true;
    }
    case "say":
    case "think": {
      const secs = Math.max(0, Number(p.secs) || 0);
      dispatch(setBubble(charId, { kind: block.kind, text: String(p.text ?? "") }));
      await sleep(secs * 1000);
      dispatch(clearBubble(charId));
      await sleep(120);
      return true;
    }
    case "repeat": {
      const count = Math.max(0, Math.floor(Number(p.count) || 0));
      for (let i = 0; i < count; i++) {
        for (const inner of block.inner || []) {
          if (isSwapped(ctx)) return false;
          const ok = await runBlock(inner, ctx);
          if (!ok) return false;
        }
      }
      return true;
    }
    default:
      return true;
  }
}

export async function runOne(dispatch, getCharacters, charId, block) {
  const c = getChar(getCharacters, charId);
  await runBlock(block, {
    dispatch,
    charId,
    getCharacters,
    startVersion: (c && c.scriptVersion) || 0,
  });
  dispatch(logRun(block.kind, block.params, charId));
}

// Runs a sprite's script. If a collision swap lands mid-run, the stale run
// aborts and restarts from the newly swapped live script, so motion visibly
// reverses within the same Play press instead of on the next one.
export async function runScript(dispatch, getCharacters, charId) {
  for (let attempt = 0; attempt < MAX_RESTARTS; attempt++) {
    const char0 = getChar(getCharacters, charId);
    if (!char0) return;
    const startVersion = char0.scriptVersion || 0;
    const snapshot = char0.script || [];
    const ctx = { dispatch, charId, getCharacters, startVersion };
    let aborted = false;
    for (let i = 0; i < snapshot.length; i++) {
      if (isSwapped(ctx)) {
        aborted = true;
        break;
      }
      const block = snapshot[i];
      const ok = await runBlock(block, ctx);
      dispatch(logRun(block.kind, block.params, charId));
      if (!ok || isSwapped(ctx)) {
        aborted = true;
        break;
      }
      await sleep(120);
    }
    if (!aborted) return;
    await sleep(120);
  }
}

let runEpoch = 0;
let running = false;

export async function runAll(dispatch, getCharacters, characters) {
  if (running) return false;
  running = true;
  runEpoch += 1;
  const epoch = runEpoch;
  try {
    await Promise.all(characters.map((c) => runScript(dispatch, getCharacters, c.id)));
  } finally {
    if (epoch === runEpoch) running = false;
  }
  return true;
}

export function isRunning() {
  return running;
}

export { describeBlock };
