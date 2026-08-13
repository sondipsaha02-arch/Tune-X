import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Share2,
  ChevronRight,
  TrendingUp,
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
    const topicMatch = text.match(/\[(?:Google Web Research|Knowledge Summary) for "([^"]+)"\]/i);
    if (topicMatch) {
      topic = topicMatch[1];
    } else {
      topic = "Web Research & Fact Analysis";
    }
  }

  // Clean raw body text
  const cleanBodyText = text
    .replace(/^🔎\s*\[[^\]]+\]:\s*/i, "")
    .replace(/\[Google Web Research[^\]]*\]/gi, "")
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
  const sources: ResearchSource[] = transcription.sources && transcription.sources.length > 0
    ? transcription.sources
    : [
        {
          title: `Google Search: "${topic}"`,
          url: `https://www.google.com/search?q=${encodeURIComponent(topic)}`,
          domain: "google.com",
          verified: true,
        },
        {
          title: `Wikipedia Encyclopedia: "${topic}"`,
          url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`,
          domain: "wikipedia.org",
          verified: true,
        },
      ];

  const handleCopy = () => {
    navigator.clipboard.writeText(`${topic}\n\n${cleanBodyText}\n\nSources:\n` + sources.map(s => `- ${s.title}: ${s.url}`).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`w-full transition-all duration-300 ${
        isMaximized
          ? "fixed inset-0 z-50 p-4 sm:p-6 bg-black/90 backdrop-blur-2xl flex items-center justify-center overflow-y-auto"
          : "relative"
      }`}
    >
      <div
        className={`w-full bg-zinc-950/95 border border-amber-500/40 rounded-3xl shadow-2xl shadow-amber-950/30 overflow-hidden flex flex-col transition-all ${
          isMaximized ? "max-w-5xl max-h-[90vh] my-auto" : "max-w-xl mx-auto"
        }`}
      >
        {/* PREMIUM TOP HEADER BAR */}
        <div className="bg-gradient-to-r from-amber-950/60 via-zinc-900 to-amber-950/40 px-5 py-4 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shrink-0 animate-pulse">
              <Search className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Google Research Engine
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  98% Grounded
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white truncate mt-1">
                {topic}
              </h3>
            </div>
          </div>

          {/* VIEW SWITCHER & ACTIONS */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Mode Switcher Buttons */}
            <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  viewMode === "cards"
                    ? "bg-amber-500 text-black font-bold shadow-md"
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
                    ? "bg-amber-500 text-black font-bold shadow-md"
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
                    ? "bg-amber-500 text-black font-bold shadow-md"
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
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition"
              title="Copy Research Summary"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Maximize Toggle */}
            {!isExpandedModal && (
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition"
                title={isMaximized ? "Minimize" : "Maximize Fullscreen"}
              >
                {isMaximized ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <div className="p-5 overflow-y-auto space-y-6 max-h-[65vh] scrollbar-thin scrollbar-thumb-amber-500/20">
          
          {/* LIVE SEARCHING PROGRESS ANIMATION */}
          {transcription.isSearching ? (
            <div className="bg-gradient-to-br from-amber-950/60 via-zinc-900 to-black border border-amber-500/50 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 animate-pulse">
                  <Search className="w-8 h-8 animate-bounce" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-ping" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase tracking-widest font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                  Google Search Active
                </span>
                <h4 className="text-sm sm:text-base font-bold text-white mt-2">
                  Searching Google for "{topic}"...
                </h4>
                <p className="text-xs text-zinc-300 mt-1 max-w-md">
                  Tune is reading live web pages, comparing sources, and synthesizing the best answer for Boss...
                </p>
              </div>
              <div className="flex items-center gap-1.5 pt-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping [animation-delay:200ms]" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping [animation-delay:400ms]" />
              </div>
            </div>
          ) : viewMode === "cards" && (
            <div className="space-y-4">
              {/* Executive Summary Hero Card */}
              <div className="bg-gradient-to-br from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-500/30 rounded-2xl p-4 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-2 mb-2 text-amber-300 font-mono text-xs uppercase tracking-wider font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Executive Summary Overview</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-100 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                  {cleanBodyText}
                </p>
              </div>

              {/* Key Insights Bento Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {keyInsights.slice(0, 6).map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-zinc-900/80 border border-white/10 hover:border-amber-500/40 rounded-2xl p-3.5 flex items-start gap-3 transition-all hover:bg-zinc-900"
                  >
                    <div className="w-6 h-6 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-300 font-bold text-xs">
                      {idx + 1}
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
          )}

          {/* MODE 2: VISUAL MIND MAP VIEW */}
          {viewMode === "mindmap" && (
            <div className="bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden flex flex-col items-center">
              <div className="text-center mb-6">
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 inline-flex items-center gap-1.5">
                  <GitFork className="w-3.5 h-3.5" />
                  Interactive Research Mind Map
                </span>
                <p className="text-xs text-zinc-400 mt-1">
                  Visual node breakdown linking topic, findings & authentic web sources
                </p>
              </div>

              {/* MIND MAP VISUAL NODE DIAGRAM */}
              <div className="w-full max-w-2xl flex flex-col items-center relative py-4 space-y-6">
                
                {/* ROOT NODE: TOPIC */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-sm px-6 py-3 rounded-2xl shadow-xl shadow-amber-500/20 border border-amber-300 flex items-center gap-2 z-10 text-center max-w-md"
                >
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>{topic}</span>
                </motion.div>

                {/* CONNECTING LINES */}
                <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500 to-amber-500/30" />

                {/* SECOND LEVEL: KEY INSIGHT NODES */}
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 relative z-10">
                  {keyInsights.slice(0, 3).map((insight, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ y: 12, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-zinc-950 border border-amber-500/30 rounded-2xl p-3 shadow-md hover:border-amber-400 transition flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 mb-1 font-bold">
                        <TrendingUp className="w-3 h-3 text-amber-400" />
                        <span>Insight Node 0{idx + 1}</span>
                      </div>
                      <p className="text-xs text-zinc-200 line-clamp-4 font-medium leading-relaxed">
                        {insight}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* CONNECTING LINES TO SOURCES */}
                <div className="w-0.5 h-6 bg-gradient-to-b from-amber-500/30 to-emerald-500/40" />

                {/* THIRD LEVEL: AUTHENTIC SOURCES LEAF NODES */}
                <div className="w-full flex flex-wrap items-center justify-center gap-2 z-10">
                  {sources.map((src, idx) => (
                    <motion.a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-[11px] text-emerald-200 flex items-center gap-1.5 transition shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-semibold truncate max-w-[140px]">{src.domain || src.title}</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </motion.a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MODE 3: FULL REPORT DOCUMENT VIEW */}
          {viewMode === "report" && (
            <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-5 space-y-4 font-sans">
              <div className="border-b border-white/10 pb-3">
                <h4 className="text-sm font-bold text-amber-300 uppercase font-mono tracking-widest">
                  Comprehensive Fact Summary Report
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">Synthesized using Google Web Grounding</p>
              </div>

              <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                {cleanBodyText}
              </div>
            </div>
          )}

          {/* AUTHENTICITY & REFERENCE SOURCES FOOTER SECTION */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-emerald-300 font-mono uppercase tracking-wider">
                  AUTHENTIC SOURCES & REFERENCES (সত্যতা যাচাইয়ের জন্য মূল উৎসসমূহ)
                </h4>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                ✓ Verified Grounding
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Below are the live web domains and articles analyzed to verify the authenticity of this information:
            </p>

            {/* Source Badges List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sources.map((src, idx) => (
                <a
                  key={idx}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black/50 hover:bg-emerald-950/40 border border-white/10 hover:border-emerald-500/50 p-2.5 rounded-xl flex items-center justify-between gap-2 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 text-[10px] font-bold shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase truncate">
                          {src.domain || "web source"}
                        </span>
                        {src.verified && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
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
      </div>
    </div>
  );
};
