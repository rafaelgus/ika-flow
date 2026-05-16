export interface ExportConfig {
  theme: string;
  lineWidth: number;
  borderWidth: number;
}

function getBgColor(theme: string) {
  return theme === 'dark' || theme === 'forest' || theme === 'oceanic' || theme === 'dusk' || theme === 'rose' || theme === 'emerald' ? '#1e293b' : '#ffffff';
}

function getSvgDataUrlForExport(config: ExportConfig, el: HTMLElement): string {
    const svgElement = el.querySelector('svg');
    if (!svgElement) throw new Error("SVG not found");

    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    
    // Set explicit dimensions if possible
    const boundingBox = svgElement.getBoundingClientRect();
    clone.setAttribute('width', boundingBox.width.toString());
    clone.setAttribute('height', boundingBox.height.toString());
    
    const styleTags = el.querySelectorAll('style');
    styleTags.forEach(style => {
        const styleClone = style.cloneNode(true);
        clone.prepend(styleClone);
    });

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
    
    if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
}

export async function exportSvg(config: ExportConfig) {
  try {
    const el = document.getElementById('mermaid-export-container');
    if (!el) return;
    
    const dataUrl = getSvgDataUrlForExport(config, el);
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

async function getPngDataUrl(config: ExportConfig, el: HTMLElement, scale: number = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const svgUrl = getSvgDataUrlForExport(config, el);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context failed"));
        
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (e) => reject(new Error("Image load failed from SVG data"));
      img.src = svgUrl;
    } catch (e) {
      reject(e);
    }
  });
}

export async function copyImageToClipboard(config: ExportConfig): Promise<void> {
  const el = document.getElementById('mermaid-export-container');
  if (!el) throw new Error("Export container not found");
  
  try {
    const dataUrl = await getPngDataUrl(config, el);
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
  } catch (err) {
    console.error('Failed to copy PNG:', err);
    throw err;
  }
}

export async function exportPng(config: ExportConfig) {
  try {
    const el = document.getElementById('mermaid-export-container');
    if (!el) return;
    
    const dataUrl = await getPngDataUrl(config, el);

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

