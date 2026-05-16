/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Sparkles, AlertCircle, Settings2, Download, Image as ImageIcon, LayoutTemplate, Copy, Undo2, Redo2, Loader2, Check } from 'lucide-react';
import { MermaidChart, MermaidConfig } from './components/MermaidChart';
import { generateMermaidCode, setApiKey, hasApiKey } from './lib/gemini';
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
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(hasApiKey());

  const [code, setCode] = useState(() => {
    try {
      const saved = localStorage.getItem('mermaid_code');
      return saved || DEFAULT_CODE;
    } catch (e) {
      return DEFAULT_CODE;
    }
  });

  const [history, setHistory] = useState<string[]>(() => [code]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  useEffect(() => {
    setSaveStatus('saving');
    let resetTimer: NodeJS.Timeout;
    
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('mermaid_code', code);
        setSaveStatus('saved');
        resetTimer = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error("Failed to save to localStorage", err);
        setSaveStatus('error');
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [code]);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied_md' | 'copied_img'>('idle');

  const [config, setConfig] = useState<MermaidConfig>({
    theme: 'dark',
    palette: 'default',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontColor: 'default',
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
          <div className="flex flex-col flex-1 overflow-hidden p-4 bg-[#1e2336] relative">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 h-6">
                Raw Mermaid Code
                <div 
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-widest uppercase border transition-all duration-200 ${
                    saveStatus === 'idle' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                  } ${
                    saveStatus === 'saving' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                    saveStatus === 'saved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {saveStatus === 'saving' && <Loader2 size={10} className="animate-spin" />}
                  {saveStatus === 'saved' && <Check size={10} />}
                  {saveStatus === 'error' && <AlertCircle size={10} />}
                  <span>{saveStatus === 'saving' ? 'Saving' : saveStatus === 'saved' ? 'Saved' : 'Error'}</span>
                </div>
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
            
            <div className="relative flex-1 w-full rounded-xl border border-[#343b58] bg-[#0f172a] shadow-inner focus-within:border-indigo-500 transition-colors overflow-hidden group">
              <div 
                ref={backdropRef}
                className="absolute inset-0 p-4 font-mono text-xs leading-relaxed whitespace-pre pointer-events-none overflow-hidden"
                aria-hidden="true"
              >
                {code.split('\n').map((line, i) => {
                   const isErrorLine = syntaxError && errorLine === i + 1;
                   return (
                     <div key={i} className={`${isErrorLine ? 'bg-red-500/30 ring-1 ring-red-500/50 rounded-sm' : ''} text-transparent w-max min-w-full h-[1.625em]`}>
                       <span className="opacity-0">{line || ' '}</span>
                     </div>
                   );
                })}
              </div>
              <textarea
                ref={textareaRef}
                className="absolute inset-0 w-full h-full resize-none p-4 font-mono text-xs text-indigo-200 outline-none leading-relaxed whitespace-pre bg-transparent"
                style={{ caretColor: 'white' }}
                value={code}
                onChange={handleCodeChange}
                onScroll={handleScroll}
                spellCheck={false}
              />
            </div>

            {syntaxError && (
              <div className="mt-3 bg-red-950/40 border border-red-500/30 rounded-lg p-3 text-xs text-red-300 max-h-32 overflow-y-auto shrink-0 shadow-lg">
                 <p className="font-semibold text-red-400 mb-1 flex items-center gap-1.5"><AlertCircle size={14} /> Syntax Error</p>
                 <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed">{syntaxError}</pre>
              </div>
            )}
          </div>
        </aside>

        {/* Right Canvas */}
        <section 
           className={`flex-1 overflow-auto relative bg-fixed flex flex-col transition-colors ${
             config.theme === 'dark' || config.theme === 'forest' || config.theme === 'oceanic' || config.theme === 'dusk' || config.theme === 'rose' || config.theme === 'emerald'
             ? "bg-[#1e293b] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"
             : "bg-[#f8fafc] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"
           }`}
        >
          
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-lg backdrop-blur-md">
              <AlertCircle size={14} />
              Mermaid is text-to-diagram. Editing is done via code or AI on the left.
            </div>
          </div>

          <div className="absolute inset-0 p-12">
            <MermaidChart 
               chart={code} 
               config={config} 
               onErrorChange={(err, line) => {
                 setSyntaxError(err);
                 setErrorLine(line);
               }} 
            />
          </div>
        </section>

        {/* Right Context Panel */}
        <aside className="w-72 bg-[#1e2336]/80 backdrop-blur-md border-l border-[#343b58] p-5 flex flex-col gap-6 shrink-0 overflow-y-auto">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <span className="font-bold text-sm tracking-tight">Properties</span>
            <Settings2 className="w-4 h-4 text-slate-400" />
          </div>

          <section className="space-y-6">
            {!hasKey && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-3">
                <label className="text-[10px] uppercase font-bold text-indigo-400 block">Gemini API Key</label>
                <input 
                  type="password"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-[#1e2336] border border-[#343b58] text-sm text-slate-200 rounded-lg p-2 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => {
                    if (apiKeyInput.trim()) {
                      setApiKey(apiKeyInput.trim());
                      setHasKey(true);
                      setApiKeyInput('');
                      setError(''); // Clear any previous API key errors
                    }
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Save Key
                </button>
                <p className="text-[10px] text-slate-400 leading-tight">Key is stored locally in your browser. Required for AI features.</p>
              </div>
            )}

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
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-3">Text Color</label>
              <div className="flex gap-2 flex-wrap">
                 {[
                   { label: 'Theme Default', value: 'default', colorClass: 'bg-transparent border border-slate-500' },
                   { label: 'White', value: '#ffffff', colorClass: 'bg-white' },
                   { label: 'Black', value: '#000000', colorClass: 'bg-black' },
                   { label: 'Slate', value: '#94a3b8', colorClass: 'bg-slate-400' },
                   { label: 'Indigo', value: '#818cf8', colorClass: 'bg-indigo-400' },
                   { label: 'Rose', value: '#fb7185', colorClass: 'bg-rose-400' },
                   { label: 'Emerald', value: '#34d399', colorClass: 'bg-emerald-400' },
                 ].map(c => (
                   <button 
                     key={c.value}
                     onClick={() => setConfig(prev => ({ ...prev, fontColor: c.value }))}
                     title={c.label}
                     className={`w-8 h-8 rounded-full shadow-sm transition-all flex items-center justify-center ${c.colorClass} ${
                       config.fontColor === c.value 
                        ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#1e2336] scale-110' 
                        : 'hover:scale-105'
                     }`}
                   >
                     {c.value === 'default' && <span className="text-[10px] font-bold text-slate-400">T</span>}
                   </button>
                 ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-3">Node Background</label>
              <div className="flex gap-2 flex-wrap">
                 {[
                   { label: 'Theme Default', value: 'default', colorClass: 'bg-transparent border border-slate-500' },
                   { label: 'Transparent', value: 'transparent', colorClass: 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMWUxZTFlIi8+CjxyZWN0IHg9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiMzMzMiLz4KPHJlY3QgeT0iNCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iIzMzMyIvPgo8cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMWUxZTFlIi8+Cjwvc3ZnPg==")]' },
                   { label: 'White', value: '#ffffff', colorClass: 'bg-white' },
                   { label: 'Black', value: '#000000', colorClass: 'bg-black' },
                   { label: 'Slate', value: '#1e293b', colorClass: 'bg-slate-800' },
                   { label: 'Indigo', value: '#4f46e5', colorClass: 'bg-indigo-600' },
                   { label: 'Rose', value: '#e11d48', colorClass: 'bg-rose-600' },
                   { label: 'Emerald', value: '#059669', colorClass: 'bg-emerald-600' },
                 ].map(c => (
                   <button 
                     key={c.value}
                     onClick={() => setConfig(prev => ({ ...prev, nodeBackground: c.value }))}
                     title={c.label}
                     className={`w-8 h-8 rounded-full shadow-sm transition-all flex items-center justify-center ${c.colorClass} ${
                       config.nodeBackground === c.value 
                        ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#1e2336] scale-110' 
                        : 'hover:scale-105'
                     }`}
                   >
                     {c.value === 'default' && <span className="text-[10px] font-bold text-slate-400">Bg</span>}
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

