import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from "@clerk/clerk-react";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
 GitBranch, ZoomIn, ZoomOut, Code, Link, Plus,
 AlertTriangle, Maximize, Loader2, Github,
 Copy, FileText, Zap, Edit3, MessageSquare,
 Download, Camera, Palette, Trash2, Upload, Info,
 HardDrive, DownloadCloud, UploadCloud, Heart, X, History, Save
} from 'lucide-react';

// --- CONFIGURATION ---
const TIP_JAR_LINK = "https://ko-fi.com/isshhan";

// --- Robust Helpers ---
const extractJSON = (text) => {
 try {
   const match = text.match(/```json\n([\s\S]*?)\n```/);
   if (match) return JSON.parse(match[1]);
   const start = text.indexOf('{');
   const end = text.lastIndexOf('}');
   if (start !== -1 && end !== -1) return JSON.parse(text.substring(start, end + 1));
   return JSON.parse(text);
 } catch (e) {
   throw new Error("AI returned malformed data. Please try again.");
 }
};

const sanitizeHtml = (text) => text ? text.replace(/["()\[\]{}]/g, "'").replace(/</g, "<").replace(/>/g, ">").replace(/\n/g, '<br/>') : '';

// --- Cached Mermaid Loader ---
const loadMermaid = () => {
 return new Promise((resolve, reject) => {
   if (window.mermaid) return resolve(window.mermaid);
   const script = document.createElement('script');
   script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
   script.onload = () => {
     window.mermaid.initialize({
       startOnLoad: false, theme: 'base', securityLevel: 'loose',
       themeVariables: { primaryColor: '#ffffff', primaryTextColor: '#1e293b', lineColor: '#94a3b8', fontFamily: 'Inter, sans-serif' },
       flowchart: { htmlLabels: true, curve: 'basis', padding: 20, nodeSpacing: 60, rankSpacing: 70 }
     });
     resolve(window.mermaid);
   };
   script.onerror = reject;
   document.head.appendChild(script);
 });
};

const EXPORT_STYLES = `
 .node-card { padding: 8px; width: 220px; text-align: left; font-family: Inter, sans-serif; white-space: normal; }
 .node-head { border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: flex-start; }
 .node-title { font-weight: 700; font-size: 13px; color: #0f172a; word-break: break-word; line-height: 1.2; }
 .node-badge { font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 8px; white-space: nowrap; margin-left: 6px; }
 .node-badge.cmplx { background: #fee2e2; color: #ef4444; } .node-badge.clean { background: #d1fae5; color: #10b981; }
 .node-info { font-size: 10px; margin-bottom: 4px; line-height: 1.3; }
 foreignObject { overflow: visible !important; }
`;

// --- Dynamic Error Themes ---
const getErrorTheme = (baseError) => {
 const isNetwork = baseError.includes("Network") || baseError.includes("fetch") || baseError.includes("webpage") || baseError.includes("CORS") || baseError.includes("Failed to fetch");
 const themes = [
   {
     type: 'cute', icon: '🥺🐾', title: 'Oopsie Daisies!',
     msg: isNetwork ? "The grumpy internet guards won't let us peek at that link! Sometimes websites block automated visitors to protect their code." : baseError,
     action: "Try downloading your code and dragging the local files into the app instead! ✨",
     styles: { border: 'border-pink-100', text: 'text-pink-800', bgLight: 'bg-pink-50', bgBtn: 'bg-pink-500', hover: 'hover:bg-pink-600', shadow: 'shadow-pink-200' }
   },
   {
     type: 'professional', icon: '🛡️', title: 'Access Restricted',
     msg: isNetwork ? "The target server actively refused the connection. This is typically caused by strict Cross-Origin Resource Sharing (CORS) policies or external network firewalls protecting the codebase." : baseError,
     action: "Please circumvent this network restriction by uploading the source code snippets locally via the Local Files tab.",
     styles: { border: 'border-slate-200', text: 'text-slate-800', bgLight: 'bg-slate-50', bgBtn: 'bg-slate-800', hover: 'hover:bg-slate-900', shadow: 'shadow-slate-200' }
   },
   {
     type: 'quote', icon: '💡', title: 'A Minor Setback',
     msg: isNetwork ? "Network access was denied. But remember:\n\n\"The brick walls are there for a reason. They are not there to keep us out. They are there to give us a chance to show how badly we want something.\"\n— Randy Pausch" : baseError,
     action: "Climb the wall: use the Local Files upload tool to continue analyzing your architecture.",
     styles: { border: 'border-indigo-100', text: 'text-indigo-800', bgLight: 'bg-indigo-50', bgBtn: 'bg-indigo-500', hover: 'hover:bg-indigo-600', shadow: 'shadow-indigo-200' }
   }
 ];
 return themes[Math.floor(Math.random() * themes.length)];
};


// --- Main Application Component ---
function MainApp() {
 const { userId } = useAuth(); // Grabs Clerk ID
 
 // History State
 const [localHistory, setLocalHistory] = useState([]);
 const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
 const importFileRef = useRef(null);

 // Input State
 const [inputMode, setInputMode] = useState('url');
 const [urlInput, setUrlInput] = useState('https://github.com/facebook/react');
 const [localFiles, setLocalFiles] = useState([{ id: 1, name: 'snippet.js', content: '' }]);
 const [isDraggingOver, setIsDraggingOver] = useState(false);
 const [inputError, setInputError] = useState('');

 // App State
 const [status, setStatus] = useState('idle');
 const [statusMessage, setStatusMessage] = useState('');
 const [errorData, setErrorData] = useState(null);
 const [exportMenuOpen, setExportMenuOpen] = useState(false);
 const [toast, setToast] = useState(null);
 
 // Data State
 const [architecture, setArchitecture] = useState(null);
 const [mermaidCode, setMermaidCode] = useState('');
 const [selectedNodeId, setSelectedNodeId] = useState(null);
 const [refactorSuggestion, setRefactorSuggestion] = useState(null);
 const [isRefactoring, setIsRefactoring] = useState(false);

 // Map Controls
 const mapContentRef = useRef(null);
 const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
 const [isDragging, setIsDragging] = useState(false);
 const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

 useEffect(() => { loadMermaid(); }, []);

 const showToast = (msg, type = 'info') => {
   setToast({ msg, type });
   setTimeout(() => setToast(null), 4000);
 };

 // --- Local Vault Methods ---
 const saveToHistory = () => {
   if (!architecture || !mermaidCode) return;
   const title = inputMode === 'url' ? urlInput.split('/').pop() || 'Map' : 'Local Code Snippets';
   const newItem = { id: Date.now().toString(), title, createdAt: Date.now(), architecture, mermaidCode };
   setLocalHistory(prev => [newItem, ...prev]);
   showToast("Map saved to Local Session!", "success");
 };

 const deleteHistoryItem = (id, e) => {
   e.stopPropagation();
   setLocalHistory(prev => prev.filter(item => item.id !== id));
   showToast("Deleted from Local Vault.", "info");
 };

 const loadFromHistory = (item) => {
   setArchitecture(item.architecture);
   setMermaidCode(item.mermaidCode);
   setStatus('ready');
   setHistorySidebarOpen(false);
   setTransform({ x: 0, y: 0, scale: 1 });
   showToast(`Loaded ${item.title}`, "success");
 };

 const handleExportBackup = () => {
   if (localHistory.length === 0) return showToast("Your local history is empty.", "warning");
   const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localHistory));
   const downloadAnchorNode = document.createElement('a');
   downloadAnchorNode.setAttribute("href", dataStr);
   downloadAnchorNode.setAttribute("download", `codemap_backup_${new Date().toISOString().split('T')[0]}.json`);
   document.body.appendChild(downloadAnchorNode);
   downloadAnchorNode.click();
   downloadAnchorNode.remove();
   showToast("Backup saved to your local drive!", "success");
 };

 const handleImportBackup = (e) => {
   const file = e.target.files[0];
   if (!file) return;
   const reader = new FileReader();
   reader.onload = (event) => {
     try {
       const imported = JSON.parse(event.target.result);
       if (Array.isArray(imported)) {
         setLocalHistory(imported);
         showToast("Local History restored successfully!", "success");
       } else {
         showToast("Invalid backup file format.", "error");
       }
     } catch (err) {
       showToast("Failed to parse backup file.", "error");
     }
   };
   reader.readAsText(file);
   e.target.value = null;
 };


 // --- SECURE NETWORK LOGIC ---
 const fetchWithRetry = async (url, options, retries = 3) => {
   for (let i = 0; i < retries; i++) {
     try {
       const res = await fetch(url, options);
       if (!res.ok) throw new Error(`HTTP ${res.status}`);
       return options?.headers?.['Content-Type'] === 'application/json' ? await res.json() : await res.text();
     } catch (e) {
       if (i === retries - 1) throw e;
       await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
     }
   }
 };

 const handleAnalyze = async () => {
   setInputError('');
   let fileContents = [];

   try {
     if (inputMode === 'url') {
       if (!urlInput.trim()) return setInputError("Please enter a valid URL.");
       
       const gitMatch = urlInput.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/);
       if (gitMatch) {
         setStatus('fetching'); setStatusMessage('Fetching repository details...');
         const owner = gitMatch[1]; const repo = gitMatch[2].replace('.git', '');
         const repoData = await fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}`);
         
         setStatusMessage('Scanning codebase structure...');
         const treeData = await fetchWithRetry(`https://api.github.com/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`);
         
         const validExts = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.go', '.rs', '.css', '.html'];
         const files = treeData.tree.filter(f => f.type === 'blob' && validExts.some(ext => f.path.endsWith(ext)) && !f.path.includes('test')).slice(0, 10);
         
         if (!files.length) throw new Error("No supported source files found.");
         setStatusMessage(`Downloading ${files.length} files...`);
         
         fileContents = await Promise.all(files.map(async (f) => {
           const content = await fetchWithRetry(`https://raw.githubusercontent.com/${owner}/${repo}/${repoData.default_branch}/${f.path}`);
           return { path: f.path, content };
         }));
       } else {
         setStatus('fetching'); setStatusMessage('Fetching raw file...');
         let fetchUrl = urlInput.includes('/blob/') ? urlInput.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/') : urlInput;
         const content = await fetchWithRetry(fetchUrl);
         if (content.includes('<html')) throw new Error("URL returned a webpage. Provide a direct link to raw code.");
         fileContents = [{ path: fetchUrl.split('/').pop() || 'fetched_file', content }];
       }
     } else {
       const validFiles = localFiles.filter(f => f.content.trim());
       if (!validFiles.length) return setInputError("Please provide some code snippets.");
       fileContents = validFiles.map(f => ({ path: f.name || 'snippet', content: f.content }));
     }

     setErrorData(null); setArchitecture(null); setMermaidCode(''); setSelectedNodeId(null); setTransform({ x: 0, y: 0, scale: 1 });
     setStatus('analyzing'); setStatusMessage('LLM is extracting logic & UI context...');

     const prompt = `Analyze these source code files. Extract core architecture: classes, functions, caller-callee relationships.
     For each node, extract:
     1. description: 1-sentence summary of logical action.
     2. returns: What it outputs/returns.
     3. ui_design: If UI code, describe the visual design. Leave empty if none.
     Keep to max 20 significant nodes. Strict JSON only:
     {"nodes":[{"id":"n1","label":"Func","type":"function","file":"path","complexity":5,"code_snippet":"...","description":"...","returns":"...","ui_design":"...","userComment":""}],"edges":[{"source":"n1","target":"n2"}]}
     Files: ${fileContents.map(f => `\n--- ${f.path} ---\n${f.content.substring(0, 3000)}`).join('\n')}`;

     // --- SECURE VERCEL API CALL WITH USER ID INJECTED ---
     const aiResponse = await fetch('/api/analyze', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ 
         prompt: prompt,
         userId: userId // <-- Passes ID to secure tier!
       })
     });

     const data = await aiResponse.json();

     if (!aiResponse.ok) {
       throw new Error(data.error || "Failed to reach secure API.");
     }

     const archData = extractJSON(data.candidates[0].content.parts[0].text);
     setArchitecture(archData);
     generateMermaid(archData);
     setStatus('ready');

   } catch (err) {
     setErrorData(getErrorTheme(err.message));
     setStatus('error');
   }
 };

 // --- Map Generator ---
 const generateMermaid = useCallback((data) => {
   if (!data?.nodes) return;
   let m = 'graph TD;\n';
   const files = [...new Set(data.nodes.map(n => n.file))];
   
   files.forEach((file, i) => {
     m += `  subgraph file_${i} ["📄 ${file}"]\n    direction TB\n`;
     data.nodes.filter(n => n.file === file).forEach(node => {
       const isCmplx = node.complexity > 7;
       let html = `<div xmlns="http://www.w3.org/1999/xhtml" class='node-card'>`;
       html += `<div class='node-head'><span class='node-title'>${sanitizeHtml(node.label)}</span><span class='node-badge ${isCmplx ? 'cmplx' : 'clean'}'>C: ${node.complexity}</span></div>`;
       if (node.description) html += `<div class='node-info'>⚡ <b>Action:</b> ${sanitizeHtml(node.description)}</div>`;
       if (node.ui_design) html += `<div class='node-info' style='color:#2563eb;'>🎨 <b>Design:</b> ${sanitizeHtml(node.ui_design)}</div>`;
       if (node.returns) html += `<div class='node-info' style='color:#64748b;'>↩️ <b>Yields:</b> ${sanitizeHtml(node.returns)}</div>`;
       if (node.userComment) html += `<div class='node-info' style='color:#9333ea; margin-top:4px; padding-top:4px; border-top:1px dashed #e2e8f0;'>💬 ${sanitizeHtml(node.userComment)}</div>`;
       html += `</div>`;
       m += `    ${node.id}("${html}"):::${isCmplx ? 'complexNode' : 'cleanNode'}\n`;
     });
     m += `  end\n  style file_${i} fill:#f8fafc50,stroke:#cbd5e1,stroke-width:1px,stroke-dasharray:4 4,rx:12,ry:12\n`;
   });

   data.edges.forEach(e => { m += `  ${e.source} --> ${e.target}\n`; });
   m += `  classDef complexNode fill:#fff1f2,stroke:#fca5a5,stroke-width:1.5px,rx:8px,ry:8px;\n  classDef cleanNode fill:#ffffff,stroke:#e2e8f0,stroke-width:1.5px,rx:8px,ry:8px;\n`;
   setMermaidCode(m);
 }, []);

 // --- Renderer & Interactions ---
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
       mapContentRef.current.querySelectorAll('.node').forEach(n => {
         n.style.cursor = 'pointer';
         n.addEventListener('click', () => {
            const matched = architecture?.nodes?.find(a => n.getAttribute('id').includes(a.id));
            if (matched) { setSelectedNodeId(matched.id); setRefactorSuggestion(null); }
         });
       });
     } catch (err) { console.error("Mermaid Render Error:", err); }
   };
   render();
   return () => { isCancelled = true; };
 }, [mermaidCode, status, architecture]);

 const handleNodeEdit = (id, field, value) => {
   const newArch = { ...architecture, nodes: architecture.nodes.map(n => n.id === id ? { ...n, [field]: value } : n) };
   setArchitecture(newArch); generateMermaid(newArch);
 };

 const handleRefactor = async (node) => {
   if (!node?.code_snippet) return;
   setIsRefactoring(true); setRefactorSuggestion(null);
   try {
     const aiResponse = await fetch('/api/analyze', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ prompt: `Refactor this code to reduce complexity. Explain reasoning.\nCode:\n${node.code_snippet}` })
     });
     const data = await aiResponse.json();
     setRefactorSuggestion(data.candidates[0].content.parts[0].text);
   } catch (err) { setRefactorSuggestion("Failed to generate suggestion. Check your API keys."); }
   finally { setIsRefactoring(false); }
 };

 const exportMap = (type) => {
   setExportMenuOpen(false);
   if (!mapContentRef.current) return;

   const triggerDownload = (url, name) => {
     try {
       const a = document.createElement('a'); a.href = url; a.download = name; a.target = '_blank';
       document.body.appendChild(a); a.click(); setTimeout(() => { document.body.removeChild(a); }, 100);
       showToast(`Successfully exported ${name}`, 'success');
     } catch (e) { showToast("Download blocked. Try another format.", 'error'); }
   };
   
   if (type === 'md') {
     let md = `# Architecture Map\n\n\`\`\`mermaid\n${mermaidCode}\n\`\`\`\n\n## Node Details\n\n`;
     architecture?.nodes.forEach(n => {
       md += `### ${n.label}\n- **File:** \`${n.file}\`\n- **Complexity:** ${n.complexity}\n`;
       if (n.description) md += `- **Action:** ${n.description}\n`;
       if (n.returns) md += `- **Returns:** ${n.returns}\n`;
       if (n.userComment) md += `- **Notes:** ${n.userComment}\n`;
       md += `\n`;
     });
     return triggerDownload(URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' })), 'architecture.md');
   }

   const originalSvg = mapContentRef.current.querySelector('svg');
   if (!originalSvg) return;

   const clonedSvg = originalSvg.cloneNode(true);
   const styleEl = document.createElement('style'); styleEl.textContent = EXPORT_STYLES;
   clonedSvg.insertBefore(styleEl, clonedSvg.firstChild);
   
   const bbox = originalSvg.getBoundingClientRect();
   clonedSvg.setAttribute('width', bbox.width); clonedSvg.setAttribute('height', bbox.height);
   if (!clonedSvg.getAttribute('xmlns')) clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

   const svgData = new XMLSerializer().serializeToString(clonedSvg);
   const svgUrl = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }));
   
   if (type === 'svg') return triggerDownload(svgUrl, 'architecture.svg');
   
   showToast("Generating high-res PNG...", 'info');
   const img = new Image(); img.crossOrigin = "anonymous";
   img.onload = () => {
     try {
       const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
       canvas.width = bbox.width * 2; canvas.height = bbox.height * 2;
       ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, canvas.width, canvas.height);
       ctx.scale(2, 2); ctx.drawImage(img, 0, 0); URL.revokeObjectURL(svgUrl);
       triggerDownload(canvas.toDataURL('image/png'), 'architecture.png');
     } catch (err) {
       showToast("PNG blocked by strict security. Exporting SVG instead.", 'warning');
       triggerDownload(svgUrl, 'architecture.svg');
     }
   };
   img.onerror = () => { showToast("PNG generation failed. Falling back to SVG.", 'warning'); triggerDownload(svgUrl, 'architecture.svg'); };
   img.src = svgUrl;
 };

 const selectedNode = architecture?.nodes?.find(n => n.id === selectedNodeId);

 return (
   <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
     
     {/* --- TOAST NOTIFICATION --- */}
     {toast && (
       <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-200">
         <div className={`px-5 py-3 rounded-full shadow-lg border flex items-center space-x-2 text-sm font-semibold
           ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
             toast.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
             toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
             'bg-slate-900 border-slate-700 text-white'}`}
         >
           {toast.type === 'error' ? <AlertTriangle size={16}/> : <Info size={16}/>}
           <span>{toast.msg}</span>
         </div>
       </div>
     )}

     {/* --- HEADER --- */}
     <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 z-10 shrink-0">
       <div className="flex items-center space-x-3">
         <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-sm"><GitBranch size={20} strokeWidth={2.5} /></div>
         <div><h1 className="text-lg font-bold leading-tight">CodeMap</h1><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Visualizer</p></div>
       </div>

       {status !== 'idle' && (
         <button onClick={() => { setStatus('idle'); setSelectedNodeId(null); setTransform({x:0, y:0, scale:1}); }} className="hidden md:flex items-center space-x-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-full border shadow-sm transition-all font-semibold">
           <Plus size={16} /><span className="text-sm">New Map</span>
         </button>
       )}

       <div className="flex items-center space-x-2">
         
         <button onClick={() => setHistorySidebarOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-medium text-sm transition-colors">
           <History size={16} /> <span className="hidden sm:inline">Vault</span>
         </button>

         {status === 'ready' && (
           <button onClick={saveToHistory} className="flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full font-bold text-sm transition-colors border border-blue-200 shadow-sm">
             <Save size={16} /> <span className="hidden sm:inline">Save Map</span>
           </button>
         )}

         <div className="relative">
           <button onClick={() => setExportMenuOpen(!exportMenuOpen)} disabled={status !== 'ready'} className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full disabled:opacity-30 shadow-sm font-medium text-sm transition-colors">
             <Download size={16} /><span>Export</span>
           </button>
           {exportMenuOpen && status === 'ready' && (
             <div className="absolute right-0 mt-2 w-48 bg-white border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
               <button onClick={() => exportMap('png')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center border-b"><Camera size={16} className="mr-3 text-slate-400" /> High-Res PNG</button>
               <button onClick={() => exportMap('svg')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center border-b"><Camera size={16} className="mr-3 text-slate-400" /> Scalable SVG</button>
               <button onClick={() => exportMap('md')} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 flex items-center"><FileText size={16} className="mr-3 text-slate-400" /> Markdown Docs</button>
             </div>
           )}
         </div>

         <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block"></div>

         {/* TIP JAR BUTTON */}
         <a href={TIP_JAR_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 px-4 py-2 text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-full font-bold text-sm transition-colors border border-pink-200 shadow-sm">
            <Heart size={16} className="fill-current" /> <span className="hidden sm:inline">Support</span>
         </a>

         {/* CLERK LOGIN SYSTEM */}
         <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
         <SignedOut>
           <SignInButton mode="modal">
             <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-sm transition-colors shadow-sm">
               Login
             </button>
           </SignInButton>
         </SignedOut>
         <SignedIn>
           <UserButton afterSignOutUrl="/" />
         </SignedIn>

       </div>
     </header>

     {/* --- WORKSPACE --- */}
     <div className="flex flex-1 overflow-hidden relative">
       <div className="flex-1 relative bg-slate-50 overflow-hidden"
            onWheel={e => setTransform(p => ({ ...p, scale: Math.max(0.1, p.scale - e.deltaY * 0.001) }))}
            onMouseDown={e => { setIsDragging(true); setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y }); }}
            onMouseMove={e => isDragging && setTransform(p => ({ ...p, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }))}
            onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}
       >
         {/* Landing Input */}
         {status === 'idle' && (
           <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-sm p-4 overflow-y-auto custom-scroll">
             <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border overflow-hidden">
               <div className="flex bg-slate-50 border-b">
                 <button className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest ${inputMode === 'url' ? 'bg-white shadow-sm' : 'text-slate-500'}`} onClick={() => setInputMode('url')}><Link className="inline mr-2 mb-0.5" size={16} /> Web Links</button>
                 <button className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest ${inputMode === 'local' ? 'bg-white shadow-sm' : 'text-slate-500'}`} onClick={() => setInputMode('local')}><Code className="inline mr-2 mb-0.5" size={16} /> Local Files / Snippets</button>
               </div>
               
               <div className="p-8">
                 {inputMode === 'url' ? (
                   <input type="text" value={urlInput} onChange={e => { setUrlInput(e.target.value); setInputError(''); }} placeholder="https://github.com/owner/repo OR raw link" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl focus:bg-white outline-none text-lg font-medium" onKeyDown={e => e.key === 'Enter' && handleAnalyze()} />
                 ) : (
                   <div className="space-y-6">
                     <div className={`w-full border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer ${isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`} onDragOver={e=>{e.preventDefault(); setIsDraggingOver(true)}} onDragLeave={()=>setIsDraggingOver(false)} onDrop={e=>{e.preventDefault(); setIsDraggingOver(false); Array.from(e.dataTransfer.files).forEach(f => { const r = new FileReader(); r.onload = (ev) => setLocalFiles(p => (p.length===1 && !p[0].content) ? [{ id: Date.now(), name: f.name, content: ev.target.result }] : [...p, { id: Date.now()+Math.random(), name: f.name, content: ev.target.result }]); r.readAsText(f); });}}>
                       <input type="file" multiple className="hidden" id="file-upload" onChange={e => Array.from(e.target.files).forEach(f => { const r = new FileReader(); r.onload = (ev) => setLocalFiles(p => (p.length===1 && !p[0].content) ? [{ id: Date.now(), name: f.name, content: ev.target.result }] : [...p, { id: Date.now()+Math.random(), name: f.name, content: ev.target.result }]); r.readAsText(f); })} />
                       <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center"><Upload size={28} className="text-slate-400 mb-2" /><span className="text-sm font-bold text-slate-700">Drag & Drop files or Browse</span></label>
                     </div>
                     <div className="max-h-64 overflow-y-auto space-y-3 custom-scroll pr-2">
                       {localFiles.map((file) => (
                         <div key={file.id} className="border rounded-xl overflow-hidden flex flex-col">
                           <div className="flex bg-slate-50 px-3 py-2 border-b">
                             <input type="text" value={file.name} onChange={e => setLocalFiles(p => p.map(f => f.id === file.id ? { ...f, name: e.target.value } : f))} className="bg-transparent text-sm font-bold flex-1 outline-none" placeholder="filename.js" />
                             <button onClick={() => setLocalFiles(p => p.filter(f => f.id !== file.id))} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                           </div>
                           <textarea value={file.content} onChange={e => setLocalFiles(p => p.map(f => f.id === file.id ? { ...f, content: e.target.value } : f))} className="w-full h-24 p-3 text-sm font-mono resize-none outline-none custom-scroll" placeholder="// Code..." />
                         </div>
                       ))}
                     </div>
                     <button onClick={() => setLocalFiles(p => [...p, { id: Date.now(), name: `snippet_${p.length + 1}.js`, content: '' }])} className="text-xs font-bold text-blue-600 flex items-center"><Plus size={14} className="mr-1"/> Add Section</button>
                   </div>
                 )}

                 {inputError && <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl flex items-center text-sm font-medium"><AlertTriangle size={16} className="mr-2" />{inputError}</div>}
                 <button onClick={handleAnalyze} className="mt-8 w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-slate-800 transition-colors">Generate Architecture Map</button>
               </div>
             </div>
           </div>
         )}

         {/* Loaders & Dynamic Personality Errors */}
         {status !== 'idle' && status !== 'ready' && (
           <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm p-4">
              {status === 'error' && errorData ? (
                <div className={`text-center bg-white p-8 rounded-[2rem] shadow-2xl border ${errorData.styles.border} max-w-md w-full animate-in zoom-in-95 duration-300`}>
                   <div className="text-5xl mb-4">{errorData.icon}</div>
                   <h3 className={`text-xl font-bold ${errorData.styles.text} mb-3`}>{errorData.title}</h3>
                   <p className="text-slate-600 font-medium leading-relaxed mb-6 whitespace-pre-wrap text-sm">{errorData.msg}</p>
                   
                   <div className={`${errorData.styles.bgLight} p-4 rounded-xl border ${errorData.styles.border} text-sm ${errorData.styles.text} text-left mb-6 font-medium`}>
                     <b>Action:</b> {errorData.action}
                   </div>
                   
                   <button onClick={() => setStatus('idle')} className={`w-full py-4 ${errorData.styles.bgBtn} ${errorData.styles.hover} text-white font-bold rounded-xl transition-colors shadow-lg ${errorData.styles.shadow}`}>
                     Return to Input
                   </button>
                </div>
              ) : (
                <div className="text-center bg-white p-8 rounded-3xl shadow-xl border w-full max-w-sm"><Loader2 size={40} className="animate-spin text-slate-800 mx-auto mb-4"/><h3 className="text-xl font-bold mb-1">Analyzing</h3><p className="text-slate-500 font-medium">{statusMessage}</p></div>
              )}
           </div>
         )}

         {/* Map Viewport Controls */}
         {status === 'ready' && (
           <div className="absolute bottom-6 right-6 z-10 flex space-x-1 bg-white p-2 rounded-2xl shadow-md border">
             <button onClick={() => setTransform(p => ({ ...p, scale: p.scale + 0.2 }))} className="p-2 hover:bg-slate-100 rounded-lg"><ZoomIn size={18}/></button>
             <button onClick={() => setTransform(p => ({ ...p, scale: Math.max(0.1, p.scale - 0.2) }))} className="p-2 hover:bg-slate-100 rounded-lg"><ZoomOut size={18}/></button>
             <button onClick={() => setTransform({ x: 0, y: 0, scale: 1 })} className="p-2 hover:bg-slate-100 rounded-lg"><Maximize size={18}/></button>
           </div>
         )}

         <div className="w-full h-full origin-top-left cursor-grab active:cursor-grabbing flex items-center justify-center min-w-max min-h-max p-20" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
           <div ref={mapContentRef} />
         </div>
       </div>

       {/* --- NODE DETAILS SIDEBAR --- */}
       <div className={`w-96 bg-white border-l shadow-2xl z-20 transition-transform duration-300 flex flex-col ${selectedNodeId ? 'translate-x-0' : 'translate-x-full absolute right-0 top-0 bottom-0'}`}>
         {selectedNode && (
           <>
             <div className="p-5 border-b shrink-0">
               <div className="flex justify-between items-start mb-3">
                 <span className="px-2 py-1 text-xs font-bold uppercase bg-slate-100 text-slate-500 rounded">{selectedNode.type}</span>
                 <button onClick={() => setSelectedNodeId(null)} className="text-slate-400 hover:text-slate-800">×</button>
               </div>
               <input type="text" value={selectedNode.label} onChange={e => handleNodeEdit(selectedNode.id, 'label', e.target.value)} className="w-full text-xl font-bold outline-none border-b border-transparent focus:border-slate-300 transition-colors" />
               <div className="text-xs text-slate-400 mt-1 truncate">{selectedNode.file}</div>
             </div>

             <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scroll">
               <div className="grid grid-cols-2 gap-3">
                 <div className={`p-3 rounded-xl border ${selectedNode.complexity > 7 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
                   <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Complexity</div>
                   <div className="text-2xl font-bold">{selectedNode.complexity}</div>
                 </div>
                 <div className="p-3 rounded-xl border bg-slate-50 flex flex-col justify-center">
                   <div className="text-xs font-bold uppercase text-slate-500 mb-1">Status</div>
                   <div className={`text-sm font-bold ${selectedNode.complexity > 7 ? 'text-red-600' : 'text-slate-700'}`}>{selectedNode.complexity > 7 ? 'Needs Refactor' : 'Clean'}</div>
                 </div>
               </div>

               <div className="space-y-3">
                 {selectedNode.description && <div className="bg-slate-50 rounded-xl p-3 border text-sm text-slate-700"><Zap size={14} className="inline mr-1 text-slate-400"/> {selectedNode.description}</div>}
                 {selectedNode.returns && <div className="bg-slate-50 rounded-xl p-3 border text-sm text-slate-700 font-mono">↩️ {selectedNode.returns}</div>}
                 {selectedNode.ui_design && <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-sm text-blue-900"><Palette size={14} className="inline mr-1"/> {selectedNode.ui_design}</div>}
               </div>

               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase flex items-center mb-2"><MessageSquare size={14} className="mr-2"/> Graph Notes</label>
                 <textarea value={selectedNode.userComment || ''} onChange={e => handleNodeEdit(selectedNode.id, 'userComment', e.target.value)} placeholder="Type a note here..." className="w-full h-16 p-2 bg-slate-50 border rounded-lg outline-none text-sm resize-none custom-scroll" />
               </div>

               <div>
                 <label className="text-xs font-bold text-slate-500 uppercase flex items-center mb-2"><Code size={14} className="mr-2"/> Source Code</label>
                 <pre className="bg-slate-50 border text-slate-800 p-3 rounded-xl text-xs overflow-x-auto max-h-48 custom-scroll"><code>{selectedNode.code_snippet}</code></pre>
               </div>

               <div className="pt-2">
                 <button onClick={() => handleRefactor(selectedNode)} disabled={isRefactoring} className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold disabled:opacity-70 flex justify-center items-center">
                   {isRefactoring ? <Loader2 size={16} className="animate-spin mr-2"/> : <Zap size={16} className="mr-2 text-yellow-400"/>} Ask AI to Refactor
                 </button>
                 {refactorSuggestion && <div className="mt-3 p-4 bg-slate-50 border rounded-xl text-xs whitespace-pre-wrap max-h-64 overflow-y-auto custom-scroll leading-relaxed">{refactorSuggestion}</div>}
               </div>
             </div>
           </>
         )}
       </div>
     </div>

     {/* --- HISTORY SIDEBAR (Local File Approach) --- */}
     <div className={`fixed inset-y-0 left-0 w-80 bg-white border-r shadow-2xl z-40 transform transition-transform duration-300 flex flex-col ${historySidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
       <div className="p-5 border-b flex justify-between items-center bg-slate-50">
         <h2 className="text-lg font-bold flex items-center"><HardDrive size={18} className="mr-2"/> Local Vault</h2>
         <button onClick={() => setHistorySidebarOpen(false)} className="text-slate-400 hover:text-slate-800"><X size={20}/></button>
       </div>
       
       <div className="p-4 border-b bg-white space-y-3">
          <div className="text-xs text-slate-500 mb-2 leading-relaxed">
            Maps are temporarily stored in your session. <b>Export your backup</b> to save them to your local hard drive, and <b>Import</b> them when you return!
          </div>
          <button onClick={handleExportBackup} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center justify-center transition-colors shadow-sm">
             <DownloadCloud size={16} className="mr-2" /> Export Backup (.json)
          </button>
          <button onClick={() => importFileRef.current?.click()} className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold flex items-center justify-center transition-colors shadow-sm">
             <UploadCloud size={16} className="mr-2" /> Import Backup
          </button>
          <input type="file" ref={importFileRef} accept=".json" onChange={handleImportBackup} className="hidden" />
       </div>

       <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll bg-slate-50/50">
         <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Current Session History</div>
         {localHistory.length === 0 ? (
           <div className="text-center text-sm text-slate-500 mt-6">No maps saved yet.</div>
         ) : (
           localHistory.map(item => (
             <div key={item.id} onClick={() => loadFromHistory(item)} className="p-4 border rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group bg-white">
               <div className="flex justify-between items-start mb-2">
                 <h3 className="font-bold text-sm text-slate-800 truncate pr-2">{item.title}</h3>
                 <button onClick={(e) => deleteHistoryItem(item.id, e)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
               </div>
               <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                 {new Date(item.createdAt).toLocaleDateString()} • {item.architecture?.nodes?.length || 0} Nodes
               </div>
             </div>
           ))
         )}
       </div>
     </div>
     
     {historySidebarOpen && <div className="fixed inset-0 bg-slate-900/20 z-30 animate-in fade-in" onClick={() => setHistorySidebarOpen(false)}></div>}

     <style dangerouslySetInnerHTML={{__html: `
       .custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
       .custom-scroll::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
       ${EXPORT_STYLES}
       .node:hover > rect, .node:hover > circle { filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1)); stroke-width: 2px !important; stroke: #3b82f6 !important; }
     `}} />
   </div>
 );
}

// --- CRASH PROOF WRAPPER ---
class ErrorBoundary extends React.Component {
 constructor(props) { super(props); this.state = { hasError: false, error: null }; }
 static getDerivedStateFromError(error) { return { hasError: true, error }; }
 render() {
   if (this.state.hasError) {
     return (
       <div className="flex h-screen items-center justify-center bg-slate-50 p-8">
         <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl border">
           <h1 className="text-2xl font-bold text-slate-800 mb-4 flex items-center"><AlertTriangle className="mr-2 text-red-500"/> Render Error Caught</h1>
           <p className="text-slate-600 mb-4">The application encountered a rendering issue. Please reload.</p>
           <pre className="bg-slate-900 text-red-400 p-4 rounded-xl text-xs overflow-auto">{this.state.error.toString()}</pre>
         </div>
       </div>
     );
   }
   return this.props.children;
 }
}

export default function App() {
 return <ErrorBoundary><MainApp /></ErrorBoundary>;
}