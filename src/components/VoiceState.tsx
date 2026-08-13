import React from "react";
import { ConnectionState } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface VoiceStateProps {
  connectionState: ConnectionState;
}

export const VoiceState: React.FC<VoiceStateProps> = ({ connectionState }) => {
  const getStatusText = () => {
    switch (connectionState) {
      case "disconnected":
        return "Offline";
      case "connecting":
        return "Connecting to Tune...";
      case "listening":
        return "Listening...";
      case "speaking":
        return "Thinking..."; // The prompt states: Speaking -> "Thinking..." for elegant status
      case "thinking":
        return "Thinking...";
      default:
        return "Offline";
    }
  };

  const getStatusColor = () => {
    switch (connectionState) {
      case "disconnected":
        return "text-white/30";
      case "connecting":
        return "text-yellow-400/80";
      case "listening":
        return "text-cyan-400/80";
      case "speaking":
        return "text-violet-400/90";
      case "thinking":
        return "text-purple-400/80";
      default:
        return "text-white/30";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-1 min-h-[30px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={connectionState}
          initial={{ opacity: 0, y: 5, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -5, filter: "blur(2px)" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={`text-xs font-semibold uppercase tracking-[0.2em] font-mono text-center ${getStatusColor()}`}
        >
          {getStatusText()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
export default VoiceState;
