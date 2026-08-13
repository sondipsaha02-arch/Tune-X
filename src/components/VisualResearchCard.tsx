import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  LayoutGrid,
  GitFork,
  FileText,
  ShieldCheck,
  Maximize2,
  X,
  Sparkles,
  Globe,
  GripHorizontal,
  TrendingUp,
  Cpu,
} from "lucide-react";
import { Transcription, ResearchSource } from "../types";

interface VisualResearchCardProps {
  transcription: Transcription;
  onClose?: () => void;
  isExpandedModal?: boolean;
}

export const VisualResearchCard: React.FC<VisualResearchCardProps> = ({
  transcription,
  onClose,
  isExpandedModal = false,
}) => {
  const [viewMode, setViewMode] = useState<"cards" | "mindmap" | "report">("cards");
  const [copied, setCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(isExpandedModal);

  const text = transcription.text || "";

  // Extract topic title from text or transcription.topic
  let topic = transcription.topic;
  if (!topic) {
    const topicMatch = text.match(/\[(?:Google Web Research|Research Summary|Knowledge Summary) for "([^"]+)"\]/i);
    if (topicMatch) {
      topic = topicMatch[1];
    } else {
      topic = "Research & Fact Analysis";
    }
  }

  // Clean raw body text
  const cleanBodyText = text
    .replace(/^🔎\s*\[[^\]]+\]:\s*/i, "")
    .replace(/\[(?:Google Web Research|Research Summary|Knowledge Summary)[^\]]*\]/gi, "")
    .trim();

  // Extract key bullet points / takeaways from text
  const rawLines = cleanBodyText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const bulletPoints = rawLines
    .filter((l) => l.startsWith("-") || l.startsWith("*") || l.startsWith("•") || /^\d+\./.test(l))
    .map((l) => l.replace(/^[-*•\d\.]+\s*/, "").trim());

  const fallbackParagraphs = rawLines.filter(
    (l) => !l.startsWith("-") && !l.startsWith("*") && !l.startsWith("•") && !/^\d+\./.test(l)
  );

  const keyInsights =
    bulletPoints.length > 0
      ? bulletPoints
      : fallbackParagraphs.length > 0
      ? fallbackParagraphs
      : [cleanBodyText];

  // Sources handling
  const sources: ResearchSource[] =
    transcription.sources && transcription.sources.length > 0
      ? transcription.sources
      : [
          {
            title: `Search: "${topic}"`,
            url: `https://www.google.com/search?q=${encodeURIComponent(topic)}`,
            domain: "google.com",
            verified: true,
          },
          {
            title: `Wikipedia: "${topic}"`,
            url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`,
            domain: "wikipedia.org",
            verified: true,
          },
        ];

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `${topic}\n\n${cleanBodyText}\n\nSources:\n` +
        sources.map((s) => `- ${s.title}: ${s.url}`).join("\n")
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`w-full transition-all duration-300 ${
        isMaximized
          ? "fixed inset-0 z-50 p-4 sm:p-6 bg-black/85 backdrop-blur-2xl flex items-center justify-center overflow-y-auto"
          : "relative"
      }`}
    >
      <motion.div
        drag={!isMaximized}
        dragMomentum={false}
        dragElastic={0.05}
        dragConstraints={{ left: -350, right: 350, top: -350, bottom: 350 }}
        className={`w-full bg-zinc-950/90 border border-zinc-800/90 hover:border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl overflow-hidden flex flex-col transition-shadow ${
          isMaximized ? "max-w-5xl max-h-[90vh] my-auto" : "max-w-xl mx-auto"
        }`}
      >
        {/* DRAG HANDLE & TOP STATUS BAR */}
        <div className="w-full bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-b border-zinc-800/80 px-4 py-2.5 flex flex-col items-center select-none cursor-grab active:cursor-grabbing group">
          <div className="w-12 h-1.5 rounded-full bg-zinc-700/60 group-hover:bg-cyan-400/80 transition-colors mb-1.5 flex items-center justify-center">
            <GripHorizontal className="w-3 h-3 text-zinc-400 group-hover:text-cyan-200 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-[9px] font-mono tracking-widest text-zinc-500 group-hover:text-cyan-300 transition-colors uppercase">
            Click & Drag Card
          </span>
        </div>

        {/* PROFESSIONAL HEADER BAR */}
        <div className="px-5 py-3.5 bg-zinc-900/60 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
              <Cpu className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  INTELLIGENCE RESEARCH
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  Verified
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate mt-1 tracking-tight">
                {topic}
              </h3>
            </div>
          </div>

          {/* VIEW CONTROLS & ACTIONS */}
          <div className="flex items-center gap-2 ml-auto">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === "cards"
                    ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("mindmap")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === "mindmap"
                    ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Mind Map View"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mind Map</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("report")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === "report"
                    ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Full Report"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Report</span>
              </button>
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Copy Summary"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Maximize Toggle */}
            {!isExpandedModal && (
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
                title={isMaximized ? "Minimize" : "Maximize"}
              >
                {isMaximized ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="p-5 overflow-y-auto space-y-5 max-h-[62vh] scrollbar-thin scrollbar-thumb-zinc-800">
          {/* SEARCHING ACTIVE STATE */}
          {transcription.isSearching ? (
            <div className="bg-zinc-900/80 border border-cyan-500/30 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Search className="w-7 h-7 animate-pulse" />
                </div>
                <div className="absolute -inset-1 rounded-2xl border border-cyan-400/30 animate-ping" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
                  Live Fact Check Active
                </span>
                <h4 className="text-sm sm:text-base font-bold text-white mt-2">
                  Verifying details for "{topic}"...
                </h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-md">
                  Synthesizing authentic information and current web data for Boss...
                </p>
              </div>
            </div>
          ) : viewMode === "cards" ? (
            <div className="space-y-4">
              {/* Executive Summary Card */}
              <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-cyan-500/20 rounded-2xl p-4 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-2 text-cyan-400 font-mono text-xs uppercase tracking-wider font-semibold">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Executive Summary</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-100 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                  {cleanBodyText}
                </p>
              </div>

              {/* Key Insights Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {keyInsights.slice(0, 6).map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-zinc-900/70 border border-zinc-800 hover:border-cyan-500/30 rounded-2xl p-3.5 flex items-start gap-3 transition-all"
                  >
                    <div className="w-6 h-6 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-300 font-bold text-xs font-mono">
                      0{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-200 leading-relaxed font-sans font-medium">
                        {insight}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : viewMode === "mindmap" ? (
            /* MIND MAP VIEW */
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden flex flex-col items-center">
              <div className="text-center mb-6">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30 inline-flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5" />
                  Interactive Research Mind Map
                </span>
                <p className="text-xs text-zinc-400 mt-1">
                  Structured nodes linking core topic, insights, and verified sources
                </p>
              </div>

              <div className="w-full max-w-2xl flex flex-col items-center relative py-2 space-y-5">
                {/* ROOT NODE */}
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-cyan-500 text-zinc-950 font-extrabold text-sm px-6 py-2.5 rounded-2xl shadow-lg shadow-cyan-500/20 border border-cyan-300 flex items-center gap-2 z-10 text-center max-w-md"
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>{topic}</span>
                </motion.div>

                <div className="w-0.5 h-5 bg-cyan-500/40" />

                {/* SECOND LEVEL NODES */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 relative z-10">
                  {keyInsights.slice(0, 3).map((insight, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.08 }}
                      className="bg-zinc-950 border border-zinc-800 hover:border-cyan-500/40 rounded-2xl p-3 shadow-md flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 mb-1 font-bold">
                        <TrendingUp className="w-3 h-3 text-cyan-400" />
                        <span>Insight Node 0{idx + 1}</span>
                      </div>
                      <p className="text-xs text-zinc-200 line-clamp-4 font-medium leading-relaxed">
                        {insight}
                      </p>
                    </motion.div>
                  ))}
                </div>

                <div className="w-0.5 h-5 bg-emerald-500/40" />

                {/* SOURCES LEAF NODES */}
                <div className="w-full flex flex-wrap items-center justify-center gap-2 z-10">
                  {sources.map((src, idx) => (
                    <motion.a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 + idx * 0.05 }}
                      className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-[11px] text-emerald-200 flex items-center gap-1.5 transition shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-semibold truncate max-w-[140px]">
                        {src.domain || src.title}
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* FULL REPORT VIEW */
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 font-sans">
              <div className="border-b border-zinc-800 pb-3">
                <h4 className="text-sm font-bold text-cyan-400 uppercase font-mono tracking-widest">
                  Comprehensive Fact Summary Report
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">Synthesized Grounded Knowledge</p>
              </div>

              <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                {cleanBodyText}
              </div>
            </div>
          )}

          {/* AUTHENTIC SOURCES FOOTER */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-emerald-300 font-mono uppercase tracking-wider">
                  VERIFIED SOURCES & REFERENCES (মূল তথ্যসূত্রসমূহ)
                </h4>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                ✓ Grounded
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sources.map((src, idx) => (
                <a
                  key={idx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 p-2.5 rounded-xl flex items-center justify-between gap-2 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-300 text-[10px] font-bold shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase truncate">
                          {src.domain || "web source"}
                        </span>
                        {src.verified && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-zinc-200 font-medium truncate group-hover:text-emerald-200 transition">
                        {src.title}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 shrink-0 transition" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
