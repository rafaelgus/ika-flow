import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (aiClient) return aiClient;
  
  // Try environment first, then local storage
  const apiKey = import.meta.env.GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
  
  if (!apiKey) {
    throw new Error('API key is missing. Please provide a Gemini API Key.');
  }
  
  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
}

export function setApiKey(key: string) {
  localStorage.setItem('gemini_api_key', key);
  aiClient = null; // force re-init
}

export function hasApiKey(): boolean {
  return !!(import.meta.env.GEMINI_API_KEY || localStorage.getItem('gemini_api_key'));
}

const SYSTEM_PROMPT = `
You are an expert at creating Mermaid.js diagrams.
Your task is to take a user's prompt or existing diagram, and generate the corresponding Mermaid.js code.
Return EXCLUSIVELY the raw Mermaid code.
Do NOT wrap the code in markdown code blocks (e.g., do not use \`\`\`mermaid or \`\`\`).
Start directly with the graph or diagram type declaration (e.g., \`graph TD\`, \`sequenceDiagram\`, \`pie\`, \`gantt\`, etc.).
Do not include any explanations, comments, or intro/outro text.
Your response will be parsed directly by the Mermaid.js rendering engine.
`;

export async function generateMermaidCode(prompt: string, currentCode?: string): Promise<string> {
  const ai = getAiClient();
  const finalPrompt = currentCode
    ? `Here is the current diagram code:\n${currentCode}\n\nPlease update it based on this request: ${prompt}`
    : `Please create a Mermaid diagram based on this request: ${prompt}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: finalPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.1, // Keep it deterministic and focused on valid syntax
    },
  });

  let text = response.text || '';
  
  // Clean up just in case the model ignored the markdown wrap instruction
  if (text.startsWith('\`\`\`mermaid')) {
    text = text.replace(/^\`\`\`mermaid\n/, '');
  }
  if (text.startsWith('\`\`\`')) {
    text = text.replace(/^\`\`\`\n/, '');
  }
  if (text.endsWith('\`\`\`')) {
    text = text.replace(/\n\`\`\`$/, '');
  }
  
  return text.trim();
}
