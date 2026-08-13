import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, User, FileText, ChevronUp, ChevronDown, Search, Sparkles } from "lucide-react";
import { ConnectionState, Transcription } from "../types";
import { VisualResearchCard } from "./VisualResearchCard";

interface FloatingSubtitleStreamProps {
  connectionState: ConnectionState;
  transcriptions: Transcription[];
}

export const FloatingSubtitleStream: React.FC<FloatingSubtitleStreamProps> = ({
  connectionState,
  transcriptions,
}) => {
  const [activeTranscription, setActiveTranscription] = useState<Transcription | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [selectedResearch, setSelectedResearch] = useState<Transcription | null>(null);

  useEffect(() => {
    if (transcriptions.length > 0) {
      const latest = transcriptions[transcriptions.length - 1];
      setActiveTranscription(latest);
      setIsVisible(true);

      const isResearch = latest.isResearch || latest.text.includes("[Google Web Research") || latest.text.includes("🔎");
      
      // Auto fade out standard subtitle banner after 12s, but keep research card visible longer (25s)
      const timeoutMs = isResearch ? 25000 : 12000;
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, timeoutMs);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [transcriptions]);

  if (connectionState === "disconnected") {
    return <div className="min-h-[60px]" />;
  }

  const recentTranscriptions = transcriptions.slice(-10);

  return (
    <div className="w-full max-w-xl px-4 mx-auto flex flex-col items-center justify-center relative select-none my-2 z-20">
      
      {/* Toggle Full Transcript Log Button */}
      {transcriptions.length > 0 && (
        <button
          type="button"
          onClick={() => setShowFullHistory((prev) => !prev)}
          className="mb-2 px-3 py-1 rounded-full text-[11px] font-medium bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 backdrop-blur-md flex items-center gap-1.5 transition-all shadow-md pointer-events-auto cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span>{showFullHistory ? "Hide Transcript Feed" : "Live Subtitles & Research Feed"}</span>
          {showFullHistory ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Expanded Live Full Transcript Log */}
      <AnimatePresence>
        {showFullHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full bg-zinc-950/95 border border-zinc-800 rounded-2xl p-3 backdrop-blur-xl shadow-2xl mb-2 max-h-64 overflow-y-auto space-y-2 pointer-events-auto text-left"
          >
            <div className="text-[10px] uppercase tracking-widest font-mono text-zinc-400 border-b border-zinc-800/80 pb-1 mb-2 flex items-center justify-between">
              <span>Real-Time Dialogue History ({transcriptions.length})</span>
              <span className="text-emerald-400 flex items-center gap-1">● Live Feed</span>
            </div>
            {recentTranscriptions.map((t, idx) => {
              const isResearch = t.isResearch || t.text.includes("[Google Web Research") || t.text.includes("🔎");
              return (
                <div
                  key={t.id || idx}
                  onClick={() => {
                    if (isResearch) setSelectedResearch(t);
                  }}
                  className={`p-2.5 rounded-xl text-xs leading-relaxed border transition cursor-pointer ${
                    isResearch
                      ? "bg-amber-950/40 border-amber-500/40 hover:border-amber-400 text-amber-100"
                      : t.isUser
                      ? "bg-cyan-950/30 border-cyan-500/20 text-cyan-100"
                      : "bg-purple-950/30 border-purple-500/20 text-purple-100"
                  }`}
                >
                  <div className="font-semibold text-[10px] opacity-80 mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {isResearch ? (
                        <>
                          <Search className="w-3 h-3 text-amber-400" />
                          <span className="text-amber-300 font-mono">Google Web Research Result</span>
                        </>
                      ) : t.isUser ? (
                        <>
                          <User className="w-3 h-3 text-cyan-400" />
                          <span className="text-cyan-300 font-mono">You</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3 text-purple-400" />
                          <span className="text-purple-300 font-mono">Tune</span>
                        </>
                      )}
                    </div>
                    {isResearch && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Click for Mind Map & Cards
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap line-clamp-3">{t.text}</p>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Active Subtitle / Research Viewer */}
      <AnimatePresence mode="wait">
        {isVisible && activeTranscription && !showFullHistory && (
          <motion.div
            key={activeTranscription.id || activeTranscription.text}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex justify-center pointer-events-auto"
          >
            {activeTranscription.isResearch ||
            activeTranscription.text.includes("[Google Web Research") ||
            activeTranscription.text.includes("🔎") ? (
              <VisualResearchCard
                transcription={activeTranscription}
                onClose={() => setIsVisible(false)}
              />
            ) : (
              <div
                className={`flex flex-col items-center text-center px-5 py-3 rounded-2xl backdrop-blur-2xl border shadow-2xl max-w-md w-full transition-all duration-300 ${
                  activeTranscription.isUser
                    ? "bg-zinc-900/90 border-cyan-500/30 text-cyan-100 shadow-cyan-950/20"
                    : "bg-zinc-900/90 border-purple-500/30 text-purple-100 shadow-purple-950/20"
                }`}
              >
                {/* Speaker Header */}
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono tracking-widest uppercase font-semibold opacity-80">
                  {activeTranscription.isUser ? (
                    <>
                      <User className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-300">You</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3 h-3 text-purple-400" />
                      <span className="text-purple-300">Tune</span>
                    </>
                  )}
                </div>

                {/* Subtitle text */}
                <p className="text-xs sm:text-sm font-medium leading-relaxed tracking-wide text-white font-sans max-h-32 overflow-y-auto whitespace-pre-wrap">
                  "{activeTranscription.text}"
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Historical Research Modal */}
      {selectedResearch && (
        <VisualResearchCard
          transcription={selectedResearch}
          isExpandedModal={true}
          onClose={() => setSelectedResearch(null)}
        />
      )}
    </div>
  );
};


