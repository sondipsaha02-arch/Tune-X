import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Folder,
  FileCode,
  Download,
  Smartphone,
  X,
  ChevronRight,
  ArrowLeft,
  FileText,
  Package,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Code,
  HardDrive,
  Copy,
  Check,
  QrCode
} from "lucide-react";

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FileItem {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  mtime: string | null;
}

export function FileManagerModal({ isOpen, onClose }: FileManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"apk" | "files">("apk");

  // File Manager State
  const [currentDir, setCurrentDir] = useState<string>(".");
  const [filesList, setFilesList] = useState<FileItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<string | null>("server.ts");
  const [fileContent, setFileContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState<boolean>(false);

  // Copy helper
  const [copiedPath, setCopiedPath] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Catch PWA Install Prompt for Android
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  // Fetch Directory Files
  const fetchDirectory = async (dir: string) => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/files/list?dir=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (data.files) {
        setFilesList(data.files);
        setCurrentDir(dir);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Fetch File Content
  const fetchFileContent = async (filePath: string) => {
    setLoadingContent(true);
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setFileContent(data.content);
        setSelectedFile(filePath);
      }
    } catch (err) {
      console.error("Error reading file:", err);
      setFileContent("// Failed to load file contents");
    } finally {
      setLoadingContent(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDirectory(currentDir);
      if (selectedFile) {
        fetchFileContent(selectedFile);
      }
    }
  }, [isOpen]);

  const handleNavigateUp = () => {
    if (currentDir === "." || !currentDir) return;
    const parts = currentDir.split("/").filter(Boolean);
    parts.pop();
    const parentDir = parts.length > 0 ? parts.join("/") : ".";
    fetchDirectory(parentDir);
  };

  const handleInstallPWA = () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      installPromptEvent.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          setIsInstalled(true);
        }
        setInstallPromptEvent(null);
      });
    } else {
      alert("👉 To install on Android Mobile:\n\n1. Open this website in Google Chrome on your phone.\n2. Tap the 3 dots menu (⋮) at top right.\n3. Tap 'Add to Home screen' or 'Install app'!");
    }
  };

  const handleCopyPath = (pathText: string) => {
    navigator.clipboard.writeText(pathText);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-5xl h-[88vh] bg-[#0c0c14]/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans"
        >
          {/* HEADER BAR */}
          <div className="px-5 py-4 bg-[#12121d] border-b border-white/10 flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-wider text-white flex items-center gap-2">
                  TUNE FILE MANAGER & ANDROID APK HUB
                  <span className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 border border-green-500/30 font-mono text-[9px] uppercase font-semibold">
                    Android Ready
                  </span>
                </h2>
                <p className="text-[10px] text-white/40 font-mono">WORKSPACE FILES & MOBILE INSTALLATION PACKAGE</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setActiveTab("apk")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === "apk" ? "bg-cyan-500 text-zinc-950 shadow-md font-bold" : "text-white/50 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> <span>Android APK Hub</span>
                </button>
                <button
                  onClick={() => setActiveTab("files")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === "files" ? "bg-blue-500 text-white shadow-md font-bold" : "text-white/50 hover:text-white"
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" /> <span>File Manager</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition cursor-pointer border border-white/5"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* BODY CONTENT */}
          <div className="flex-1 overflow-hidden relative flex flex-col bg-[#07070b]">
            {/* TAB 1: ANDROID APK & MOBILE HUB */}
            {activeTab === "apk" && (
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {/* Main Featured Download Card */}
                <div className="bg-gradient-to-br from-cyan-950/40 via-[#101322] to-blue-950/30 border border-cyan-500/30 rounded-2xl p-5 md:p-6 relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Smartphone className="w-48 h-48 text-cyan-400" />
                  </div>

                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-xl">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-medium">
                        <Sparkles className="w-3.5 h-3.5" /> Tune Companion v1.0 Android Edition
                      </div>
                      <h3 className="text-xl md:text-2xl font-extrabold text-white tracking-wide">
                        Download Tune APK for Android Mobile
                      </h3>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Easily install and run Tune directly on your Android phone! Full support for real-time Bengali AI conversation, offline companion scripts, and background voice activation.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                      <a
                        href="/api/download/TuneCompanion.apk"
                        download="TuneCompanion_v1.0_Android.apk"
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-zinc-950" />
                        <span>Download Android APK (v1.0)</span>
                      </a>

                      <a
                        href="/api/download/project.zip"
                        download="TuneCompanion_Source_Bundle.zip"
                        className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Package className="w-4 h-4 text-cyan-400" />
                        <span>Download Source (.zip)</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* 1-Click PWA Installation Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#0e0e18] border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 text-green-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
                        <Smartphone className="w-4 h-4" /> Direct Android WebAPK / PWA
                      </div>
                      <h4 className="text-base font-bold text-white">1-Click Android WebApp Installation</h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Add Tune directly to your Android home screen as a native full-screen app without needing standard store approvals!
                      </p>
                    </div>

                    <button
                      onClick={handleInstallPWA}
                      className="w-full py-2.5 px-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isInstalled ? "✓ Installed on Phone" : "Install App to Home Screen"}</span>
                    </button>
                  </div>

                  <div className="bg-[#0e0e18] border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
                        <HardDrive className="w-4 h-4" /> Direct Mobile Server Link
                      </div>
                      <h4 className="text-base font-bold text-white">Open on Mobile Browser</h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Scan or open this active server URL directly in Chrome on your Android mobile device:
                      </p>
                      <div className="mt-2 bg-black/60 p-2.5 rounded-lg border border-white/10 font-mono text-[11px] text-cyan-300 truncate">
                        {window.location.origin}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyPath(window.location.origin)}
                      className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      {copiedPath ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                      <span>{copiedPath ? "Link Copied!" : "Copy Mobile URL"}</span>
                    </button>
                  </div>
                </div>

                {/* Step-by-Step Installation Guide (Bengali & English) */}
                <div className="bg-[#0b0b12] border border-white/10 rounded-2xl p-5 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 uppercase font-mono tracking-wider text-cyan-400">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    How to Install APK on Android (সহজ ইন্সটলেশন গাইড)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Bengali Step Guide */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-2.5 text-zinc-300">
                      <p className="font-bold text-cyan-300 border-b border-white/10 pb-1.5">
                        🇧🇩 বাংলায় ইন্সটলেশন ধাপ:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 leading-relaxed text-[11px]">
                        <li>
                          উপরে দেওয়া <span className="text-cyan-400 font-bold">"Download Android APK"</span> বাটনে ক্লিক করে ফাইলটি ডাউনলোড করুন।
                        </li>
                        <li>
                          আপনার অ্যান্ড্রেয়েড ফোনের <span className="text-yellow-400 font-bold">Files / My Files / Downloads</span> ফোল্ডার ওপেন করুন।
                        </li>
                        <li>
                          <span className="text-green-400 font-bold">TuneCompanion_v1.0_Android.apk</span> ফাইলের ওপর ট্যাপ করুন।
                        </li>
                        <li>
                          যদি সিকিউরিটি ওয়ার্নিং দেখায়, তবে <span className="text-cyan-300">"Allow installation from unknown sources"</span> পারমিশন অন করুন।
                        </li>
                        <li>
                          ইন্সটল সম্পন্ন হলে আপনার ফোনের হোম স্ক্রিন থেকে সরাসরী চালু করুন!
                        </li>
                      </ol>
                    </div>

                    {/* English Step Guide */}
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4 space-y-2.5 text-zinc-300">
                      <p className="font-bold text-cyan-300 border-b border-white/10 pb-1.5">
                        🇬🇧 English Step-by-Step Guide:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 leading-relaxed text-[11px]">
                        <li>
                          Tap <span className="text-cyan-400 font-bold">"Download Android APK"</span> above to download the installer to your mobile device.
                        </li>
                        <li>
                          Open your Android phone's <span className="text-yellow-400 font-bold">Files</span> or <span className="text-yellow-400 font-bold">Downloads</span> application.
                        </li>
                        <li>
                          Tap <span className="text-green-400 font-bold">TuneCompanion_v1.0_Android.apk</span> to begin installation.
                        </li>
                        <li>
                          If prompted by Android, toggle <span className="text-cyan-300">"Allow from this source"</span> for your browser or file manager.
                        </li>
                        <li>
                          Tap **Install** and launch **Tune AI Companion** directly from your mobile launcher!
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: IN-APP FILE MANAGER */}
            {activeTab === "files" && (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
                {/* File Tree Directory View */}
                <div className="w-full md:w-80 bg-[#0a0a10] border-r border-white/10 flex flex-col h-full overflow-hidden">
                  {/* Current Dir Navigation Bar */}
                  <div className="p-3 bg-[#11111a] border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <button
                        onClick={handleNavigateUp}
                        disabled={currentDir === "."}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white/70 transition cursor-pointer"
                        title="Go up to parent folder"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-xs text-cyan-300 truncate font-semibold">
                        {currentDir === "." ? "root" : currentDir}
                      </span>
                    </div>

                    <a
                      href={`/api/download/file?path=${encodeURIComponent(selectedFile || "")}`}
                      download
                      className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Download selected file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Directory Items List */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loadingFiles ? (
                      <div className="p-4 text-center font-mono text-xs text-white/40">Loading workspace files...</div>
                    ) : (
                      filesList.map((item) => (
                        <div
                          key={item.relativePath}
                          onClick={() => {
                            if (item.isDirectory) {
                              fetchDirectory(item.relativePath);
                            } else {
                              fetchFileContent(item.relativePath);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition cursor-pointer ${
                            selectedFile === item.relativePath
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold"
                              : "text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {item.isDirectory ? (
                              <Folder className="w-4 h-4 text-yellow-400 shrink-0" />
                            ) : (
                              <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                            )}
                            <span className="truncate">{item.name}</span>
                          </div>
                          <span className="text-[10px] text-white/30 shrink-0 font-sans">
                            {item.isDirectory ? "DIR" : `${(item.size / 1024).toFixed(1)} KB`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* File Preview Content Display */}
                <div className="flex-1 bg-[#050508] flex flex-col h-full overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#0e0e18] border-b border-white/10 flex justify-between items-center select-none">
                    <div className="flex items-center gap-2 font-mono text-xs text-white/70">
                      <Code className="w-4 h-4 text-cyan-400" />
                      <span>{selectedFile || "No file selected"}</span>
                    </div>

                    {selectedFile && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyPath(fileContent)}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-mono text-zinc-300 flex items-center gap-1 border border-white/10 transition cursor-pointer"
                        >
                          {copiedPath ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
                          <span>{copiedPath ? "Copied" : "Copy Code"}</span>
                        </button>
                        <a
                          href={`/api/download/file?path=${encodeURIComponent(selectedFile)}`}
                          download
                          className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download File</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-auto p-4 font-mono text-xs text-cyan-200 leading-relaxed select-text">
                    {loadingContent ? (
                      <div className="text-white/40 font-mono text-xs">Loading content...</div>
                    ) : fileContent ? (
                      <pre className="whitespace-pre-wrap break-all">{fileContent}</pre>
                    ) : (
                      <div className="text-white/30 font-mono text-xs italic">Select a file from the file explorer to view its contents.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
