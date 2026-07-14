import { motion, AnimatePresence } from "motion/react";
import { X, Settings, Sun, Moon, Volume2, VolumeX, FastForward, Play, ShieldAlert } from "lucide-react";
import { playClickSound } from "../utils/audio";
import { PlatformSettings } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PlatformSettings;
  onUpdateSettings: (newSettings: Partial<PlatformSettings>) => void;
}

const colorPresets = [
  { class: "bg-emerald-500", hex: "#10b981", name: "Emerald" },
  { class: "bg-violet-500", hex: "#8b5cf6", name: "Violet" },
  { class: "bg-amber-500", hex: "#f59e0b", name: "Amber" },
  { class: "bg-sky-500", hex: "#0ea5e9", name: "Sky Blue" },
  { class: "bg-rose-500", hex: "#f43f5e", name: "Crimson" },
  { class: "bg-slate-600", hex: "#475569", name: "Slate" },
];

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: SettingsModalProps) {
  if (!isOpen) return null;

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
              <Settings className="w-5 h-5 text-emerald-500" />
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                Global Settings
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
            {/* Player Configurations */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Player 1 Profile (Human)
              </label>
              <div className="grid grid-cols-1 gap-2.5 mb-2">
                <input
                  type="text"
                  value={settings.player1Name}
                  onChange={(e) => {
                    onUpdateSettings({ player1Name: e.target.value });
                  }}
                  placeholder="Player 1 Name"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-slate-800 dark:text-slate-100"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 mr-2">Color:</span>
                  {colorPresets.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => {
                        playClickSound();
                        onUpdateSettings({ player1Color: color.hex });
                      }}
                      className={`w-7 h-7 rounded-full ${color.class} transition-all border ${
                        settings.player1Color === color.hex
                          ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-50 dark:border-slate-800/80 pt-4">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Player 2 Profile (Human/PC Bot)
              </label>
              <div className="grid grid-cols-1 gap-2.5 mb-2">
                <input
                  type="text"
                  value={settings.player2Name}
                  onChange={(e) => {
                    onUpdateSettings({ player2Name: e.target.value });
                  }}
                  placeholder="Player 2 Name"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-slate-800 dark:text-slate-100"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400 mr-2">Color:</span>
                  {colorPresets.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => {
                        playClickSound();
                        onUpdateSettings({ player2Color: color.hex });
                      }}
                      className={`w-7 h-7 rounded-full ${color.class} transition-all border ${
                        settings.player2Color === color.hex
                          ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Sound & Theme Controls */}
            <div className="border-t border-slate-50 dark:border-slate-800/80 pt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Sound Effects
                </label>
                <button
                  onClick={() => {
                    playClickSound();
                    onUpdateSettings({ soundEnabled: !settings.soundEnabled });
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    settings.soundEnabled
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400'
                      : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600'
                  }`}
                >
                  {settings.soundEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4" /> Enabled
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 text-rose-500" /> Muted
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Theme Choice
                </label>
                <button
                  onClick={() => {
                    playClickSound();
                    onUpdateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-all text-slate-600 dark:text-slate-300"
                >
                  {settings.theme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-500" /> Light Mode
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4" /> Dark Mode
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Animation Speed */}
            <div className="border-t border-slate-50 dark:border-slate-800/80 pt-4">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Animation Speed
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['slow', 'normal', 'fast'] as const).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      playClickSound();
                      onUpdateSettings({ animationSpeed: speed });
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold capitalize transition-all ${
                      settings.animationSpeed === speed
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl active:scale-[0.98] transition-all text-sm shadow-md"
          >
            Apply & Close
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
