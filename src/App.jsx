import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from "@clerk/clerk-react";
import { Analytics } from "@vercel/analytics/react";
import {
  GitBranch, ZoomIn, ZoomOut, Code, Link, Plus,
  AlertTriangle, Maximize, Loader2, Camera, Palette, 
  Trash2, Upload, Info, HardDrive, DownloadCloud, 
  UploadCloud, Heart, X, History, Save, Download, FileText, Zap, 
  MessageSquare, Moon, Sun, ArrowRightLeft, ArrowDownUp
} from 'lucide-react';

// --- THE GLOBAL CRASH CATCHER ---
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif; background: #fff1f2; color: #e11d48; height: 100vh;">
      <h3 style="font-size: 20px; margin-bottom: 10px;">Critical React Crash</h3>
      <p><b>Error:</b> ${event.message}</p>
      <p style="font-size: 12px; margin-top: 20px;">Please take a screenshot of this red screen!</p>
    </div>`;
  });
}

// --- TELEMETRY ENGINE ---
const WEBHOOK_URL = "https://hook.eu1.make.com/28gu9i68wrhkhecqa3dly7fvmhe02fs4"; // LIVE WEBHOOK CONFIGURED

const sendTelemetry = async (type, data) => {
  if (!WEBHOOK_URL || WEBHOOK_URL.includes("YOUR_CUSTOM")) return;
  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: type, timestamp: new Date().toISOString(), ...data })
    });
  } catch (e) {
    console.error("Telemetry suppressed.");
  }
};

// --- CONFIGURATION ---
const TIP_JAR_LINK = "https://ko-fi.com/isshhan";

// --- Tactical Data Extraction & Sanitization ---
const extractJSON = (text) => {
  if (!text) throw new Error("AI_PARSE_ERROR_EMPTY");
  try {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match) return JSON.parse(match[1]);
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) return JSON.parse(text.substring(start, end + 1));
    return JSON.parse(text);
  } catch (e) {
    throw new Error("AI_PARSE_ERROR");
  }
};

const sanitizeHtml = (text) => {
  if (!text) return '';
  return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, '<br/>');
};

const makeSafeId = (id) => 'node_' + String(id).replace(/[^a-zA-Z0-9]/g, '');

const loadMermaid = () => {
  return new Promise((resolve, reject) => {
    if (window.mermaid) return resolve(window.mermaid);
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
    script.onload = () => {
      window.mermaid.initialize({
        startOnLoad: false, 
        theme: 'base', 
        securityLevel: 'loose',
        useMaxWidth: false, 
        flowchart: { htmlLabels: true, curve: 'basis', padding: 30, nodeSpacing: 80, rankSpacing: 100 }
      });
      resolve(window.mermaid);
    };
    script.onerror = () => reject(new Error("Failed to load rendering engine."));
    document.head.appendChild(script);
  });
};

// --- PDF PARSER INJECTION ---
const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF engine."));
    document.head.appendChild(script);
  });
};

const EXPORT_STYLES = `
  .node-card { padding: 12px 16px; min-width: 160px; max-width: 260px; text-align: left; font-family: Inter, sans-serif; white-space: normal; display: flex; flex-direction: column; gap: 6px; }
  .node-title-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .node-title { font-weight: 700; font-size: 14px; line-height: 1.2; word-break: break-word; }
  .node-badge { font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 12px; white-space: nowrap; }
  .node-badge.cmplx { background: #fee2e2; color: #ef4444; border: 1px solid #fca5a5; } 
  .node-badge.clean { background: #d1fae5; color: #10b981; border: 1px solid #6ee7b7; }
  .node-hint { font-size: 11px; font-weight: 600; opacity: 0.5; display: flex; align-items: center; margin-top: 2px; }
  foreignObject { overflow: visible !important; }
`;

const getErrorTheme = (baseError) => {
  const errStr = String(baseError).toLowerCase();
  const isCORS = errStr.includes("cors") || errStr.includes("fetch") || errStr.includes("network");
  const isMermaid = errStr.includes("mermaid");
  
  const themes = [
    { type: 'professional', icon: '🛡️', title: 'Access Restricted', msg: isMermaid ? "The rendering engine failed to parse the AI's data structure." : (isCORS ? "The target server actively refused the connection due to strict security policies." : "The AI pipeline returned a malformed data structure."), steps: ["Acknowledge network security block.", "Switch input mode to 'Local Files / Snippets'.", "Manually upload the source code.", "Re-initialize the analysis."], styles: { border: 'border-slate-300', text: 'text-slate-800', bgLight: 'bg-slate-100', bgBtn: 'bg-slate-800', hover: 'hover:bg-slate-900' } },
    { type: 'detective', icon: '🕵️‍♂️', title: 'Dead End Reached', msg: isCORS ? "Looks like the website has an anti-bot security perimeter. We can't sneak past their CORS headers." : "The AI's logic engine tripped over an unexpected anomaly in the code.", steps: ["Switch to manual extraction mode.", "Go directly to the target website in a new tab.", "Copy the raw text into your clipboard.", "Drop it in the Local Snippets tab to bypass their firewall."], styles: { border: 'border-amber-200', text: 'text-amber-900', bgLight: 'bg-amber-50', bgBtn: 'bg-amber-700', hover: 'hover:bg-amber-800' } },
    { type: 'cute', icon: '🥺🐾', title: 'Oopsie Daisies!', msg: isCORS ? "The grumpy internet guards won't let us peek at that link! Most websites block automated bots to protect their data." : "Our AI got a little confused trying to read that code.", steps: ["Don't worry!", "Click the 'Local Files / Snippets' tab.", "Copy and paste your code directly into the box.", "Try generating again! ✨"], styles: { border: 'border-pink-200', text: 'text-pink-800', bgLight: 'bg-pink-50', bgBtn: 'bg-pink-500', hover: 'hover:bg-pink-600' } },
    { type: 'zen', icon: '🧘‍♂️', title: 'A Blocked Path', msg: isCORS ? "The river of data from that link does not flow here. The website has built a wall." : "The mind of the AI could not find structure in the chaos of that code.", steps: ["Breathe in.", "Copy the text from your source.", "Paste it into the Local Snippets sanctuary.", "Let the architecture reveal itself."], styles: { border: 'border-emerald-200', text: 'text-emerald-800', bgLight: 'bg-emerald-50', bgBtn: 'bg-emerald-600', hover: 'hover:bg-emerald-700' } },
    { type: 'techbro', icon: '🚀', title: 'Blocker Detected!', msg: isCORS ? "Bro, their server just straight-up denied our GET request. CORS policies are blocking our hustle." : "The LLM hallucinated the JSON schema. Bad prompt output.", steps: ["Pivot your strategy.", "Hit the 'Local Files' tab.", "Hardcode paste your snippets.", "Ship the map! 🚢"], styles: { border: 'border-blue-200', text: 'text-blue-900', bgLight: 'bg-blue-50', bgBtn: 'bg-blue-600', hover: 'hover:bg-blue-700' } }
  ];
  return themes[Math.floor(Math.random() * themes.length)];
};

function MainApp() {
  const { userId } = useAuth(); 
  
  const [appMode, setAppMode] = useState('developer'); // 'developer' or 'knowledge'
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [layoutDir, setLayoutDir] = useState('TD');

  const [localHistory, setLocalHistory] = useState([]);
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
  const importFileRef = useRef(null);

  const [inputMode, setInputMode] = useState('url');
  const [urlInput, setUrlInput] = useState('');
  const [localFiles, setLocalFiles] = useState([{ id: 1, name: '', content: '' }]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [inputError, setInputError] = useState('');

  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorData, setErrorData] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [architecture, setArchitecture] = useState(null);
  const [mermaidCode, setMermaidCode] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [refactorSuggestion, setRefactorSuggestion] = useState(null);
  const [isRefactoring, setIsRefactoring] = useState(false);

  const mapContentRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => { 
    loadMermaid().catch(() => {}); 
    loadPdfJs().catch(() => {});
  }, []);

  useEffect(() => {
    if (architecture) generateMermaid(architecture);
  }, [isDarkMode, layoutDir, architecture]);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // --- UNIFIED FILE PROCESSOR (INCLUDES PDF RIPPER) ---
  const processFiles = async (files) => {
    const pdfjs = await loadPdfJs().catch(() => null);

    Array.from(files).forEach(f => {
      if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
        if (!pdfjs) return showToast("PDF engine failed to load.", "error");
        
        const r = new FileReader();
        r.onload = async (ev) => {
          try {
            showToast(`Cracking open ${f.name}...`, 'info');
            const typedarray = new Uint8Array(ev.target.result);
            const pdf = await pdfjs.getDocument(typedarray).promise;
            let fullText = '';
            
            // Limit to first 15 pages to protect context window limits
            const maxPages = Math.min(pdf.numPages, 15);
            for (let i = 1; i <= maxPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              fullText += content.items.map(item => item.str).join(' ') + '\n\n';
            }
            
            setLocalFiles(p => (p.length===1 && !p[0].content) ? [{ id: Date.now()+Math.random(), name: f.name, content: fullText }] : [...p, { id: Date.now()+Math.random(), name: f.name, content: fullText }]);
            showToast(`Extracted ${maxPages} pages of text!`, 'success');
          } catch (err) {
            showToast("PDF is encrypted or a raw image scan.", "error");
          }
        };
        r.readAsArrayBuffer(f);
      } else {
        // Standard text/code file processing
        const r = new FileReader();
        r.onload = (ev) => setLocalFiles(p => (p.length===1 && !p[0].content) ? [{ id: Date.now()+Math.random(), name: f.name, content: ev.target.result }] : [...p, { id: Date.now()+Math.random(), name: f.name, content: ev.target.result }]);
        r.readAsText(f);
      }
    });
  };

  const saveToHistory = () => {
    if (!architecture || !mermaidCode) return;
    const title = inputMode === 'url' ? urlInput.split('/').pop() || (appMode === 'developer' ? 'Local Code Snippets' : 'Local Notes') : (appMode === 'developer' ? 'Local Code Snippets' : 'Local Notes');
    const newItem = { id: Date.now().toString(), title, createdAt: Date.now(), architecture, mermaidCode };
    setLocalHistory(prev => [newItem, ...prev]);
    showToast("Map saved to Vault!", "success");
  };

  const handleExportBackup = () => {
    if (localHistory.length === 0) return showToast("Vault is empty.", "warning");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localHistory));
    const node = document.createElement('a');
    node.setAttribute("href", dataStr);
    node.setAttribute("download", `repovue_vault_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(node); node.click(); node.remove();
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          setLocalHistory(imported);
          showToast("Vault restored successfully.", "success");
        } else throw new Error();
      } catch { showToast("Invalid backup file.", "error"); }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const fetchWithRetry = async (url, options, retries = 2) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return options?.headers?.['Content-Type'] === 'application/json' ? await res.json() : await res.text();
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  };

  const handleAnalyze = async () => {
    setInputError('');
    let fileContents = [];

    try {
      if (inputMode === 'url') {
        if (!urlInput.trim() || !/^https?:\/\//i.test(urlInput)) {
          return setInputError("URL must begin with http:// or https://");
        }
        
        setStatus('fetching'); 
        setStatusMessage('Infiltrating target URL...');

        const gitRepoMatch = urlInput.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/);
        const gitFileMatch = urlInput.includes('github.com') && urlInput.includes('/blob/');

        if (gitRepoMatch) {
          const owner = gitRepoMatch[1]; const repo = gitRepoMatch[2].replace('.git', '');
          const repoData = await fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}`);
          setStatusMessage('Mapping repository structure...');
          const treeData = await fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`);
          const validExts = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.go', '.rs', '.css', '.html'];
          const files = treeData.tree.filter(f => f.type === 'blob' && validExts.some(ext => f.path.endsWith(ext)) && !f.path.includes('test')).slice(0, 10);
          
          if (!files.length) throw new Error("Target repository contains no supported architecture files.");
          setStatusMessage(`Extracting ${files.length} crucial files...`);
          
          fileContents = await Promise.all(files.map(async (f) => {
            const content = await fetchWithRetry(`https://raw.githubusercontent.com/${owner}/${repo}/${repoData.default_branch}/${f.path}`);
            return { path: f.path, content };
          }));
        } else {
          let fetchUrl = gitFileMatch ? urlInput.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/') : urlInput;
          try {
            const content = await fetchWithRetry(fetchUrl);
            const lowerContent = content.trim().toLowerCase();
            
            if (lowerContent.startsWith('<!doctype') || lowerContent.startsWith('<html')) {
              setStatusMessage('Bypassing UI, extracting raw logic...');
              const parser = new DOMParser();
              const doc = parser.parseFromString(content, 'text/html');
              const codeBlocks = Array.from(doc.querySelectorAll('pre, code')).map(el => el.textContent).join('\n\n');
              
              if (codeBlocks.trim().length > 50) {
                fileContents = [{ path: 'scraped_code_blocks.txt', content: codeBlocks.substring(0, 15000) }];
              } else {
                fileContents = [{ path: 'scraped_page_text.txt', content: (doc.body?.innerText || content).substring(0, 15000) }];
              }
            } else {
              fileContents = [{ path: fetchUrl.split('/').pop() || 'raw_data.txt', content }];
            }
          } catch (fetchErr) {
            throw new Error(`CORS_BLOCK_DETECTED: ${fetchErr.message}`);
          }
        }
      } else {
        const validFiles = localFiles.filter(f => f.content.trim());
        if (!validFiles.length) return setInputError("Payload empty. Provide local input.");
        fileContents = validFiles.map(f => ({ path: f.name || (appMode === 'developer' ? 'snippet' : 'note'), content: f.content }));
      }

      setErrorData(null); setArchitecture(null); setMermaidCode(''); setSelectedNodeId(null); setTransform({ x: 0, y: 0, scale: 1 });
      setStatus('analyzing');
      setStatusMessage('AI is constructing the map...');

      const devPrompt = `Analyze these source files/text. Extract core architecture: classes, functions, relationships.
      Keep to max 30 significant nodes. Strict JSON only format:
      {"nodes":[{"id":"n1","label":"Func","type":"function","file":"path","complexity":5,"code_snippet":"...","description":"...","returns":"...","ui_design":"...","userComment":""}],"edges":[{"source":"n1","target":"n2"}]}
      Files: ${fileContents.map(f => `\n--- ${f.path} ---\n${f.content.substring(0, 3000)}`).join('\n')}`;

      const knowledgePrompt = `Analyze this text, document, or notes. Extract the core concepts, primary arguments, and supporting evidence.
      Structure this into a hierarchical map. Keep to max 30 significant nodes. Strict JSON only format:
      {"nodes":[{"id":"n1","label":"Core Concept Name","type":"Category (e.g., Thesis, Argument, Fact)","file":"Section or Chapter Name","complexity":5,"code_snippet":"...relevant exact quote from text...","description":"...detailed explanation of the concept...","returns":"...key takeaway...","ui_design":"...visual metaphor...","userComment":""}],"edges":[{"source":"n1","target":"n2"}]}
      Text content: ${fileContents.map(f => `\n--- ${f.path} ---\n${f.content.substring(0, 3000)}`).join('\n')}`;

      const prompt = appMode === 'developer' ? devPrompt : knowledgePrompt;

      const aiResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userId })
      });

      let data;
      try { data = await aiResponse.json(); } 
      catch { throw new Error("Backend communication severed."); }

      if (!aiResponse.ok) throw new Error(data.error || "Backend rejected request.");

      const archData = extractJSON(data.candidates[0].content.parts[0].text);
      setArchitecture(archData);
      generateMermaid(archData);
      setStatus('ready');

    } catch (err) {
      console.error("[Operation Failed]:", err);
      setErrorData(getErrorTheme(err.message));
      setStatus('error');
      
      sendTelemetry('analysis_failure', { 
        errorMessage: err.message, 
        appMode: appMode, 
        inputMode: inputMode 
      });
    }
  };

  const generateMermaid = useCallback((data) => {
    if (!data?.nodes) return;
    
    let m = `%%{init: {'theme': '${isDarkMode ? 'dark' : 'base'}', 'themeVariables': { 'fontFamily': 'Inter, sans-serif', 'primaryColor': '${isDarkMode ? '#0f172a' : '#ffffff'}', 'primaryTextColor': '${isDarkMode ? '#f8fafc' : '#0f172a'}', 'lineColor': '${isDarkMode ? '#475569' : '#94a3b8'}' }}}%%\n`;
    m += `graph ${layoutDir};\n`; 

    const files = [...new Set(data.nodes.map(n => n.file || 'Unknown'))];
    const nodeBg = isDarkMode ? '#1e293b' : '#ffffff';
    const nodeText = isDarkMode ? '#f8fafc' : '#0f172a';
    
    files.forEach((file, i) => {
      m += `  subgraph file_${i} ["📄 ${sanitizeHtml(file)}"]\n    direction TB\n`;
      data.nodes.filter(n => (n.file || 'Unknown') === file).forEach(node => {
        const isCmplx = (node.complexity || 1) > 7;
        
        let html = `<div xmlns='http://www.w3.org/1999/xhtml' class='node-card' style='background-color:${nodeBg}; color:${nodeText}; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid ${isDarkMode ? '#334155' : '#e2e8f0'};'>`;
        html += `<div class='node-title-row'><span class='node-title'>${sanitizeHtml(node.label)}</span><span class='node-badge ${isCmplx ? 'cmplx' : 'clean'}'>C: ${node.complexity || 1}</span></div>`;
        if (node.description || node.returns || node.ui_design) { html += `<div class='node-hint'>🔍 Click to inspect logic</div>`; }
        html += `</div>`;
        
        m += `    ${makeSafeId(node.id)}("${html}"):::${isCmplx ? 'complexNode' : 'cleanNode'}\n`;
      });
      m += `  end\n  style file_${i} fill:${isDarkMode ? '#0f172a80' : '#f8fafc50'},stroke:${isDarkMode ? '#334155' : '#cbd5e1'},stroke-width:1px,stroke-dasharray:4 4,rx:12,ry:12\n`;
    });

    if (data.edges) {
      data.edges.forEach(e => { 
        if (e.source && e.target) {
          m += `  ${makeSafeId(e.source)} --> ${makeSafeId(e.target)}\n`; 
        }
      });
    }
    
    m += `  classDef complexNode fill:${isDarkMode ? '#450a0a' : '#fff1f2'},stroke:${isDarkMode ? '#ef4444' : '#fca5a5'},stroke-width:1.5px,rx:8px,ry:8px;\n  classDef cleanNode fill:${nodeBg},stroke:${isDarkMode ? '#334155' : '#e2e8f0'},stroke-width:1.5px,rx:8px,ry:8px;\n`;
    setMermaidCode(m);
  }, [isDarkMode, layoutDir]);

  useEffect(() => {
    if (status !== 'ready' || !mermaidCode || !mapContentRef.current) return;
    let isCancelled = false;

    const render = async () => {
      try {
        const mermaid = await loadMermaid();
        mapContentRef.current.innerHTML = '';
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, mermaidCode);
        if (isCancelled) return;
        
        mapContentRef.current.innerHTML = svg;
        
        const renderedSvg = mapContentRef.current.querySelector('svg');
        if (renderedSvg) {
          renderedSvg.style.maxWidth = 'none';
        }

        mapContentRef.current.querySelectorAll('.node').forEach(n => {
          n.style.cursor = 'pointer';
          n.addEventListener('click', () => {
             const rawId = n.getAttribute('id');
             const matched = architecture?.nodes?.find(a => rawId.includes(makeSafeId(a.id)));
             if (matched) { setSelectedNodeId(matched.id); setRefactorSuggestion(null); }
          });
        });
      } catch (err) { 
        console.error("Render Engine Failure:", err);
        if (!isCancelled) {
          setErrorData(getErrorTheme("MERMAID_CRASH"));
          setStatus('error');
          sendTelemetry('render_failure', { errorMessage: err.toString() });
        }
      }
    };
    render();
    return () => { isCancelled = true; };
  }, [mermaidCode, status, architecture]);

  const handleNodeEdit = (id, field, value) => {
    const newArch = { ...architecture, nodes: architecture.nodes.map(n => n.id === id ? { ...n, [field]: value } : n) };
    setArchitecture(newArch);
  };

  const handleRefactor = async (node) => {
    if (!node?.code_snippet) return;
    setIsRefactoring(true); setRefactorSuggestion(null);
    try {
      const actionPrompt = appMode === 'developer' 
        ? `Refactor this code to reduce complexity.\nCode:\n${node.code_snippet}`
        : `Elaborate and explain this concept in more detail.\nText:\n${node.code_snippet}`;

      const aiResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: actionPrompt })
      });
      const data = await aiResponse.json();
      setRefactorSuggestion(data.candidates[0].content.parts[0].text);
    } catch { setRefactorSuggestion("Operation failed. Backend unreachable."); } 
    finally { setIsRefactoring(false); }
  };

  const exportMap = (type) => {
    setExportMenuOpen(false);
    if (!mapContentRef.current) return;

    const triggerDownload = (url, name) => {
      try {
        const a = document.createElement('a'); a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        showToast(`Extraction complete: ${name}`, 'success');
      } catch { showToast("Download suppressed by browser.", 'error'); }
    };

    if (type === 'md') {
      let md = `# Map Export\n\n\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n\n## Node Details\n\n`;
      architecture?.nodes.forEach(n => {
        md += `### ${n.label}\n- **File:** \`${n.file}\`\n- **Complexity:** ${n.complexity}\n`;
        if (n.description) md += `- **Action:** ${n.description}\n`;
        if (n.returns) md += `- **Returns:** ${n.returns}\n`;
        md += `\n`;
      });
      return triggerDownload("data:text/markdown;charset=utf-8," + encodeURIComponent(md), 'map_export.md');
    }

    const svgEl = mapContentRef.current.querySelector('svg');
    if (!svgEl) return showToast("No map rendered to export!", 'error');
    
    const cloned = svgEl.cloneNode(true);
    const style = document.createElement('style'); style.textContent = EXPORT_STYLES;
    cloned.insertBefore(style, cloned.firstChild);
    
    const viewBox = svgEl.getAttribute('viewBox');
    let baseWidth = 1200, baseHeight = 800;
    
    if (viewBox) {
      const dims = viewBox.split(' ').map(Number);
      baseWidth = dims[2]; baseHeight = dims[3];
    } else {
      const bbox = svgEl.getBoundingClientRect();
      baseWidth = bbox.width; baseHeight = bbox.height;
    }

    cloned.setAttribute('width', baseWidth); 
    cloned.setAttribute('height', baseHeight);
    if (!cloned.getAttribute('xmlns')) cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    const svgData = new XMLSerializer().serializeToString(cloned);
    const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
    
    if (type === 'svg') return triggerDownload(svgUrl, 'map_export.svg');
    
    showToast("Compiling 4K High-Res PNG...", 'info');
    const img = new Image(); 
    
    img.onload = () => {
      try {
        const scale = 4;
        const cvs = document.createElement('canvas'); 
        const ctx = cvs.getContext('2d');
        
        cvs.width = baseWidth * scale; 
        cvs.height = baseHeight * scale;
        
        ctx.fillStyle = isDarkMode ? "#0f172a" : "#f8fafc"; 
        ctx.fillRect(0, 0, cvs.width, cvs.height);
        
        ctx.scale(scale, scale); 
        ctx.drawImage(img, 0, 0); 
        
        const pngData = cvs.toDataURL('image/png'); 
        triggerDownload(pngData, 'map_export.png');
      } catch (err) {
        showToast("Mobile browser blocked PNG export. Downloading high-res SVG instead.", 'warning');
        triggerDownload(svgUrl, 'map_export.svg');
      }
    };
    
    img.onerror = () => { triggerDownload(svgUrl, 'map_export.svg'); };
    img.src = svgUrl;
  };

  const selectedNode = architecture?.nodes?.find(n => n.id === selectedNodeId);

  return (
    <div className={`flex flex-col h-screen font-sans overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 w-[90%] md:w-auto">
          <div className={`px-4 md:px-5 py-3 rounded-full shadow-lg border flex items-center space-x-2 text-xs md:text-sm font-semibold ${toast.type === 'error' ? 'bg-red-950 border-red-800 text-red-200' : toast.type === 'warning' ? 'bg-amber-950 border-amber-800 text-amber-200' : toast.type === 'success' ? 'bg-green-950 border-green-800 text-green-200' : (isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white')}`}>
            {toast.type === 'error' ? <AlertTriangle size={16}/> : <Info size={16}/>}
            <span className="truncate">{toast.msg}</span>
          </div>
        </div>
      )}

      <header className={`flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b z-10 shadow-sm shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-indigo-500 text-white' : 'bg-slate-900 text-white'}`}><GitBranch size={18} strokeWidth={2.5} /></div>
          <div><h1 className="text-base md:text-lg font-bold">RepoVue</h1><p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest hidden sm:block">Visualizer</p></div>
        </div>

        {/* THE DUAL-MODE TOGGLE */}
        <div className={`hidden md:flex items-center p-1 rounded-full border mx-auto ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
          <button onClick={() => setAppMode('developer')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${appMode === 'developer' ? (isDarkMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-600 shadow-sm') : 'text-slate-500 hover:text-slate-400'}`}>💻 Developer Mode</button>
          <button onClick={() => setAppMode('knowledge')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${appMode === 'knowledge' ? (isDarkMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-600 shadow-sm') : 'text-slate-500 hover:text-slate-400'}`}>🧠 Knowledge Mode</button>
        </div>

        {status !== 'idle' && (
          <button onClick={() => { setStatus('idle'); setSelectedNodeId(null); setTransform({x:0,y:0,scale:1}); }} className={`hidden md:flex items-center px-5 py-2.5 rounded-full border shadow-sm font-semibold mx-auto transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <Plus size={16} className="mr-2" /><span className="text-sm">New Map</span>
          </button>
        )}

        <div className="flex items-center space-x-1 sm:space-x-2">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 sm:px-3 sm:py-2 rounded-full font-medium transition-colors ${isDarkMode ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button onClick={() => setHistorySidebarOpen(true)} className={`flex items-center p-2 sm:px-4 sm:py-2 rounded-full font-medium text-xs sm:text-sm ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><History size={16} /><span className="hidden sm:inline sm:ml-2">Vault</span></button>
          
          {status === 'ready' && <button onClick={saveToHistory} className={`flex items-center p-2 sm:px-4 sm:py-2 rounded-full font-bold text-xs sm:text-sm ${isDarkMode ? 'bg-indigo-900 text-indigo-300 hover:bg-indigo-800' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}><Save size={16} /><span className="hidden sm:inline sm:ml-2">Save</span></button>}

          <div className="relative">
            <button onClick={() => setExportMenuOpen(!exportMenuOpen)} disabled={status !== 'ready'} className={`flex items-center p-2 sm:px-4 sm:py-2 rounded-full disabled:opacity-30 text-xs sm:text-sm transition-colors ${isDarkMode ? 'bg-slate-100 text-slate-900 hover:bg-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}><Download size={16} /><span className="hidden sm:inline sm:ml-2">Export</span></button>
            {exportMenuOpen && status === 'ready' && (
              <div className={`absolute right-0 mt-2 w-48 border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <button onClick={() => exportMap('png')} className={`w-full text-left px-4 py-3 text-sm flex items-center border-b ${isDarkMode ? 'hover:bg-slate-700 border-slate-700' : 'hover:bg-slate-50 border-slate-100'}`}><Camera size={16} className="mr-3 text-slate-400" /> PNG</button>
                <button onClick={() => exportMap('svg')} className={`w-full text-left px-4 py-3 text-sm flex items-center border-b ${isDarkMode ? 'hover:bg-slate-700 border-slate-700' : 'hover:bg-slate-50 border-slate-100'}`}><Camera size={16} className="mr-3 text-slate-400" /> SVG</button>
                <button onClick={() => exportMap('md')} className={`w-full text-left px-4 py-3 text-sm flex items-center ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}><FileText size={16} className="mr-3 text-slate-400" /> Markdown</button>
              </div>
            )}
          </div>

          <div className={`w-px h-6 mx-1 hidden sm:block ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          <a href={TIP_JAR_LINK} target="_blank" rel="noopener noreferrer" className={`flex items-center p-2 sm:px-4 sm:py-2 rounded-full font-bold text-xs sm:text-sm ${isDarkMode ? 'bg-pink-950 text-pink-400' : 'bg-pink-50 text-pink-600'}`}><Heart size={16} className="fill-red-500" /><span className="hidden sm:inline sm:ml-2">Support</span></a>
          <div className={`w-px h-6 mx-1 hidden sm:block ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
          
          <SignedOut><SignInButton mode="modal"><button className={`px-3 py-2 sm:px-4 rounded-full font-bold text-xs sm:text-sm transition-colors ${isDarkMode ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-slate-900 text-white'}`}>Login</button></SignInButton></SignedOut>
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className={`flex-1 relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`} onWheel={e => setTransform(p => ({ ...p, scale: Math.max(0.1, p.scale - e.deltaY * 0.001) }))} onMouseDown={e => { setIsDragging(true); setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y }); }} onMouseMove={e => isDragging && setTransform(p => ({ ...p, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }))} onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
          
          {status === 'idle' && (
            <div className={`absolute inset-0 z-10 overflow-y-auto custom-scroll p-4 sm:p-6 lg:p-8 ${isDarkMode ? 'bg-slate-950/90' : 'bg-slate-50/90'} backdrop-blur-sm`}>
              <div className={`w-full max-w-2xl mx-auto mt-4 mb-24 sm:mt-12 lg:mt-20 rounded-2xl md:rounded-[2rem] shadow-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className={`flex border-b ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <button className={`flex-1 py-4 md:py-5 text-[10px] md:text-xs font-bold uppercase tracking-widest ${inputMode === 'url' ? (isDarkMode ? 'bg-slate-900 shadow-sm text-white' : 'bg-white shadow-sm text-slate-900') : 'text-slate-500'}`} onClick={() => setInputMode('url')}><Link size={14} className="inline mr-1" /> Web Links</button>
                  
                  {/* DYNAMIC TAB NAME */}
                  <button className={`flex-1 py-4 md:py-5 text-[10px] md:text-xs font-bold uppercase tracking-widest ${inputMode === 'local' ? (isDarkMode ? 'bg-slate-900 shadow-sm text-white' : 'bg-white shadow-sm text-slate-900') : 'text-slate-500'}`} onClick={() => setInputMode('local')}>
                    {appMode === 'developer' ? <Code size={14} className="inline mr-1" /> : <FileText size={14} className="inline mr-1" />}
                    {appMode === 'developer' ? 'Local Snippets' : 'Local Notes'}
                  </button>
                </div>
                
                <div className="p-6 md:p-10">
                  {inputMode === 'url' ? (
                    <input type="text" value={urlInput} onChange={e => { setUrlInput(e.target.value); setInputError(''); }} placeholder={appMode === 'developer' ? "Enter a GitHub Repo URL, raw link, or ANY public webpage..." : "Enter a Wikipedia link, article, or document URL..."} className={`w-full px-5 py-4 md:px-6 md:py-5 border rounded-xl md:rounded-2xl outline-none text-sm md:text-base font-medium transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:bg-slate-900 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-slate-400'}`} onKeyDown={e => e.key === 'Enter' && handleAnalyze()} />
                  ) : (
                    <div className="space-y-4 md:space-y-6">
                      <div className={`w-full border-2 border-dashed rounded-xl p-4 md:p-6 text-center transition-colors ${isDraggingOver ? (isDarkMode ? 'border-indigo-500 bg-indigo-900/30' : 'border-blue-500 bg-blue-50') : (isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-300 bg-slate-50')}`} onDragOver={e=>{e.preventDefault(); setIsDraggingOver(true)}} onDragLeave={()=>setIsDraggingOver(false)} onDrop={e=>{e.preventDefault(); setIsDraggingOver(false); processFiles(e.dataTransfer.files);}}>
                        <Upload size={24} className="text-slate-400 mx-auto mb-3" />
                        <span className={`block text-xs md:text-sm font-bold mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Drag & Drop files or folders here</span>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                          <input type="file" multiple className="hidden" id="file-upload" onChange={e => processFiles(e.target.files)} />
                          <label htmlFor="file-upload" className={`cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 w-full sm:w-auto ${isDarkMode ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 text-white' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'}`}>Browse Files</label>
                          
                          <input type="file" multiple webkitdirectory="true" className="hidden" id="folder-upload" onChange={e => processFiles(e.target.files)} />
                          <label htmlFor="folder-upload" className={`cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 w-full sm:w-auto ${isDarkMode ? 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white' : 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700'}`}>Browse Folder</label>
                        </div>
                      </div>

                      <div className="max-h-48 md:max-h-64 overflow-y-auto space-y-3 custom-scroll pr-2">
                        {localFiles.map((file) => (
                          <div key={file.id} className={`border rounded-xl flex flex-col overflow-hidden ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            {/* DYNAMIC FILENAME PLACEHOLDER */}
                            <div className={`flex px-3 py-2 border-b ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}><input type="text" value={file.name} onChange={e => setLocalFiles(p => p.map(f => f.id === file.id ? { ...f, name: e.target.value } : f))} className={`bg-transparent text-xs md:text-sm font-bold flex-1 outline-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`} placeholder={appMode === 'developer' ? "filename.js" : "document.pdf"} /><button onClick={() => setLocalFiles(p => p.filter(f => f.id !== file.id))} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button></div>
                            {/* DYNAMIC TEXTAREA PLACEHOLDER */}
                            <textarea value={file.content} onChange={e => setLocalFiles(p => p.map(f => f.id === file.id ? { ...f, content: e.target.value } : f))} className={`w-full h-20 md:h-24 p-3 text-xs font-mono resize-none outline-none custom-scroll ${isDarkMode ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-800'}`} placeholder={appMode === 'developer' ? "// Paste code here..." : "Paste your text, notes, or wait for PDF extraction..."} />
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setLocalFiles(p => [...p, { id: Date.now(), name: appMode === 'developer' ? `snippet_${p.length + 1}.js` : `note_${p.length + 1}.txt`, content: '' }])} className={`text-[10px] md:text-xs font-bold flex items-center ${isDarkMode ? 'text-indigo-400' : 'text-blue-600'}`}><Plus size={14} className="mr-1"/> Add Section</button>
                    </div>
                  )}

                  {inputError && <div className={`mt-4 p-3 rounded-lg text-xs md:text-sm font-medium flex items-center ${isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'}`}><AlertTriangle size={16} className="mr-2 shrink-0" />{inputError}</div>}
                  <button onClick={handleAnalyze} className={`mt-6 md:mt-8 w-full py-4 rounded-xl font-bold text-sm md:text-base shadow-lg transition-all active:scale-95 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>Generate Architecture Map</button>
                </div>
              </div>
            </div>
          )}

          {/* Loading / Error States */}
          {status !== 'idle' && status !== 'ready' && (
            <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-4 overflow-y-auto ${isDarkMode ? 'bg-slate-950/80' : 'bg-white/80'} backdrop-blur-sm`}>
               {status === 'error' && errorData ? (
                 <div className={`text-center p-6 md:p-8 rounded-2xl shadow-2xl border max-w-md w-full animate-in zoom-in-95 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white ' + errorData.styles.border}`}>
                    <div className="text-4xl md:text-5xl mb-3">{errorData.icon}</div>
                    <h3 className={`text-lg md:text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : errorData.styles.text}`}>{errorData.title}</h3>
                    <p className={`font-medium leading-relaxed mb-5 text-xs md:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{errorData.msg}</p>
                    <div className={`p-4 rounded-xl border text-xs md:text-sm text-left mb-6 font-medium shadow-inner ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : errorData.styles.bgLight + ' ' + errorData.styles.text + ' ' + errorData.styles.border}`}>
                      <b className="uppercase tracking-wider text-[10px] opacity-70 block mb-2">Tactical Bypass Options:</b>
                      <ol className="list-decimal list-inside space-y-1 ml-1">{errorData.steps.map((step, idx) => <li key={idx}>{step}</li>)}</ol>
                    </div>
                    <button onClick={() => setStatus('idle')} className={`w-full py-3 text-white font-bold text-sm rounded-xl transition-all shadow-lg active:scale-95 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500' : errorData.styles.bgBtn + ' ' + errorData.styles.hover}`}>Return to Base</button>
                 </div>
               ) : (
                 <div className={`text-center p-6 md:p-8 rounded-2xl shadow-xl border w-full max-w-xs animate-in fade-in ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                   <Loader2 size={36} className={`animate-spin mx-auto mb-4 ${isDarkMode ? 'text-indigo-500' : 'text-slate-800'}`}/>
                   <h3 className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Analyzing</h3>
                   <p className={`text-xs font-medium animate-pulse ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{statusMessage}</p>
                 </div>
               )}
            </div>
          )}

          {/* Map Controls */}
          {status === 'ready' && (
            <div className={`absolute bottom-4 right-4 z-10 flex space-x-1 p-1.5 rounded-xl shadow-lg border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
              <button onClick={() => setTransform(p => ({ ...p, scale: p.scale + 0.2 }))} className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}><ZoomIn size={16}/></button>
              <button onClick={() => setTransform(p => ({ ...p, scale: Math.max(0.1, p.scale - 0.2) }))} className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}><ZoomOut size={16}/></button>
              <button onClick={() => setTransform({ x: 0, y: 0, scale: 1 })} className={`p-1.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}><Maximize size={16}/></button>
              
              <div className={`w-px h-5 mx-1 my-auto ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              
              <button onClick={() => setLayoutDir(layoutDir === 'TD' ? 'LR' : 'TD')} className={`p-1.5 rounded-lg font-bold text-[10px] flex items-center ${isDarkMode ? 'hover:bg-slate-800 text-indigo-400' : 'hover:bg-slate-100 text-blue-600'}`}>
                {layoutDir === 'TD' ? <ArrowRightLeft size={16}/> : <ArrowDownUp size={16}/>}
              </button>
            </div>
          )}

          {/* The Canvas */}
          <div className="w-full h-full origin-top-left cursor-grab active:cursor-grabbing flex items-center justify-center p-10 md:p-20 min-w-max min-h-max" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
            <div ref={mapContentRef} />
          </div>
        </div>

        {/* Floating Sidebar - Node Details (Focus Panel) */}
        <div className={`absolute right-0 top-0 bottom-0 w-full sm:w-80 md:w-96 border-l shadow-2xl z-20 transition-transform duration-300 flex flex-col ${selectedNodeId ? 'translate-x-0' : 'translate-x-full'} ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          {selectedNode && (
            <>
              <div className={`p-4 border-b shrink-0 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{selectedNode.type || 'node'}</span>
                  <button onClick={() => setSelectedNodeId(null)} className={`rounded-full p-1 shadow-sm border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'}`}><X size={16}/></button>
                </div>
                <input type="text" value={selectedNode.label || 'Unknown'} onChange={e => handleNodeEdit(selectedNode.id, 'label', e.target.value)} className={`w-full text-lg font-bold bg-transparent outline-none border-b border-transparent transition-colors ${isDarkMode ? 'text-white focus:border-slate-500' : 'text-slate-900 focus:border-slate-300'}`} />
                <div className="text-[10px] text-slate-400 mt-1 truncate">{selectedNode.file || 'unknown_file.js'}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll">
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-3 rounded-xl border ${(selectedNode.complexity || 1) > 7 ? (isDarkMode ? 'bg-red-950 border-red-900 text-red-400' : 'bg-red-50 border-red-100 text-red-600') : (isDarkMode ? 'bg-green-950 border-green-900 text-green-400' : 'bg-green-50 border-green-100 text-green-600')}`}>
                    <div className="text-[10px] font-bold uppercase opacity-70 mb-1">Complexity</div><div className="text-xl font-bold">{selectedNode.complexity || 1}</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Status</div>
                    <div className={`text-xs font-bold ${(selectedNode.complexity || 1) > 7 ? (isDarkMode ? 'text-red-400' : 'text-red-600') : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>{(selectedNode.complexity || 1) > 7 ? 'Needs Refactor' : 'Clean'}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {selectedNode.description && <div className={`rounded-xl p-3 border text-xs ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}><Zap size={14} className="inline mr-1 text-slate-400"/> {selectedNode.description}</div>}
                  {selectedNode.returns && <div className={`rounded-xl p-3 border text-xs font-mono break-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>↩️ {selectedNode.returns}</div>}
                  {selectedNode.ui_design && <div className={`rounded-xl p-3 border text-xs ${isDarkMode ? 'bg-blue-950 border-blue-900 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-900'}`}><Palette size={14} className="inline mr-1"/> {selectedNode.ui_design}</div>}
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center mb-1.5"><MessageSquare size={12} className="mr-1.5"/> Graph Notes</label>
                  <textarea value={selectedNode.userComment || ''} onChange={e => handleNodeEdit(selectedNode.id, 'userComment', e.target.value)} placeholder="Type intel here..." className={`w-full h-16 p-2 border rounded-lg outline-none text-xs resize-none custom-scroll ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:bg-slate-700 focus:border-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-slate-300'}`} />
                </div>
                
                {/* DYNAMIC SIDEBAR SOURCE TEXT */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center mb-1.5">
                    {appMode === 'developer' ? <Code size={12} className="mr-1.5"/> : <FileText size={12} className="mr-1.5"/>}
                    {appMode === 'developer' ? 'Source Code' : 'Source Excerpt'}
                  </label>
                  <pre className={`p-3 rounded-xl text-[10px] overflow-x-auto max-h-48 custom-scroll ${isDarkMode ? 'bg-black border border-slate-800 text-slate-300' : 'bg-slate-900 border-slate-700 text-slate-300'}`}><code>{selectedNode.code_snippet || (appMode === 'developer' ? 'No code provided' : 'No text provided')}</code></pre>
                </div>
                
                {/* DYNAMIC ACTION BUTTON */}
                <div className="pt-2 pb-6">
                  <button onClick={() => handleRefactor(selectedNode)} disabled={isRefactoring} className={`w-full py-2.5 rounded-xl text-xs font-semibold disabled:opacity-70 flex justify-center items-center shadow-md active:scale-95 ${isDarkMode ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'}`}>
                    {isRefactoring ? <Loader2 size={14} className="animate-spin mr-2"/> : <Zap size={14} className="mr-2 text-yellow-400 fill-yellow-400"/>} 
                    {appMode === 'developer' ? 'Ask AI to Refactor' : 'Ask AI to Elaborate'}
                  </button>
                  {refactorSuggestion && <div className={`mt-3 p-3 border rounded-xl text-[10px] whitespace-pre-wrap max-h-64 overflow-y-auto custom-scroll shadow-inner ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200'}`}>{refactorSuggestion}</div>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- VAULT SIDEBAR --- */}
      <div className={`fixed inset-y-0 left-0 w-full sm:w-80 border-r shadow-2xl z-40 transform transition-transform duration-300 flex flex-col ${historySidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <h2 className="text-base font-bold flex items-center"><HardDrive size={18} className="mr-2 text-slate-500"/> Local Vault</h2>
          <button onClick={() => setHistorySidebarOpen(false)} className={`rounded-full p-1.5 shadow-sm border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-800'}`}><X size={18}/></button>
        </div>
        
        <div className={`p-4 border-b space-y-3 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`text-[10px] mb-2 leading-relaxed p-3 rounded-xl border ${isDarkMode ? 'bg-indigo-950 border-indigo-900 text-indigo-300' : 'bg-blue-50 border-blue-100 text-slate-500'}`}>Maps are stored in your session. <b>Export your backup</b> to save them!</div>
          <button onClick={handleExportBackup} className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center shadow-sm ${isDarkMode ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'}`}><DownloadCloud size={16} className="mr-2" /> Export Backup (.json)</button>
          <button onClick={() => importFileRef.current?.click()} className={`w-full py-2.5 border rounded-xl text-xs font-bold flex items-center justify-center shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}><UploadCloud size={16} className="mr-2" /> Import Backup</button>
          <input type="file" ref={importFileRef} accept=".json" onChange={handleImportBackup} className="hidden" />
        </div>
        
        <div className={`flex-1 overflow-y-auto p-4 space-y-3 custom-scroll ${isDarkMode ? 'bg-slate-950/50' : 'bg-slate-50/50'}`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">History</div>
          {localHistory.length === 0 ? <div className={`text-center text-xs mt-6 border-2 border-dashed rounded-xl p-6 ${isDarkMode ? 'text-slate-500 border-slate-700' : 'text-slate-500 border-slate-200'}`}>No maps saved yet.</div> : localHistory.map(item => (
            <div key={item.id} onClick={() => loadFromHistory(item)} className={`p-3 border rounded-xl cursor-pointer group relative transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}`}>
              <div className="flex justify-between items-start mb-1.5"><h3 className={`font-bold text-xs truncate pr-6 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{item.title}</h3><button onClick={(e) => deleteHistoryItem(item.id, e)} className={`absolute top-3 right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-500 ${isDarkMode ? 'text-slate-500 bg-slate-800' : 'text-slate-300 bg-white'}`}><Trash2 size={14}/></button></div>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{new Date(item.createdAt).toLocaleDateString()} • {item.architecture?.nodes?.length || 0} Nodes</div>
            </div>
          ))}
        </div>
      </div>
      
      {historySidebarOpen && <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 animate-in fade-in" onClick={() => setHistorySidebarOpen(false)}></div>}

      {/* --- SAAS FOOTER --- */}
      <footer className={`w-full border-t py-3 px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between text-[10px] font-medium z-10 shrink-0 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>
        <div className="mb-2 sm:mb-0">
          © {new Date().getFullYear()} RepoVue Visualizer. All rights reserved.
        </div>
        <div className="flex space-x-4">
          <a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-slate-300' : 'hover:text-slate-700'}`}>Privacy Policy</a>
          <a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-slate-300' : 'hover:text-slate-700'}`}>Terms of Service</a>
          <a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-slate-300' : 'hover:text-slate-700'}`}>Acceptable Use</a>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scroll::-webkit-scrollbar-thumb { background-color: ${isDarkMode ? '#475569' : '#cbd5e1'}; border-radius: 4px; }
        ${EXPORT_STYLES}
        .node:hover > rect, .node:hover > circle { filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2)); stroke-width: 2px !important; stroke: ${isDarkMode ? '#6366f1' : '#3b82f6'} !important; }
      `}} />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  
  componentDidCatch(error, errorInfo) {
    sendTelemetry('fatal_react_crash', { 
      errorMessage: error.toString(),
      stackTrace: errorInfo.componentStack?.substring(0, 500) || 'No stack trace provided'
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-lg border w-full">
            <h1 className="text-lg font-bold text-slate-800 mb-3 flex items-center"><AlertTriangle className="mr-2 text-red-500"/> Render Error Caught</h1>
            <p className="text-xs text-slate-600 mb-4">The application encountered a critical rendering issue.</p>
            <pre className="bg-slate-900 text-red-400 p-3 rounded-xl text-[10px] overflow-auto max-h-64">{this.state.error.toString()}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Analytics />
      <MainApp />
    </ErrorBoundary>
  );
}
