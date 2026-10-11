import React, { useRef } from "react";
import Sidebar from "./components/Sidebar";
import MidArea from "./components/MidArea";
import PreviewArea from "./components/PreviewArea";
import Toolbar from "./components/Toolbar";
import { PlaygroundProvider, usePlayground } from "./store/PlaygroundContext";

function Shell() {
  const { state } = usePlayground();
  const ref = useRef(state.characters);
  ref.current = state.characters;
  const getCharacters = () => ref.current;

  return (
    <div className="bg-blue-100 h-screen font-sans">
      <Toolbar getCharacters={getCharacters} />
      <div className="h-full overflow-hidden flex flex-row">
        <div className="flex-1 h-full overflow-hidden flex flex-row bg-white border-t border-r border-gray-200 rounded-tr-xl mr-2">
          <Sidebar getCharacters={getCharacters} /> <MidArea getCharacters={getCharacters} />
        </div>
        <div className="w-1/2 h-full overflow-hidden flex flex-row bg-white border-t border-l border-gray-200 rounded-tl-xl ml-2">
          <PreviewArea getCharacters={getCharacters} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <PlaygroundProvider>
      <Shell />
    </PlaygroundProvider>
  );
}
