import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Apple,
  Flame,
  Gamepad2,
  Ghost,
  Gift,
  Heart,
  HelpCircle,
  Moon,
  Music,
  Pizza,
  Rocket,
  Search,
  Settings,
  Smile,
  Star,
  Sun,
  Trophy,
  Zap,
  X,
  Clock,
} from "lucide-react";

interface ImageFinderProps {
  onClose: () => void;
  onWin: () => void;
  onShowToast: (msg: string, type: "success" | "error" | "info") => void;
}

const ICONS_POOL = [
  { name: "Apple", component: Apple, color: "text-red-400" },
  { name: "Flame", component: Flame, color: "text-amber-500" },
  { name: "Gamepad2", component: Gamepad2, color: "text-emerald-400" },
  { name: "Ghost", component: Ghost, color: "text-slate-300" },
  { name: "Gift", component: Gift, color: "text-pink-400" },
  { name: "Heart", component: Heart, color: "text-red-500" },
  { name: "HelpCircle", component: HelpCircle, color: "text-indigo-400" },
  { name: "Moon", component: Moon, color: "text-blue-300" },
  { name: "Music", component: Music, color: "text-cyan-400" },
  { name: "Pizza", component: Pizza, color: "text-orange-400" },
  { name: "Rocket", component: Rocket, color: "text-violet-400" },
  { name: "Search", component: Search, color: "text-sky-400" },
  { name: "Settings", component: Settings, color: "text-slate-400" },
  { name: "Smile", component: Smile, color: "text-amber-400" },
  { name: "Star", component: Star, color: "text-yellow-300" },
  { name: "Sun", component: Sun, color: "text-yellow-400" },
  { name: "Trophy", component: Trophy, color: "text-yellow-500" },
  { name: "Zap", component: Zap, color: "text-indigo-400" },
];

export default function ImageFinder({ onClose, onWin, onShowToast }: ImageFinderProps) {
  const [winsInRow, setWinsInRow] = useState(0);
  const [timer, setTimer] = useState(30);
  const [targetIcon, setTargetIcon] = useState<typeof ICONS_POOL[0] | null>(null);
  const [gridIcons, setGridIcons] = useState<typeof ICONS_POOL>([]);
  const [wrongSelectionIdx, setWrongSelectionIdx] = useState<number | null>(null);
  const [correctSelectionIdx, setCorrectSelectionIdx] = useState<number | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setupLevel();
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onShowToast("Time Up!", "error");
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const setupLevel = () => {
    // Pick a target icon
    const target = ICONS_POOL[Math.floor(Math.random() * ICONS_POOL.length)];
    setTargetIcon(target);

    // Build grid icons: 1 target, 11 wrong
    const wrongPool = ICONS_POOL.filter((i) => i.name !== target.name);
    const selectedWrong: typeof ICONS_POOL = [];
    const availableWrong = [...wrongPool];

    for (let i = 0; i < 11; i++) {
      if (availableWrong.length === 0) {
        availableWrong.push(...wrongPool);
      }
      const idx = Math.floor(Math.random() * availableWrong.length);
      selectedWrong.push(availableWrong[idx]);
      availableWrong.splice(idx, 1);
    }

    const grid = [target, ...selectedWrong].sort(() => Math.random() - 0.5);
    setGridIcons(grid);
    setWrongSelectionIdx(null);
    setCorrectSelectionIdx(null);
  };

  const handleCellClick = (icon: typeof ICONS_POOL[0], index: number) => {
    if (wrongSelectionIdx !== null || correctSelectionIdx !== null) return;

    if (targetIcon && icon.name === targetIcon.name) {
      setCorrectSelectionIdx(index);
      const nextWins = winsInRow + 1;
      setWinsInRow(nextWins);

      if (nextWins >= 3) {
        clearInterval(timerRef.current);
        setTimeout(() => {
          onWin();
          onClose();
        }, 500);
      } else {
        setTimeout(() => {
          setTimer((prev) => prev + 5);
          setupLevel();
        }, 500);
      }
    } else {
      setWrongSelectionIdx(index);
      setTimer((prev) => Math.max(0, prev - 5));
      setTimeout(() => {
        setWrongSelectionIdx(null);
      }, 500);
    }
  };

  const TargetComponent = targetIcon ? targetIcon.component : HelpCircle;

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg z-10">
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[9px] text-white/70 uppercase font-bold tracking-wider">STREAK</span>
          <span className="font-extrabold text-white text-lg leading-none drop-shadow-md">
            {winsInRow}/3
          </span>
        </div>
        <div className="bg-black/30 border border-white/20 px-3 py-1 rounded-full text-sm font-mono font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-300" />
          <span>00:{timer.toString().padStart(2, "0")}</span>
        </div>
      </div>

      {/* Main Board */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-b from-[#0f172a] to-[#1e1b4b]">
        {/* Animated Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

        <div className="text-center mb-8 relative z-10">
          <p className="text-indigo-200 text-xs mb-3 font-bold uppercase tracking-widest">
            Find this icon
          </p>
          <motion.div
            key={targetIcon?.name}
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center border-4 border-[#0f172a] shadow-2xl shadow-indigo-500/30 mx-auto"
          >
            <TargetComponent className="w-12 h-12 text-white drop-shadow-lg" />
          </motion.div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-4 gap-3 w-full max-w-sm relative z-10">
          {gridIcons.map((icon, idx) => {
            const IconComponent = icon.component;
            const isWrong = wrongSelectionIdx === idx;
            const isCorrect = correctSelectionIdx === idx;

            return (
              <motion.button
                key={`${icon.name}-${idx}`}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleCellClick(icon, idx)}
                className={`aspect-square flex items-center justify-center rounded-2xl cursor-pointer transition-all duration-300 border-2 shadow-md ${
                  isCorrect
                    ? "bg-gradient-to-tr from-emerald-500 to-teal-600 border-emerald-400"
                    : isWrong
                    ? "bg-rose-500 border-rose-400 animate-shake"
                    : "bg-slate-800/40 hover:bg-slate-800/80 border-white/5"
                }`}
              >
                <IconComponent
                  className={`w-7 h-7 transition-transform ${
                    isCorrect || isWrong ? "text-white scale-110" : icon.color
                  }`}
                />
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
