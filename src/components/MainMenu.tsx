import { motion } from "motion/react";
import { Grid, Cpu, Users, Volume2, VolumeX, Sun, Moon, BarChart2, Settings as SettingsIcon, Maximize2, Minimize2, Sparkles, Play } from "lucide-react";
import { PlatformSettings, GameStats } from "../types";
import { playClickSound } from "../utils/audio";
import { useState, useEffect } from "react";

interface MainMenuProps {
  settings: PlatformSettings;
  stats: GameStats;
  onSelectGame: (game: 'bingo-classic' | 'bingo-custom' | 'dots-and-boxes') => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

export default function MainMenu({
  settings,
  stats,
  onSelectGame,
  onToggleTheme,
  onToggleSound,
  onOpenSettings,
  onOpenStats,
}: MainMenuProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    playClickSound();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className={`w-full max-w-6xl mx-auto px-4 py-6 flex flex-col justify-between min-h-[85vh]`}>
      {/* Platform Header */}
      <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-tr from-emerald-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-500/10">
            <Grid className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-violet-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-violet-400">
              Arcade Arena
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Multiplayer & Solo Board Game Suite
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-1.5 rounded-2xl shadow-sm">
          <button
            onClick={() => { playClickSound(); onToggleSound(); }}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-all"
            title={settings.soundEnabled ? "Mute Sound" : "Enable Sound"}
          >
            {settings.soundEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5 text-rose-500" />}
          </button>
          <button
            onClick={() => { playClickSound(); onToggleTheme(); }}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-all"
            title="Toggle Theme"
          >
            {settings.theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5" />}
          </button>
          <div className="w-[1px] h-6 bg-slate-100 dark:bg-slate-800 mx-1" />
          <button
            onClick={() => { playClickSound(); onOpenStats(); }}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-all flex items-center gap-1.5 font-semibold text-xs"
            title="View Stats"
          >
            <BarChart2 className="w-4.5 h-4.5" />
            <span className="hidden sm:inline">Stats</span>
          </button>
          <button
            onClick={() => { playClickSound(); onOpenSettings(); }}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl transition-all flex items-center gap-1.5 font-semibold text-xs"
            title="Settings"
          >
            <SettingsIcon className="w-4.5 h-4.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

      {/* Main Content: Game Cards */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4">
        {/* BINGO Game Card */}
        <motion.div
          whileHover={{ y: -6 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none overflow-hidden flex flex-col justify-between min-h-[380px]"
        >
          {/* Visual Highlight Background */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full tracking-wider uppercase">
                Bingo Suite
              </span>
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center font-extrabold text-lg">
                B
              </div>
            </div>

            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">
              Super Bingo
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              The ultimate Bingo playground. Try the original 1-25 classic online rooms, or customize any board size from 3x3 to 10x10 with custom winning patterns and local bots.
            </p>

            <div className="space-y-2.5 mb-8">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Custom Board Size (3x3 up to 10x10)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Cpu className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Random / Manual generation & Bot AI opponents</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Users className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Classic 1-25 Real-Time Multiplayer Rooms</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-auto">
            <button
              onClick={() => { playClickSound(); onSelectGame('bingo-custom'); }}
              className="py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 active:scale-[0.98] transition-all text-sm"
            >
              <Cpu className="w-4 h-4" />
              Custom / Bot Play
            </button>
            <button
              onClick={() => { playClickSound(); onSelectGame('bingo-classic'); }}
              className="py-3.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all text-sm border border-slate-200/50 dark:border-slate-700"
            >
              <Users className="w-4 h-4" />
              Online Multi Room
            </button>
          </div>
        </motion.div>

        {/* DOTS & BOXES Game Card */}
        <motion.div
          whileHover={{ y: -6 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-xl shadow-slate-100/40 dark:shadow-none overflow-hidden flex flex-col justify-between min-h-[380px]"
        >
          {/* Visual Highlight Background */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-2xl" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-3 py-1 rounded-full tracking-wider uppercase">
                Strategy Suite
              </span>
              <div className="w-10 h-10 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl flex items-center justify-center">
                <Grid className="w-5 h-5" />
              </div>
            </div>

            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">
              Dots and Boxes
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              A timeless pencil-and-paper game brought to life with responsive canvas rendering. Claim boxes, gain extra turns, and outsmart the PC Bot or your friends.
            </p>

            <div className="space-y-2.5 mb-8">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <span>Adjustable Grids (3x3 up to 20x20)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Cpu className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <span>Intelligent PC Bot Opponent</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Users className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <span>Pass-and-Play Local 2-Player Combat</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 mt-auto">
            <button
              onClick={() => { playClickSound(); onSelectGame('dots-and-boxes'); }}
              className="py-3.5 px-4 bg-violet-500 hover:bg-violet-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-violet-500/15 active:scale-[0.98] transition-all text-sm"
            >
              <Play className="w-4 h-4" />
              Play Dots & Boxes
            </button>
          </div>
        </motion.div>
      </main>

      {/* Platform Footer stats summary */}
      <footer className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
        <p>Total Games Played: {stats.bingoClassicPlayed + stats.bingoCustomPlayed + stats.dotsPlayed} • Custom Setup Engine Ready</p>
      </footer>
    </div>
  );
}
