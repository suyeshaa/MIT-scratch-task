// Single source of truth for store action types and creators, so call
// sites never hand-build action objects (and typos fail loudly in one
// place instead of silently hitting the reducer's default case).

export const ActionTypes = Object.freeze({
  SELECT: "SELECT",
  ADD_CHARACTER: "ADD_CHARACTER",
  ADD_BLOCK: "ADD_BLOCK",
  MOVE_BLOCK: "MOVE_BLOCK",
  REMOVE_BLOCK: "REMOVE_BLOCK",
  UPDATE_BLOCK: "UPDATE_BLOCK",
  TURN: "TURN",
  SET_POS: "SET_POS",
  SET_BUBBLE: "SET_BUBBLE",
  CLEAR_BUBBLE: "CLEAR_BUBBLE",
  SET_FLASH: "SET_FLASH",
  SWAP_SCRIPTS: "SWAP_SCRIPTS",
  LOG: "LOG",
  CLEAR_HISTORY: "CLEAR_HISTORY",
  COPY_SCRIPT: "COPY_SCRIPT",
  SET_VIEW: "SET_VIEW",
});

export const selectSprite = (id) => ({ type: ActionTypes.SELECT, id });

export const addCharacter = () => ({ type: ActionTypes.ADD_CHARACTER });

export const addBlock = ({ charId, block, index, parentRepeatId = null }) => ({
  type: ActionTypes.ADD_BLOCK,
  charId,
  block,
  index,
  parentRepeatId,
});

export const moveBlock = ({ fromChar, toChar, instanceId, index, parentRepeatId = null }) => ({
  type: ActionTypes.MOVE_BLOCK,
  fromChar,
  toChar,
  instanceId,
  index,
  parentRepeatId,
});

export const removeBlock = (charId, instanceId) => ({
  type: ActionTypes.REMOVE_BLOCK,
  charId,
  instanceId,
});

export const updateBlock = (charId, instanceId, params) => ({
  type: ActionTypes.UPDATE_BLOCK,
  charId,
  instanceId,
  params,
});

export const turnSprite = (charId, degrees) => ({
  type: ActionTypes.TURN,
  charId,
  degrees,
});

export const setPosition = (charId, x, y) => ({
  type: ActionTypes.SET_POS,
  charId,
  x,
  y,
});

export const setBubble = (charId, bubble) => ({
  type: ActionTypes.SET_BUBBLE,
  charId,
  bubble,
});

export const clearBubble = (charId) => ({
  type: ActionTypes.CLEAR_BUBBLE,
  charId,
});

export const setFlash = (charId, flash) => ({
  type: ActionTypes.SET_FLASH,
  charId,
  flash,
});

export const swapScripts = (aId, bId) => ({
  type: ActionTypes.SWAP_SCRIPTS,
  aId,
  bId,
});

export const logRun = (kind, params, charId) => ({
  type: ActionTypes.LOG,
  entry: { type: "run", kind, params, charId, at: Date.now() },
});

export const clearHistory = () => ({ type: ActionTypes.CLEAR_HISTORY });

export const copyScript = (fromId, toId) => ({
  type: ActionTypes.COPY_SCRIPT,
  fromId,
  toId,
});

export const setView = (view) => ({ type: ActionTypes.SET_VIEW, view });
