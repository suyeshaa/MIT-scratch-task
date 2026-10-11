export const BLOCK_DEFS = {
  move: {
    kind: "move",
    category: "motion",
    color: "bg-blue-500",
    label: "Move steps",
    defaults: { steps: 10 },
  },
  turn: {
    kind: "turn",
    category: "motion",
    color: "bg-blue-500",
    label: "Turn degrees",
    defaults: { degrees: 15 },
  },
  goto: {
    kind: "goto",
    category: "motion",
    color: "bg-blue-500",
    label: "Go to x y",
    defaults: { x: 0, y: 0 },
  },
  repeat: {
    kind: "repeat",
    category: "controls",
    color: "bg-orange-500",
    label: "Repeat",
    defaults: { count: 12 },
  },
  say: {
    kind: "say",
    category: "looks",
    color: "bg-purple-500",
    label: "Say for seconds",
    defaults: { text: "Hello!", secs: 2 },
  },
  think: {
    kind: "think",
    category: "looks",
    color: "bg-purple-500",
    label: "Think for seconds",
    defaults: { text: "Hmm...", secs: 2 },
  },
};

export function describeBlock(block) {
  const p = block.params || {};
  switch (block.kind) {
    case "move":
      return `Move ${p.steps} steps`;
    case "turn":
      return `Turn ${p.degrees}°`;
    case "goto":
      return `Go to x:${p.x} y:${p.y}`;
    case "repeat":
      return `Repeat ${p.count}x`;
    case "say":
      return `Say "${p.text}" ${p.secs}s`;
    case "think":
      return `Think "${p.text}" ${p.secs}s`;
    default:
      return block.kind;
  }
}

export const DRAG_MIME = "application/x-block";
