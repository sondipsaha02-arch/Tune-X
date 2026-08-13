import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Target,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Plus,
  ExternalLink,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  X,
  BookOpen,
  Video,
  Code,
  FileText,
  ListTodo,
  Zap,
  TrendingUp,
  RefreshCw,
  Check,
  Trash2,
  Edit3,
  Bookmark,
  Bot
} from "lucide-react";
import { soundEngine } from "../utils/soundEngine";

export interface PAMaterial {
  title: string;
  type: string;
  url: string;
  description: string;
  estHours: string;
}

export interface PASyllabusDay {
  dayNumber: number;
  dayTitle: string;
  topics: string[];
}

export interface PATodo {
  id: string;
  dayNumber: number;
  time: string; // e.g. "09:00 AM" or "30 sec" or "21:30"
  title: string;
  topic: string;
  materialUrl?: string;
  alarmEnabled: boolean;
  completed: boolean;
  isMissed?: boolean;
  triggerAtTimestamp?: number; // epoch timestamp in ms for exact alarms
}

export interface PAPlanData {
  goalTitle: string;
  durationDays: number;
  hoursPerDay: number;
  level: string;
  summary: string;
  materials: PAMaterial[];
  syllabus: PASyllabusDay[];
  dailyTodos: PATodo[];
  createdAt: string;
}

interface IntelligentPAManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IntelligentPAManager: React.FC<IntelligentPAManagerProps> = ({ isOpen, onClose }) => {
  // Wizard state
  const [goalInput, setGoalInput] = useState("");
  const [daysInput, setDaysInput] = useState(14);
  const [hoursInput, setHoursInput] = useState(2);
  const [levelInput, setLevelInput] = useState("Beginner to Intermediate");
  const [preferredStyle, setPreferredStyle] = useState("Videos & Official Docs");
  const [morningTime, setMorningTime] = useState("09:00 AM");
  const [eveningTime, setEveningTime] = useState("07:00 PM");

  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"todos" | "materials" | "syllabus" | "settings">("todos");
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [isPlanningModeActive, setIsPlanningModeActive] = useState(false);

  // Active Plan State
  const [plan, setPlan] = useState<PAPlanData | null>(() => {
    const saved = localStorage.getItem("intelligent_pa_plan");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading PA plan:", e);
      }
    }
    return null;
  });

  // Active Ringing Alarm state
  const [activeAlarmTodo, setActiveAlarmTodo] = useState<PATodo | null>(null);
  const [triggeredAlarmIds, setTriggeredAlarmIds] = useState<Set<string>>(new Set());

  // Manual Todo Add Modal
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoTopic, setNewTodoTopic] = useState("");
  const [newTodoTime, setNewTodoTime] = useState("10:00 AM");
  const [newTodoUrl, setNewTodoUrl] = useState("");

  // Sound Test preview status
  const [isTestingAlarm, setIsTestingAlarm] = useState(false);

  // Save plan to localStorage on update
  useEffect(() => {
    if (plan) {
      localStorage.setItem("intelligent_pa_plan", JSON.stringify(plan));
    }
  }, [plan]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Listen for global custom alarm trigger events (e.g. from 30 sec test, WebSocket, or reminders)
  useEffect(() => {
    const handleGlobalAlarm = (e: any) => {
      if (e.detail) {
        const todoDetail: PATodo = {
          id: e.detail.id || `alarm_${Date.now()}`,
          dayNumber: e.detail.dayNumber || 1,
          time: e.detail.time || "Now",
          title: e.detail.title || "⏰ Scheduled Alarm",
          topic: e.detail.topic || "Time for your scheduled task!",
          alarmEnabled: true,
          completed: false
        };
        triggerAlarm(todoDetail);
      }
    };

    const handlePlanUpdated = (e: any) => {
      if (e.detail) {
        setPlan(e.detail);
        soundEngine.playNotificationChime();
      }
    };

    window.addEventListener("pa_trigger_alarm", handleGlobalAlarm);
    window.addEventListener("pa_plan_updated", handlePlanUpdated);

    return () => {
      window.removeEventListener("pa_trigger_alarm", handleGlobalAlarm);
      window.removeEventListener("pa_plan_updated", handlePlanUpdated);
    };
  }, []);

  // Real-time Alarm Ticker: Checks every 1 second (1000ms) for exact alarms
  useEffect(() => {
    const interval = setInterval(() => {
      if (!plan || !plan.dailyTodos) return;

      const now = new Date();
      const currentMs = now.getTime();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      // Convert current time to 12-hour "hh:mm AM/PM" format
      const ampm = currentHours >= 12 ? "PM" : "AM";
      const h12 = currentHours % 12 || 12;
      const formattedHours = h12 < 10 ? `0${h12}` : `${h12}`;
      const formattedMinutes = currentMinutes < 10 ? `0${currentMinutes}` : `${currentMinutes}`;
      const currentTimeStr = `${formattedHours}:${formattedMinutes} ${ampm}`;

      plan.dailyTodos.forEach((todo) => {
        if (
          todo.alarmEnabled &&
          !todo.completed &&
          !triggeredAlarmIds.has(todo.id)
        ) {
          // Check timestamp match first
          if (todo.triggerAtTimestamp && currentMs >= todo.triggerAtTimestamp) {
            triggerAlarm(todo);
            return;
          }

          // Check string time match (e.g. "09:00 AM")
          const normalizedTodoTime = todo.time.trim().toUpperCase();
          if (normalizedTodoTime === currentTimeStr) {
            triggerAlarm(todo);
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [plan, triggeredAlarmIds]);

  const triggerAlarm = (todo: PATodo) => {
    setActiveAlarmTodo(todo);
    setTriggeredAlarmIds((prev) => new Set(prev).add(todo.id));

    // Play Web Audio Alarm Ringtone!
    soundEngine.playAlarmRingtone();

    // Show native browser notification if allowed
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`⏰ Task Alarm: ${todo.title}`, {
        body: `Time for your session: ${todo.topic}`,
        icon: "/icon.png"
      });
    }
  };

  const handleDismissAlarm = () => {
    soundEngine.stopAlarmRingtone();
    setActiveAlarmTodo(null);
  };

  const handleCompleteAlarmTask = () => {
    soundEngine.stopAlarmRingtone();
    if (activeAlarmTodo && plan) {
      toggleTodoComplete(activeAlarmTodo.id);
    }
    soundEngine.playNotificationChime();
    setActiveAlarmTodo(null);
  };

  const handleSnoozeAlarm = () => {
    soundEngine.stopAlarmRingtone();
    if (activeAlarmTodo && plan) {
      // Add 10 mins to current time or update task
      const updatedTodos = plan.dailyTodos.map((t) => {
        if (t.id === activeAlarmTodo.id) {
          return { ...t, time: "Snoozed (+10m)" };
        }
        return t;
      });
      setPlan({ ...plan, dailyTodos: updatedTodos });
    }
    setActiveAlarmTodo(null);
  };

  // Generate Plan via Backend AI Strategy Engine
  const handleGeneratePlan = async () => {
    if (!goalInput.trim()) return;
    setIsGenerating(true);

    try {
      const res = await fetch("/api/pa/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: goalInput.trim(),
          days: daysInput,
          hoursPerDay: hoursInput,
          level: levelInput,
          preferredStyle,
          timeSlots: [morningTime, eveningTime]
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        const generated: PAPlanData = {
          goalTitle: data.data.goalTitle || goalInput,
          durationDays: daysInput,
          hoursPerDay: hoursInput,
          level: levelInput,
          summary: data.data.summary || `Personalized learning syllabus for Boss on ${goalInput}.`,
          materials: data.data.materials || [],
          syllabus: data.data.syllabus || [],
          dailyTodos: data.data.dailyTodos || [],
          createdAt: new Date().toISOString()
        };
        setPlan(generated);
        setActiveTab("todos");
        soundEngine.playNotificationChime();
      }
    } catch (err) {
      console.error("Error generating PA plan:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle todo task completion
  const toggleTodoComplete = (todoId: string) => {
    if (!plan) return;
    const updatedTodos = plan.dailyTodos.map((t) => {
      if (t.id === todoId) {
        const nextState = !t.completed;
        if (nextState) soundEngine.playNotificationChime();
        return { ...t, completed: nextState };
      }
      return t;
    });
    setPlan({ ...plan, dailyTodos: updatedTodos });
  };

  // Toggle Alarm status on a task
  const toggleTodoAlarm = (todoId: string) => {
    if (!plan) return;
    const updatedTodos = plan.dailyTodos.map((t) => {
      if (t.id === todoId) {
        const nextState = !t.alarmEnabled;
        if (nextState) soundEngine.playNotificationChime();
        return { ...t, alarmEnabled: nextState };
      }
      return t;
    });
    setPlan({ ...plan, dailyTodos: updatedTodos });
  };

  // Smart Rescheduler Engine: Automatically redistributes pending/missed tasks
  const handleSmartReschedule = () => {
    if (!plan) return;
    
    // Find uncompleted tasks
    const uncompleted = plan.dailyTodos.filter((t) => !t.completed);
    if (uncompleted.length === 0) return;

    let rescheduledCount = 0;
    const updatedTodos = plan.dailyTodos.map((t, idx) => {
      if (!t.completed && idx < 5) {
        rescheduledCount++;
        return {
          ...t,
          isMissed: true,
          time: t.time.includes("Rescheduled") ? t.time : `${t.time} (Rescheduled)`
        };
      }
      return t;
    });

    setPlan({ ...plan, dailyTodos: updatedTodos });
    soundEngine.playNotificationChime();
  };

  // Add Manual Custom Todo
  const handleAddManualTodo = () => {
    if (!plan || !newTodoTitle.trim()) return;

    let triggerMs: number | undefined = undefined;
    const lowerTime = newTodoTime.toLowerCase().trim();

    const secMatch = lowerTime.match(/(\d+)\s*(s|sec|second|seconds)/);
    const minMatch = lowerTime.match(/(\d+)\s*(m|min|minute|minutes)/);

    if (secMatch) {
      triggerMs = Date.now() + parseInt(secMatch[1], 10) * 1000;
    } else if (minMatch) {
      triggerMs = Date.now() + parseInt(minMatch[1], 10) * 60 * 1000;
    } else if (lowerTime.includes("30 sec") || lowerTime.includes("30s")) {
      triggerMs = Date.now() + 30000;
    }

    const newTodo: PATodo = {
      id: `custom_${Date.now()}`,
      dayNumber: selectedDay,
      time: newTodoTime || "10:00 AM",
      title: newTodoTitle.trim(),
      topic: newTodoTopic.trim() || newTodoTitle.trim(),
      materialUrl: newTodoUrl.trim() || undefined,
      alarmEnabled: true,
      completed: false,
      triggerAtTimestamp: triggerMs
    };

    setPlan({
      ...plan,
      dailyTodos: [newTodo, ...plan.dailyTodos]
    });

    setNewTodoTitle("");
    setNewTodoTopic("");
    setNewTodoUrl("");
    setShowAddTodo(false);
    soundEngine.playNotificationChime();
  };

  // Delete Todo
  const handleDeleteTodo = (id: string) => {
    if (!plan) return;
    setPlan({
      ...plan,
      dailyTodos: plan.dailyTodos.filter((t) => t.id !== id)
    });
  };

  if (!isOpen) return null;

  // Filter tasks for selected day
  const filteredTodos = plan ? plan.dailyTodos.filter((t) => t.dayNumber === selectedDay) : [];
  const completedCount = plan ? plan.dailyTodos.filter((t) => t.completed).length : 0;
  const totalCount = plan ? plan.dailyTodos.length : 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-5xl h-[88vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-100"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-950/80 border-b border-neutral-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Intelligent PA & Goal Coach</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Banglish PA
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Personalized syllabus, curated research materials, daily todo schedule & alarm reminders
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {plan && (
              <button
                onClick={() => setPlan(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Goal Plan</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!plan ? (
          /* --- WIZARD / INTAKE FORM MODE --- */
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
            <div className="w-full space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 mb-2">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Tell Your PA Your Goal, Boss!</h3>
                <p className="text-sm text-neutral-400">
                  What do you want to learn or achieve? Your PA will research materials, create a daily syllabus, and set alarm reminders.
                </p>
              </div>

              {/* Goal Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  Target Goal / Skill Name
                </label>
                <input
                  type="text"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="e.g. Master Full Stack Web Development, Learn Python AI, IELTS Band 8..."
                  className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 text-sm"
                />
              </div>

              {/* Duration & Daily Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    Target Duration (Days)
                  </label>
                  <select
                    value={daysInput}
                    onChange={(e) => setDaysInput(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-sm"
                  >
                    <option value={7}>7 Days (1 Week Sprint)</option>
                    <option value={14}>14 Days (2 Weeks Bootcamp)</option>
                    <option value={30}>30 Days (1 Month Mastery)</option>
                    <option value={60}>60 Days (2 Months Deep Dive)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    Daily Commitment
                  </label>
                  <select
                    value={hoursInput}
                    onChange={(e) => setHoursInput(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-sm"
                  >
                    <option value={1}>1 Hour / Day</option>
                    <option value={2}>2 Hours / Day</option>
                    <option value={3}>3 Hours / Day</option>
                    <option value={4}>4+ Hours / Day</option>
                  </select>
                </div>
              </div>

              {/* Skill Level & Alarm Time Slots */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    Current Level
                  </label>
                  <select
                    value={levelInput}
                    onChange={(e) => setLevelInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-sm"
                  >
                    <option value="Complete Beginner">Complete Beginner</option>
                    <option value="Beginner to Intermediate">Beginner to Intermediate</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced Refinement</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    Morning Alarm Time
                  </label>
                  <input
                    type="text"
                    value={morningTime}
                    onChange={(e) => setMorningTime(e.target.value)}
                    placeholder="09:00 AM"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-cyan-500 text-sm"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleGeneratePlan}
                disabled={isGenerating || !goalInput.trim()}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Researching Materials & Creating PA Plan...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-5 h-5" />
                    <span>Create PA Plan & Schedule Alarms</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* --- ACTIVE PA PLAN DASHBOARD --- */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Goal Distance Visual Progress Bar */}
            <div className="px-6 py-3 bg-neutral-950 border-b border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-neutral-200">
                    Goal Distance Progress: <span className="text-cyan-400">{progressPct}% Complete</span>
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-neutral-400">
                  <span>{completedCount} / {totalCount} Tasks Done</span>
                  <span>•</span>
                  <span>{plan.durationDays} Days Target ({plan.hoursPerDay}h/day)</span>
                  <button
                    onClick={() => {
                      setIsPlanningModeActive(!isPlanningModeActive);
                      soundEngine.playNotificationChime();
                    }}
                    className={`ml-2 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center space-x-1.5 ${
                      isPlanningModeActive
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse shadow-md shadow-emerald-500/20"
                        : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isPlanningModeActive ? "🎙️ PA Voice Mode Active" : "Voice Planning Mode"}</span>
                  </button>
                </div>
              </div>
              <div className="w-full bg-neutral-800/80 h-3 rounded-full overflow-hidden p-0.5 border border-neutral-700/50 relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full shadow-lg shadow-cyan-500/50"
                />
              </div>
            </div>

            {/* Plan Header Summary Bar */}
            <div className="px-6 py-4 bg-neutral-950/60 border-b border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-white">{plan.goalTitle}</h3>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {plan.level}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 max-w-2xl">{plan.summary}</p>
              </div>

              {/* Progress & Rescheduler */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleSmartReschedule}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors flex items-center space-x-1.5 text-xs font-medium"
                >
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  <span>Smart Reschedule Unfinished</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center justify-between px-6 bg-neutral-900/90 border-b border-neutral-800">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab("todos")}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
                    activeTab === "todos"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <ListTodo className="w-4 h-4" />
                  <span>Daily Todo List</span>
                </button>

                <button
                  onClick={() => setActiveTab("materials")}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
                    activeTab === "materials"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Curated Materials ({plan.materials.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab("syllabus")}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
                    activeTab === "syllabus"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Complete Syllabus</span>
                </button>

                <button
                  onClick={() => setActiveTab("settings")}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
                    activeTab === "settings"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>Audio & Alarm Tones</span>
                </button>
              </div>

              {activeTab === "todos" && (
                <button
                  onClick={() => setShowAddTodo(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition-colors flex items-center space-x-1.5 text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Todo Task</span>
                </button>
              )}
            </div>

            {/* TAB CONTENT AREAS */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* --- TAB 1: DAILY TODOS & ALARMS --- */}
              {activeTab === "todos" && (
                <div className="space-y-6">
                  {/* Day Picker Pills */}
                  <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
                    {Array.from({ length: plan.durationDays }, (_, i) => i + 1).map((d) => (
                      <button
                        key={`day_pill_${d}`}
                        onClick={() => setSelectedDay(d)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                          selectedDay === d
                            ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                            : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                        }`}
                      >
                        Day {d}
                      </button>
                    ))}
                  </div>

                  {/* Todo List for Selected Day */}
                  <div className="space-y-3">
                    {filteredTodos.length === 0 ? (
                      <div className="p-8 text-center bg-neutral-950/40 rounded-xl border border-neutral-800">
                        <p className="text-sm text-neutral-400">No todo tasks scheduled for Day {selectedDay}.</p>
                        <button
                          onClick={() => setShowAddTodo(true)}
                          className="mt-3 px-4 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
                        >
                          Add Day {selectedDay} Task
                        </button>
                      </div>
                    ) : (
                      filteredTodos.map((todo, idx) => (
                        <div
                          key={todo.id ? `${todo.id}_${idx}` : `todo_${idx}`}
                          className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                            todo.completed
                              ? "bg-neutral-950/40 border-neutral-850 opacity-60"
                              : todo.isMissed
                              ? "bg-amber-950/20 border-amber-500/30"
                              : "bg-neutral-950/80 border-neutral-800 hover:border-neutral-700"
                          }`}
                        >
                          <div className="flex items-start space-x-3.5">
                            <button
                              onClick={() => toggleTodoComplete(todo.id)}
                              className={`mt-0.5 p-1 rounded-lg transition-colors ${
                                todo.completed
                                  ? "bg-emerald-500 text-white"
                                  : "bg-neutral-800 text-neutral-400 hover:text-white"
                              }`}
                            >
                              <Check className="w-4 h-4" />
                            </button>

                            <div>
                              <div className="flex items-center space-x-2">
                                <h4
                                  className={`text-sm font-bold ${
                                    todo.completed ? "line-through text-neutral-400" : "text-white"
                                  }`}
                                >
                                  {todo.title}
                                </h4>
                                {todo.isMissed && (
                                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                                    Rescheduled
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-neutral-400 mt-1">{todo.topic}</p>

                              {todo.materialUrl && (
                                <a
                                  href={todo.materialUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 text-xs text-cyan-400 hover:underline mt-2"
                                >
                                  <span>Resource Material</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Time & Alarm Trigger Toggle */}
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300">
                              <Clock className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{todo.time}</span>
                            </div>

                            <button
                              onClick={() => toggleTodoAlarm(todo.id)}
                              title={todo.alarmEnabled ? "Alarm Enabled" : "Alarm Disabled"}
                              className={`p-2 rounded-lg transition-colors ${
                                todo.alarmEnabled
                                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                  : "bg-neutral-800 text-neutral-500"
                              }`}
                            >
                              {todo.alarmEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => handleDeleteTodo(todo.id)}
                              className="p-2 rounded-lg text-neutral-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* --- TAB 2: CURATED RESEARCH MATERIALS --- */}
              {activeTab === "materials" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plan.materials.map((mat, idx) => (
                    <div
                      key={mat.url ? `${mat.url}_${idx}` : `mat_${idx}`}
                      className="p-5 rounded-xl bg-neutral-950/80 border border-neutral-800 hover:border-cyan-500/30 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {mat.type}
                          </span>
                          <span className="text-xs text-neutral-400">{mat.estHours}</span>
                        </div>

                        <h4 className="text-base font-bold text-white mt-3">{mat.title}</h4>
                        <p className="text-xs text-neutral-400 mt-1.5 line-clamp-3">{mat.description}</p>
                      </div>

                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 px-4 py-2 rounded-lg bg-neutral-900 hover:bg-cyan-500 hover:text-white text-neutral-200 border border-neutral-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                      >
                        <span>Open Study Link</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* --- TAB 3: COMPLETE SYLLABUS --- */}
              {activeTab === "syllabus" && (
                <div className="space-y-4">
                  {plan.syllabus.map((syl, sIdx) => (
                    <div key={`syl_day_${syl.dayNumber || sIdx}`} className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-cyan-500/20 text-cyan-300">
                          Day {syl.dayNumber}
                        </span>
                        <h4 className="text-sm font-bold text-white">{syl.dayTitle}</h4>
                      </div>

                      <ul className="mt-2.5 space-y-1 pl-4 list-disc text-xs text-neutral-300">
                        {syl.topics.map((top, tidx) => (
                          <li key={`top_${syl.dayNumber || sIdx}_${tidx}`}>{top}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* --- TAB 4: AUDIO & ALARM TONES SETTINGS --- */}
              {activeTab === "settings" && (
                <div className="max-w-md mx-auto space-y-6">
                  <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-5 h-5 text-cyan-400" />
                      <div>
                        <h4 className="text-sm font-bold text-white">Alarm Ringtone Test</h4>
                        <p className="text-xs text-neutral-400">Energetic harmonic PA ringtone sequence</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (isTestingAlarm) {
                          soundEngine.stopAlarmRingtone();
                          setIsTestingAlarm(false);
                        } else {
                          soundEngine.testRingtone();
                          setIsTestingAlarm(true);
                          setTimeout(() => setIsTestingAlarm(false), 4500);
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors flex items-center justify-center space-x-2"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{isTestingAlarm ? "Stop Playing Ringtone" : "Test Alarm Ringtone 🔔"}</span>
                    </button>
                  </div>

                  <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-5 h-5 text-cyan-400" />
                      <div>
                        <h4 className="text-sm font-bold text-white">Notification Chime Test</h4>
                        <p className="text-xs text-neutral-400">Crisp 2-note bell chime sound</p>
                      </div>
                    </div>

                    <button
                      onClick={() => soundEngine.playNotificationChime()}
                      className="w-full py-2.5 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-2"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Test Notification Chime 💬</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACTIVE ALARM RINGING OVERLAY MODAL */}
        <AnimatePresence>
          {activeAlarmTodo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-[150] bg-neutral-950/95 backdrop-blur-xl p-8 flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-cyan-500/30 rounded-full blur-xl animate-pulse" />
                <div className="p-6 rounded-3xl bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 relative">
                  <Bell className="w-16 h-16 animate-bounce" />
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <span className="px-3 py-1 text-xs font-bold bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-500/30">
                  ⏰ Task Time for Boss!
                </span>
                <h3 className="text-2xl font-bold text-white">{activeAlarmTodo.title}</h3>
                <p className="text-sm text-neutral-300">{activeAlarmTodo.topic}</p>
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <button
                  onClick={handleSnoozeAlarm}
                  className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-bold transition-colors"
                >
                  Snooze 10 Mins
                </button>

                <button
                  onClick={handleCompleteAlarmTask}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/30 transition-all flex items-center space-x-2"
                >
                  <Check className="w-5 h-5" />
                  <span>Start & Complete Task</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MANUAL ADD TODO MODAL */}
        <AnimatePresence>
          {showAddTodo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[140] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-white">Add Task for Day {selectedDay}</h4>
                  <button onClick={() => setShowAddTodo(false)} className="text-neutral-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    placeholder="Task Title (e.g. Build Login UI)"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-cyan-500"
                  />

                  <input
                    type="text"
                    value={newTodoTopic}
                    onChange={(e) => setNewTodoTopic(e.target.value)}
                    placeholder="Topic Details / Notes"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-cyan-500"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newTodoTime}
                      onChange={(e) => setNewTodoTime(e.target.value)}
                      placeholder="Alarm Time (09:00 AM)"
                      className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-cyan-500"
                    />

                    <input
                      type="text"
                      value={newTodoUrl}
                      onChange={(e) => setNewTodoUrl(e.target.value)}
                      placeholder="Material URL (Optional)"
                      className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddManualTodo}
                  disabled={!newTodoTitle.trim()}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-sm disabled:opacity-50 transition-colors"
                >
                  Add Todo to Schedule
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
