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
    const dataUrl = await toSvg(el, { 
      backgroundColor: getBgColor(config.theme),
      style: { transform: 'none', margin: '0' }
    });
    
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
