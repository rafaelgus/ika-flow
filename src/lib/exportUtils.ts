import { toPng, toSvg } from 'html-to-image';

export interface ExportConfig {
  theme: string;
  lineWidth: number;
  borderWidth: number;
}

export async function exportSvg(config: ExportConfig) {
  try {
    const el = document.getElementById('mermaid-export-container');
    if (!el) return;
    
    const svgElement = el.querySelector('svg');
    if (!svgElement) return;

    // Clone the node to avoid mutating the live DOM
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Ensure styles are embedded if needed, or simply export the pure SVG
    // Add background rect if theme requires it
    const bg = getBgColor(config.theme);
    if (bg && bg !== 'transparent') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('fill', bg);
        clone.insertBefore(rect, clone.firstChild);
    }

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(clone);
    
    // Add name spaces
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    // Add xml declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    // Convert string to data URI
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'diagram.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error('Failed to export SVG:', e);
  }
}

function getBgColor(theme: string) {
  return theme === 'dark' || theme === 'forest' || theme === 'oceanic' || theme === 'dusk' || theme === 'rose' || theme === 'emerald' ? '#1e293b' : '#ffffff';
}

export async function copyImageToClipboard(config: ExportConfig): Promise<void> {
  const el = document.getElementById('mermaid-export-container');
  if (!el) throw new Error("Export container not found");
  
  // temporarily remove transition so html-to-image doesn't glitch
  const oldTransition = el.style.transition;
  el.style.transition = 'none';

  try {
    const dataUrl = await toPng(el, { 
      backgroundColor: getBgColor(config.theme),
      pixelRatio: 3,
      style: { transform: 'none', margin: '0' }
    });
    
    el.style.transition = oldTransition;

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
  } catch (err) {
    el.style.transition = oldTransition;
    console.error('Failed to copy PNG:', err);
    throw err;
  }
}

export async function exportPng(config: ExportConfig) {
  try {
    const el = document.getElementById('mermaid-export-container');
    if (!el) return;
    
    const oldTransition = el.style.transition;
    el.style.transition = 'none';

    const dataUrl = await toPng(el, { 
      backgroundColor: getBgColor(config.theme),
      pixelRatio: 3,
      style: { transform: 'none', margin: '0' }
    });
    
    el.style.transition = oldTransition;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'diagram.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    console.error('Failed to export PNG:', e);
  }
}
