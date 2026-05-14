import mermaid from 'mermaid';
import { useEffect, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { ZoomIn, ZoomOut, Expand } from 'lucide-react';

export interface MermaidConfig {
  theme: 'default' | 'dark' | 'forest' | 'neutral';
  palette: 'default' | 'oceanic' | 'dusk' | 'rose' | 'emerald';
  fontFamily: string;
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
    tertiaryColor: '#e0f2fe',
    nodeBorder: '#0369a1',
    clusterBkg: '#082f49',
    clusterBorder: '#0369a1',
    edgeLabelBackground: '#082f49',
    background: '#0ea5e9'
  },
  dusk: {
    primaryColor: '#7c3aed',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#5b21b6',
    lineColor: '#a78bfa',
    secondaryColor: '#8b5cf6',
    tertiaryColor: '#ede9fe',
    nodeBorder: '#5b21b6',
    clusterBkg: '#2e1065',
    clusterBorder: '#5b21b6',
    edgeLabelBackground: '#2e1065',
    background: '#8b5cf6'
  },
  rose: {
    primaryColor: '#e11d48',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#be123c',
    lineColor: '#fb7185',
    secondaryColor: '#f43f5e',
    tertiaryColor: '#ffe4e6',
    nodeBorder: '#be123c',
    clusterBkg: '#4c0519',
    clusterBorder: '#be123c',
    edgeLabelBackground: '#4c0519',
    background: '#f43f5e'
  },
  emerald: {
    primaryColor: '#059669',
    primaryTextColor: '#ffffff',
    primaryBorderColor: '#047857',
    lineColor: '#34d399',
    secondaryColor: '#10b981',
    tertiaryColor: '#d1fae5',
    nodeBorder: '#047857',
    clusterBkg: '#022c22',
    clusterBorder: '#047857',
    edgeLabelBackground: '#022c22',
    background: '#10b981'
  }
};

interface MermaidChartProps {
  chart: string;
  config: MermaidConfig;
}

export function MermaidChart({ chart, config }: MermaidChartProps) {
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
        }
        return;
      }

      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: config.theme,
          themeVariables: config.palette !== 'default' ? PALETTES[config.palette] : undefined,
          securityLevel: 'loose',
          fontFamily: config.fontFamily
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        
        let measureContainer = document.getElementById('mermaid-measure-container');
        if (!measureContainer) {
          measureContainer = document.createElement('div');
          measureContainer.id = 'mermaid-measure-container';
          measureContainer.style.position = 'absolute';
          measureContainer.style.top = '-9999px';
          measureContainer.style.left = '-9999px';
          document.body.appendChild(measureContainer);
        }

        const { svg: generatedSvg } = await mermaid.render(id, chart, measureContainer);
        measureContainer.innerHTML = ''; // Clean up after render
        
        if (isMounted) {
          setSvg(generatedSvg);
          setError('');
        }
      } catch (err: any) {
        if (isMounted) {
          // Mermaid often throws errors with a lot of HTML/CSS info.
          // Let's grab the actual message if possible.
          setError(err?.message || 'Syntax Error in Mermaid diagram');
          console.error('Mermaid render error:', err);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, config]);

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
      <style>{`
        .mermaid-wrapper .edgePath .path,
        .mermaid-wrapper .flowchart-link,
        .mermaid-wrapper .messageLine0,
        .mermaid-wrapper .messageLine1,
        .mermaid-wrapper .actor-line,
        .mermaid-wrapper path.transition,
        .mermaid-wrapper path.relation {
            stroke-width: ${config.lineWidth}px !important;
        }
        
        .mermaid-wrapper .node rect,
        .mermaid-wrapper .node circle,
        .mermaid-wrapper .node ellipse,
        .mermaid-wrapper .node polygon,
        .mermaid-wrapper .node path,
        .mermaid-wrapper .actor,
        .mermaid-wrapper .note,
        .mermaid-wrapper .cluster rect,
        .mermaid-wrapper .pieCircle,
        .mermaid-wrapper .classGroup rect {
            stroke-width: ${config.borderWidth}px !important;
        }
      `}</style>
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
              <div className="absolute bottom-6 right-6 flex items-center gap-1 z-50 bg-[#1e2336]/90 p-1.5 rounded-lg border border-[#343b58] backdrop-blur-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
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
