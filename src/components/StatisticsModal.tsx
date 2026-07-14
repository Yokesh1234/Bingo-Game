import { motion, AnimatePresence } from "motion/react";
import { X, BarChart2, Award, RotateCcw, Zap, Sparkles } from "lucide-react";
import { playClickSound } from "../utils/audio";
import { GameStats } from "../types";

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
  onResetStats: () => void;
}

export default function StatisticsModal({
  isOpen,
  onClose,
  stats,
  onResetStats,
}: StatisticsModalProps) {
  if (!isOpen) return null;

  const totalPlayed = stats.bingoClassicPlayed + stats.bingoCustomPlayed + stats.dotsPlayed;
  const totalWins = stats.bingoClassicWins + stats.bingoCustomWins + stats.dotsWins;
  const winRate = totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-lg z-10"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <BarChart2 className="w-5 h-5 text-emerald-500" />
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                Performance Stats
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* High level overview card */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              <div className="text-center">
                <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Played</span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalPlayed}</span>
              </div>
              <div className="text-center border-x border-slate-200 dark:border-slate-700">
                <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Wins</span>
                <span className="text-2xl font-black text-emerald-500">{totalWins}</span>
              </div>
              <div className="text-center">
                <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Win Rate</span>
                <span className="text-2xl font-black text-violet-500">{winRate}%</span>
              </div>
            </div>

            {/* Games detailed split */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Games Breakdown
              </h4>

              {/* Bingo Classic */}
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8.5 h-8.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center font-bold text-xs">
                    BC
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Bingo Classic (Online)</span>
                    <span className="block text-[10px] text-slate-400 font-medium">Standard 1-25 rooms</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{stats.bingoClassicWins} / {stats.bingoClassicPlayed}</span>
                  <span className="block text-[10px] text-emerald-500 font-bold">Wins</span>
                </div>
              </div>

              {/* Bingo Custom */}
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8.5 h-8.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center font-bold text-xs">
                    B*
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Bingo Setup (Custom/Bot)</span>
                    <span className="block text-[10px] text-slate-400 font-medium">Customizable matrices</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{stats.bingoCustomWins} / {stats.bingoCustomPlayed}</span>
                  <span className="block text-[10px] text-emerald-500 font-bold">Wins</span>
                </div>
              </div>

              {/* Dots & Boxes */}
              <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8.5 h-8.5 bg-violet-50 dark:bg-violet-500/10 text-violet-500 rounded-lg flex items-center justify-center font-bold text-xs">
                    DB
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Dots & Boxes (Local/AI)</span>
                    <span className="block text-[10px] text-slate-400 font-medium">Claim squares & score points</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">{stats.dotsWins} / {stats.dotsPlayed}</span>
                  <span className="block text-[10px] text-violet-500 font-bold">Wins ({stats.dotsDraws} draws)</span>
                </div>
              </div>
            </div>

            {/* Streak / achievement note */}
            {totalWins > 0 && (
              <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10 p-3 rounded-xl flex items-center gap-2.5">
                <Award className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-400/90 font-medium leading-relaxed">
                  Excellent work! You have achieved <strong className="font-extrabold">{totalWins} victories</strong> across all game suites. Play more games to boost your ratings.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-8">
            <button
              onClick={() => {
                playClickSound();
                if (confirm("Are you sure you want to reset all performance statistics?")) {
                  onResetStats();
                }
              }}
              className="py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold rounded-2xl active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Stats
            </button>
            <button
              onClick={onClose}
              className="py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl active:scale-[0.98] transition-all text-xs shadow-md"
            >
              Back to Arena
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
