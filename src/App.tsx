/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Play, Sparkles, AlertCircle, Settings2, Download, Image as ImageIcon, LayoutTemplate, Copy, Undo2, Redo2 } from 'lucide-react';
import { MermaidChart, MermaidConfig } from './components/MermaidChart';
import { generateMermaidCode } from './lib/gemini';
import { exportSvg, exportPng, copyImageToClipboard } from './lib/exportUtils';

const DIAGRAM_TEMPLATES = {
  flowchart: {
    label: 'Flowchart',
    description: 'Logic & flow',
    code: `graph TD
    A[Start] --> B{Is it a clone?}
    B -->|Yes| C[Using Mermaid.js]
    B -->|No| D[Build something else]
    C --> E[Add AI Gen]
    E --> F[Deploy]
`
  },
  sequence: {
    label: 'Sequence',
    description: 'API flows',
    code: `sequenceDiagram
    participant U as User
    participant A as App
    participant S as Server
    
    U->>A: Login Request
    A->>S: POST /auth
    S-->>A: Token
    A-->>U: Dashboard
`
  },
  class: {
    label: 'Class',
    description: 'OOP structure',
    code: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    class Animal{
      +int age
      +String gender
      +isMammal()
      +mate()
    }
    class Duck{
      +String beakColor
      +swim()
      +quack()
    }
    class Fish{
      -int sizeInFeet
      -canEat()
    }`
  },
  state: {
    label: 'State',
    description: 'State machine',
    code: `stateDiagram-v2
    [*] --> Still
    Still --> [*]
    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*]`
  },
  pie: {
    label: 'Pie',
    description: 'Distribution',
    code: `pie title Pets adopted
    "Dogs" : 386
    "Cats" : 85
    "Rats" : 15`
  },
  architecture: {
    label: 'Architecture',
    description: 'Systems config',
    code: `graph TB
    subgraph Cloud
        API[API Gateway]
        DB[(Database)]
        S3[[Object Store]]
    end
    Client([Client App]) --> API
    API --> DB
    API --> S3
`
  },
  er: {
    label: 'Entity-Rel',
    description: 'Data models',
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
`
  },
  mindmap: {
    label: 'Mindmap',
    description: 'Brainstorming',
    code: `mindmap
  root((Idea))
    Origins
      Popularisation
    Research
      On effectivness
    Tools
      Mermaid`
  },
  gantt: {
    label: 'Gantt',
    description: 'Project schedule',
    code: `gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1, 2026-05-12, 30d
    Another task     :after a1  , 20d
    section Another
    Task in sec      :2026-05-16  , 12d`
  },
  requirement: {
    label: 'Requirement',
    description: 'Requirements',
    code: `requirementDiagram
    requirement test_req {
    id: 1
    text: the test text.
    risk: high
    verifymethod: test
    }
    element test_entity {
    type: simulation
    }
    test_entity - satisfies -> test_req`
  }
};

const DEFAULT_CODE = DIAGRAM_TEMPLATES.flowchart.code;

export default function App() {
  const [history, setHistory] = useState<string[]>([DEFAULT_CODE]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [code, setCode] = useState(DEFAULT_CODE);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied_md' | 'copied_img'>('idle');

  const [config, setConfig] = useState<MermaidConfig>({
    theme: 'dark',
    palette: 'default',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    lineWidth: 1,
    borderWidth: 1,
  });

  const pushToHistory = (newCode: string) => {
    setCode(newCode);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newCode);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError('');
    
    try {
      const newCode = await generateMermaidCode(prompt, code);
      pushToHistory(newCode);
      setPrompt(''); // clear prompt on success
    } catch (err: any) {
      setError(err?.message || 'Something went wrong while generating the diagram.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      const mdCode = "```mermaid\n" + code + "\n```";
      await navigator.clipboard.writeText(mdCode);
      setCopyStatus('copied_md');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      setError('Failed to copy markdown to clipboard.');
    }
  };

  const handleCopyImage = async () => {
    try {
      await copyImageToClipboard(config);
      setCopyStatus('copied_img');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      setError('Failed to copy image to clipboard.');
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCode(history[newIndex]);
    }
  };

  const debounceTimerUrl = useRef<number | null>(null);
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    
    if (debounceTimerUrl.current) clearTimeout(debounceTimerUrl.current);
    debounceTimerUrl.current = window.setTimeout(() => {
       if (val !== history[historyIndex]) {
         const newHistory = history.slice(0, historyIndex + 1);
         newHistory.push(val);
         if (newHistory.length > 50) newHistory.shift();
         setHistory(newHistory);
         setHistoryIndex(newHistory.length - 1);
       }
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0f172a] text-slate-100 font-sans relative">
      {/* Mesh Gradient Background Elements */}
      <div className="fixed top-[-100px] left-[-100px] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-50px] right-[-50px] w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <header className="flex h-16 shrink-0 items-center justify-between px-6 bg-[#1e2336] border-b border-indigo-500/20 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">IKA<span className="text-indigo-400">-flow</span></span>
        </div>

        <div className="flex items-center bg-[#0f172a] border border-white/10 rounded-lg p-1 gap-1">
          <button 
             onClick={() => exportPng(config)}
             title="Export PNG"
             className="px-3 py-1.5 hover:bg-white/10 rounded-md text-xs font-semibold tracking-wider transition-colors flex items-center gap-2 text-slate-300"
          >
             <Download size={14} /> PNG
          </button>
          <button 
             onClick={() => exportSvg(config)}
             title="Export SVG"
             className="px-3 py-1.5 hover:bg-white/10 rounded-md text-xs font-semibold tracking-wider transition-colors flex items-center gap-2 text-slate-300"
          >
             <Download size={14} /> SVG
          </button>
          <div className="w-px h-4 bg-white/10 mx-1"></div>
          <button 
             onClick={handleCopyImage}
             className="px-3 py-1.5 hover:bg-white/10 rounded-md text-xs font-semibold tracking-wider transition-colors flex items-center gap-2 text-slate-300 w-[120px] justify-center"
          >
             <ImageIcon size={14} /> {copyStatus === 'copied_img' ? 'COPIED!' : 'COPY IMAGE'}
          </button>
          <button 
             onClick={handleCopyMarkdown}
             className="px-3 py-1.5 hover:bg-white/10 rounded-md text-xs font-semibold tracking-wider transition-colors flex items-center gap-2 text-slate-300 w-[140px] justify-center"
          >
             <Copy size={14} /> {copyStatus === 'copied_md' ? 'COPIED!' : 'COPY MARKDOWN'}
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden z-10">
        {/* Left Sidebar */}
        <aside className="w-[360px] flex flex-col border-r border-[#343b58] bg-[#1e2336]/80 backdrop-blur-md z-10 shrink-0 max-w-full overflow-hidden">
          {/* Templates Section */}
          <div className="p-4 border-b border-white/5 bg-[#171a29]/50 shrink-0">
             <div className="flex items-center gap-2 mb-3 text-slate-400">
               <LayoutTemplate size={14} />
               <label className="text-xs font-bold uppercase tracking-wider text-indigo-300">Sample Diagrams</label>
             </div>
             <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto">
                {Object.entries(DIAGRAM_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => pushToHistory(template.code)}
                    className="px-2.5 py-1.5 rounded-md bg-[#252b42] hover:bg-indigo-600 border border-[#343b58] hover:border-indigo-500 transition-colors text-xs font-medium text-slate-300 hover:text-white"
                  >
                    {template.label}
                  </button>
                ))}
             </div>
          </div>

          {/* AI Prompt Section */}
          <div className="flex flex-col gap-3 p-4 shrink-0 border-b border-white/5 bg-black/10">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Generate / Modify with AI
            </label>
            <textarea
              className="min-h-[100px] w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none text-slate-100 shadow-sm transition-shadow backdrop-blur-md"
              placeholder="E.g., Make a sequence diagram showing user checkout flow..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleGenerate();
                }
              }}
            />
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}
            <button
              disabled={isGenerating || !prompt.trim()}
              onClick={handleGenerate}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-lg shadow-indigo-600/20 uppercase tracking-wider"
            >
              {isGenerating ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Thinking...
                </>
              ) : (
                <>
                  <Play size={14} />
                  Generate (Cmd+Enter)
                </>
              )}
            </button>
          </div>

          {/* Code Editor Section */}
          <div className="flex flex-col flex-1 overflow-hidden p-4 bg-[#1e2336]">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Raw Mermaid Code
              </label>
              <div className="flex gap-1">
                <button 
                   onClick={handleUndo} 
                   disabled={historyIndex === 0}
                   className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 disabled:opacity-30 transition-colors"
                >
                  <Undo2 size={16} />
                </button>
                <button 
                   onClick={handleRedo} 
                   disabled={historyIndex === history.length - 1}
                   className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 disabled:opacity-30 transition-colors"
                >
                  <Redo2 size={16} />
                </button>
              </div>
            </div>
            <textarea
              className="flex-1 w-full resize-none rounded-xl border border-[#343b58] bg-[#0f172a] p-4 font-mono text-xs text-indigo-200 shadow-inner focus:border-indigo-500 focus:outline-none leading-relaxed"
              value={code}
              onChange={handleCodeChange}
              spellCheck={false}
            />
          </div>
        </aside>

        {/* Right Canvas */}
        <section className="flex-1 overflow-auto relative bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed flex flex-col">
          
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg backdrop-blur-md">
              <AlertCircle size={14} />
              Mermaid is text-to-diagram. Editing is done via code or AI on the left.
            </div>
          </div>

          <div className="absolute inset-0 p-12">
            <MermaidChart chart={code} config={config} />
          </div>
        </section>

        {/* Right Context Panel */}
        <aside className="w-72 bg-[#1e2336]/80 backdrop-blur-md border-l border-[#343b58] p-5 flex flex-col gap-6 shrink-0 overflow-y-auto">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <span className="font-bold text-sm tracking-tight">Properties</span>
            <Settings2 className="w-4 h-4 text-slate-400" />
          </div>

          <section className="space-y-6">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-3">Color Palette</label>
              <div className="grid grid-cols-2 gap-2">
                {(['default', 'oceanic', 'dusk', 'rose', 'emerald'] as const).map(p => (
                  <button 
                    key={p}
                    onClick={() => setConfig(prev => ({ ...prev, palette: p }))}
                    className={`h-9 rounded-lg flex items-center justify-center text-[10px] uppercase font-bold tracking-wider transition-colors border ${
                      config.palette === p 
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/20' 
                        : 'bg-[#252b42] border-[#343b58] text-slate-300 hover:bg-[#2d3450]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-3">Base Theme</label>
              <div className="grid grid-cols-2 gap-2">
                {(['dark', 'default', 'forest', 'neutral'] as const).map(t => (
                  <button 
                    key={t}
                    onClick={() => setConfig(prev => ({ ...prev, theme: t }))}
                    className={`h-9 rounded-lg cursor-pointer flex items-center justify-center text-[10px] uppercase font-bold tracking-wider transition-colors border ${
                      config.theme === t 
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/20' 
                        : 'bg-[#252b42] border-[#343b58] text-slate-300 hover:bg-[#2d3450]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-3">Font Family</label>
              <div className="flex flex-col gap-2">
                 {[
                   { label: 'Sans-Serif (Modern)', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
                   { label: 'Monospace (Code)', value: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace' },
                   { label: 'Serif (Classic)', value: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }
                 ].map(f => (
                   <button 
                     key={f.label}
                     onClick={() => setConfig(prev => ({ ...prev, fontFamily: f.value }))}
                     className={`py-2 px-3 rounded-lg text-xs font-medium text-left transition-colors border ${
                       config.fontFamily === f.value 
                        ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/50 shadow-inner' 
                        : 'bg-[#252b42] border-[#343b58] text-slate-300 hover:bg-[#2d3450]'
                     }`}
                     style={{ fontFamily: f.value }}
                   >
                     {f.label}
                   </button>
                 ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 flex justify-between mb-3">
                <span>Line Thickness</span>
                <span className="text-indigo-400">{config.lineWidth}px</span>
              </label>
              <input 
                type="range" 
                min="1" max="5" step="1"
                value={config.lineWidth}
                onChange={(e) => setConfig(prev => ({ ...prev, lineWidth: Number(e.target.value) }))}
                className="w-full h-1.5 bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none" 
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 flex justify-between mb-3">
                <span>Border Thickness</span>
                <span className="text-indigo-400">{config.borderWidth}px</span>
              </label>
              <input 
                type="range" 
                min="0" max="8" step="1"
                value={config.borderWidth}
                onChange={(e) => setConfig(prev => ({ ...prev, borderWidth: Number(e.target.value) }))}
                className="w-full h-1.5 bg-[#0f172a] rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none" 
              />
            </div>
          </section>

          <div className="mt-auto pt-6">
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 backdrop-blur-sm">
               <div className="flex items-center gap-2 mb-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                 <span className="text-[10px] font-bold tracking-wider text-emerald-400">LIVE PREVIEW</span>
               </div>
               <p className="text-[11px] text-slate-400 italic leading-relaxed">Changes you make are reflected in the canvas instantly.</p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

