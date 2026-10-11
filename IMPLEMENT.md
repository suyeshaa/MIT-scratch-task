## LLD: Scratch-like Visual Block Playground

1. Overview
- Three-pane editor: left palette of blocks, center workspace for scripts, right stage for characters.
- Stack: React + JS, Context + useReducer, native HTML5 drag-and-drop, Tailwind.
- No backend. All animation state lives in the client store, stage re-renders from state.

2. Modules
- catalog: single source of truth for block kinds, default params, colors, labels. Palette and workspace both render from it.
- palette: stateless list, plus a run button per Motion/Looks row that executes the block on the selected sprite. Emits drag payloads of shape {kind, params}. Inputs for steps, degrees, coordinates, message, seconds stop propagation so editing doesn't start a drag. Repeat drops with a fixed default count, editable inline in the workspace.
- workspace: renders the currently selected character's script. Handles drop for both copy (from palette) and move (reorder / cross-stack). Each row has run-one and remove. Go-to / say / think / repeat expose inline editors that dispatch an update for that instance.
- stage: renders every character. Each node is positioned with translate(x, y) and rotated with rotate(angle). Supports manual mouse drag (writes back deltas), click-to-select with opacity cue, and per-character say / think bubbles.
- toolbar: run selected, play all, add character, copy script to another sprite (deep clone with fresh ids), workspace / history toggle.
- store: Context + reducer. Holds characters, selection, history.
- engine: dispatcher + sequential runner + collision watcher.

3. Data model
- characters: [{id, x, y, angle, scriptVersion, script: [instance]}]
- selectedId: string
- history: [{kind, params, charId, at}]
- instance = {instanceId, kind, params}
- move: {steps} — horizontal-only (x += steps), negative allowed
- turn: {degrees}
- goto: {x, y}
- repeat: {count, inner: [instance]}
- say: {text, secs}, think: {text, secs}
- instanceId is generated on drop. Keys and updates use it, never kind + index, so duplicates are safe.
- Scripts are owned per character. Switching selection swaps which list the workspace edits. This keeps play-all and interaction features straightforward.

4. Drag and drop
- Payload: JSON {blockId?, kind, params, fromChar?, fromIndex?} on application/x-block.
- Drop: if fromChar missing → copy (create new instance). If present → remove from source list, insert at target index with same-stack index correction.
- Palette drag uses copy, workspace drag uses move.

5. Execution
- Dispatcher: kind -> handler({dispatch, charId, params, snapshot}).
- runOne: run handler, then append history in one place so all entry points stay consistent.
- runScript: loop blocks sequentially with a small inter-block gap. say / think show bubble with custom text and await full seconds. repeat iterates inner list count times.
- Swap reactivity: each character carries a scriptVersion bumped only by SWAP_SCRIPTS. The runner checks it before every block and every repeat iteration; on change it aborts the stale run and restarts from the newly swapped live script (bounded restarts), so motion visibly reverses within the same play press. Plain edits keep snapshot isolation.
- Stage gate: PreviewArea measures the stage box and publishes half-extents to the engine; move / go-to / manual drag targets are clamped so sprites never leave the container.
- runSelected: resolve selected character, run its script on it.
- runAll: fan out runScript per character concurrently, guarded by a run epoch so double-press doesn't interleave moves and history.
- Handlers only use charId + dispatch, re-reading position from reducer state to avoid stale closures in async loops.

6. Interaction on collision
- After every committed position change, run a pairwise bounding-box check (95x116 sprite footprint): overlapping boxes mean collision. The check evaluates exact post-move positions passed by the mover, so it never depends on store-read freshness.
- If boxes overlap (roughly touching sprites), swap the two characters' script arrays atomically, flash both nodes briefly, and append a swap entry to history.
- Debounce with a cooldown + active-pair set cleared on separation, so sustained contact produces a single swap.
- Typical demo: two characters start apart with opposed move values inside repeat, play-all drives them together, scripts exchange, motion visibly reverses.

7. History view
- Simple list rendering of history newest-last. Shows kind + params + character. Swap events appear inline. Empty state when nothing has run.

8. Edge cases
- Inputs inside draggable rows: draggable=false, onDragStart=preventDefault, click stops propagation.
- Empty script run is a no-op.
- Overlapping plays blocked by epoch guard.
- Manual drag during a run writes position but doesn't cancel the run; next move step continues from the new base.
- Small lists only, so pairwise checks and full re-renders are fine.

9. Verification
- Edit steps to -10, set repeat count, assign different scripts to two characters, play all, force contact, confirm scripts exchange and history reflects runs plus swap.
