import mermaid from 'mermaid';
import { useEffect, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Expand } from 'lucide-react';

export interface MermaidConfig {
  theme: 'default' | 'dark' | 'forest' | 'neutral';
  palette: 'default' | 'oceanic' | 'dusk' | 'rose' | 'emerald';
  fontFamily: string;
  fontColor: string;
  lineWidth: number;
  borderWidth: number;
}

const PALETTES: Record<string, any> = {
  oceanic: {
    primaryColor: '#0284c7',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#0369a1',
    lineColor: '#38bdf8',
    secondaryColor: '#0ea5e9',
    tertiaryColor: '#075985',
    nodeBorder: '#0369a1',
    clusterBkg: '#082f49',
    clusterBorder: '#0369a1',
    edgeLabelBackground: 'transparent',
    background: '#0ea5e9'
  },
  dusk: {
    primaryColor: '#7c3aed',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#5b21b6',
    lineColor: '#a78bfa',
    secondaryColor: '#8b5cf6',
    tertiaryColor: '#4c1d95',
    nodeBorder: '#5b21b6',
    clusterBkg: '#2e1065',
    clusterBorder: '#5b21b6',
    edgeLabelBackground: 'transparent',
    background: '#8b5cf6'
  },
  rose: {
    primaryColor: '#e11d48',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#be123c',
    lineColor: '#fb7185',
    secondaryColor: '#f43f5e',
    tertiaryColor: '#881337',
    nodeBorder: '#be123c',
    clusterBkg: '#4c0519',
    clusterBorder: '#be123c',
    edgeLabelBackground: 'transparent',
    background: '#f43f5e'
  },
  emerald: {
    primaryColor: '#059669',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#047857',
    lineColor: '#34d399',
    secondaryColor: '#10b981',
    tertiaryColor: '#064e3b',
    nodeBorder: '#047857',
    clusterBkg: '#022c22',
    clusterBorder: '#047857',
    edgeLabelBackground: 'transparent',
    background: '#10b981'
  }
};

interface MermaidChartProps {
  chart: string;
  config: MermaidConfig;
  onErrorChange?: (error: string | null, line: number | null) => void;
}

export function MermaidChart({ chart, config, onErrorChange }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      if (!chart.trim()) {
        if (isMounted) {
          setSvg('');
          setError('');
          if (onErrorChange) onErrorChange(null, null);
        }
        return;
      }

      try {
        let themeVars: any = config.palette !== 'default' ? { ...PALETTES[config.palette] } : {};
        if (config.fontColor && config.fontColor !== 'default') {
          themeVars.textColor = config.fontColor;
          themeVars.nodeTextColor = config.fontColor;
          themeVars.edgeLabelText = config.fontColor;
          themeVars.actorTextColor = config.fontColor;
          themeVars.noteTextColor = config.fontColor;
          themeVars.taskTextColor = config.fontColor;
          themeVars.stateLabelColor = config.fontColor;
          themeVars.pieTitleTextSize = undefined; 
          themeVars.labelTextColor = config.fontColor;
          themeVars.classText = config.fontColor;
          themeVars.titleColor = config.fontColor;
        }

        mermaid.initialize({
          startOnLoad: false,
          theme: config.theme,
          themeVariables: Object.keys(themeVars).length > 0 ? themeVars : undefined,
          securityLevel: 'loose',
          fontFamily: config.fontFamily,
          flowchart: { htmlLabels: true },
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        
        // Use a persistent measurement container in the body so Mermaid can read font metrics natively
        let measureContainer = document.getElementById('mermaid-measure-container');
        if (!measureContainer) {
          measureContainer = document.createElement('div');
          measureContainer.id = 'mermaid-measure-container';
          measureContainer.style.position = 'absolute';
          measureContainer.style.top = '-9999px';
          measureContainer.style.left = '-9999px';
          measureContainer.style.visibility = 'hidden';
          document.body.appendChild(measureContainer);
        }

        const { svg: generatedSvg } = await mermaid.render(id, chart, measureContainer);
        measureContainer.innerHTML = ''; // Clean up after render

        const injectedStyles = `
          <style>
            ${config.fontColor && config.fontColor !== 'default' ? `
            svg[id^="mermaid-"] .nodeLabel, 
            svg[id^="mermaid-"] .edgeLabel,
            svg[id^="mermaid-"] .node .label,
            svg[id^="mermaid-"] text,
            svg[id^="mermaid-"] span {
                color: ${config.fontColor} !important;
                fill: ${config.fontColor} !important;
            }
            ` : ''}

            svg[id^="mermaid-"] .edgePath .path,
            svg[id^="mermaid-"] .flowchart-link,
            svg[id^="mermaid-"] .messageLine0,
            svg[id^="mermaid-"] .messageLine1,
            svg[id^="mermaid-"] .actor-line,
            svg[id^="mermaid-"] path.transition,
            svg[id^="mermaid-"] path.relation {
                stroke-width: ${config.lineWidth}px !important;
            }
            
            svg[id^="mermaid-"] .node rect,
            svg[id^="mermaid-"] .node circle,
            svg[id^="mermaid-"] .node ellipse,
            svg[id^="mermaid-"] .node polygon,
            svg[id^="mermaid-"] .node path,
            svg[id^="mermaid-"] .label-container,
            svg[id^="mermaid-"] .actor,
            svg[id^="mermaid-"] .note,
            svg[id^="mermaid-"] .pieCircle {
                stroke-width: ${config.borderWidth}px !important;
            }

            svg[id^="mermaid-"] .cluster rect,
            svg[id^="mermaid-"] .cluster polygon,
            svg[id^="mermaid-"] .cluster path,
            svg[id^="mermaid-"] .cluster .label-container {
                fill: none !important;
                stroke: none !important;
                stroke-width: 0 !important;
                opacity: 0 !important;
            }
          </style>
        `;
        
        const styledSvg = generatedSvg.replace(/<svg([^>]*)>/i, `<svg$1>\n${injectedStyles}\n`);

        if (isMounted) {
          setSvg(styledSvg);
          setError('');
          if (onErrorChange) onErrorChange(null, null);
        }
      } catch (err: any) {
        if (isMounted) {
          // Mermaid often throws errors with a lot of HTML/CSS info.
          // Let's grab the actual message if possible.
          let errorMsg = err?.message || err?.str || 'Syntax Error in Mermaid diagram';
          
          let lineMatch = null;
          if (err?.hash?.loc?.first_line) {
             lineMatch = err.hash.loc.first_line;
          } else {
             const regex = /Parse error on line (\d+)/i;
             const match = errorMsg.match(regex);
             if (match) {
                 lineMatch = parseInt(match[1], 10);
             }
          }
          
          // Remove overly huge SVGs or HTML chunks some mermaid versions embed in error
          if (errorMsg.includes('<svg') && errorMsg.includes('</svg>')) {
             errorMsg = errorMsg.replace(/<svg[\s\S]*?<\/svg>/gi, '[Visual Error Rendered]');
          }
          
          setError(errorMsg);
          if (onErrorChange) onErrorChange(errorMsg, lineMatch);
          console.error('Mermaid render error:', err);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, config, onErrorChange]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 rounded-md p-4 w-full max-w-2xl overflow-auto text-sm border border-red-200">
          <p className="font-semibold mb-2">Mermaid Syntax Error:</p>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      </div>
    );
  }

  if (!chart.trim()) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-400">
        <p>No diagram to render. Enter a prompt or type some Mermaid code.</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full cursor-move overflow-hidden relative group">
        <TransformWrapper
          initialScale={1}
          minScale={0.1}
          maxScale={50}
          centerOnInit={true}
          limitToBounds={false}
          wheel={{ step: 0.1 }}
          panning={{ velocityDisabled: true }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="absolute bottom-6 right-6 flex items-center gap-1 z-50 bg-[#1e2336]/90 p-1.5 rounded-lg border border-[#343b58] backdrop-blur-md shadow-lg">
                <button 
                  onClick={() => zoomIn(0.2)} 
                  className="p-1.5 rounded-md hover:bg-white/10 text-slate-300 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1"></div>
                <button 
                  onClick={() => zoomOut(0.2)} 
                  className="p-1.5 rounded-md hover:bg-white/10 text-slate-300 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1"></div>
                <button 
                  onClick={() => resetTransform()} 
                  className="p-1.5 rounded-md hover:bg-white/10 text-slate-300 transition-colors"
                  title="Reset Zoom"
                >
                  <Expand size={18} />
                </button>
              </div>
              <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full flex items-center justify-center">
                <div 
                  id="mermaid-export-container"
                  ref={containerRef}
                  className="mermaid-wrapper flex items-center justify-center [&>svg]:max-w-none [&>svg]:max-h-none"
                  dangerouslySetInnerHTML={{ __html: svg }} 
                />
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </>
  );
}
