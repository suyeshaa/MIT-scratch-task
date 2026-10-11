import React, { useState } from "react";
import { usePlayground } from "../store/PlaygroundContext";
import { addCharacter, copyScript } from "../store/actions";
import { runScript, runAll } from "../runner/engine";

export default function Toolbar({ getCharacters }) {
  const { state, dispatch } = usePlayground();
  const selected = state.characters.find((c) => c.id === state.selectedId);
  const others = state.characters.filter((c) => !selected || c.id !== selected.id);
  const [copyTarget, setCopyTarget] = useState("");

  const playAll = async () => {
    await runAll(dispatch, getCharacters, state.characters);
  };

  const runSelected = async () => {
    if (!selected || !selected.script.length) return;
    await runScript(dispatch, getCharacters, selected.id);
  };

  const copyScriptTo = () => {
    if (!selected || !copyTarget) return;
    dispatch(copyScript(selected.id, copyTarget));
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 flex-wrap">
      <button
        onClick={playAll}
        title="Play: run all sprites"
        className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-3 py-1.5 rounded"
      >
        <span>▶</span> Play
      </button>
      <button
        onClick={runSelected}
        title="Run selected sprite script"
        className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded"
      >
        Run selected
      </button>
      <button
        onClick={() => dispatch(addCharacter())}
        className="bg-purple-500 hover:bg-purple-600 text-white text-sm px-3 py-1.5 rounded"
      >
        + Sprite
      </button>
      <div className="flex items-center gap-1 ml-1">
        <select
          value={others.some((c) => c.id === copyTarget) ? copyTarget : ""}
          onChange={(e) => setCopyTarget(e.target.value)}
          title="Copy this script onto another sprite"
          className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-700 outline-none"
        >
          <option value="">Copy script to…</option>
          {others.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={copyScriptTo}
          disabled={!selected || !selected.script.length || !copyTarget}
          title="Duplicate the selected sprite's script onto the chosen sprite"
          className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white text-sm px-3 py-1.5 rounded"
        >
          Copy
        </button>
      </div>
      <div className="text-xs text-gray-500 ml-2">
        {selected ? `Editing: ${selected.name}` : "No sprite selected"}
      </div>
    </div>
  );
}
