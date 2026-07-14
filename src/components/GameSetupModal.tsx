import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Grid, Sliders, Play, Settings2, Cpu, Users, Eye } from "lucide-react";
import { playClickSound } from "../utils/audio";
import { BingoSetup, DotsSetup } from "../types";

interface GameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType: 'bingo' | 'dots';
  onStartBingo: (setup: BingoSetup) => void;
  onStartDots: (setup: DotsSetup) => void;
}

export default function GameSetupModal({
  isOpen,
  onClose,
  gameType,
  onStartBingo,
  onStartDots,
}: GameSetupModalProps) {
  const maxLimit = gameType === 'bingo' ? 10 : 20;
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [isBotGame, setIsBotGame] = useState(true);
  const [freeCenter, setFreeCenter] = useState(true);
  const [generationMode, setGenerationMode] = useState<'random' | 'manual'>('random');
  
  // Winning patterns checklist
  const [patterns, setPatterns] = useState({
    rows: true,
    columns: true,
    diagonals: true,
    corners: false,
    xPattern: false,
    plusPattern: false,
    customPattern: false,
  });

  const [validationError, setValidationError] = useState("");

  // Update defaults when game type changes
  useEffect(() => {
    if (gameType === 'bingo') {
      setRows(5);
      setCols(5);
    } else {
      setRows(4);
      setCols(4);
    }
  }, [gameType]);

  const handlePreset = (size: number) => {
    playClickSound();
    setRows(size);
    setCols(size);
    setValidationError("");
  };

  const handleStart = () => {
    playClickSound();
    if (rows < 3 || rows > maxLimit || cols < 3 || cols > maxLimit) {
      setValidationError(`Matrix dimensions must be between 3x3 and ${maxLimit}x${maxLimit}.`);
      return;
    }

    if (gameType === 'bingo') {
      onStartBingo({
        rows,
        cols,
        isBotGame,
        freeCenter,
        generationMode,
        winningPatterns: patterns,
      });
    } else {
      onStartDots({
        rows,
        cols,
        isBotGame,
      });
    }
    onClose();
  };

  // Pre-generate grid matrix for preview
  const previewCells = [];
  for (let r = 0; r < Math.min(rows, 10); r++) {
    for (let c = 0; c < Math.min(cols, 10); c++) {
      previewCells.push({ r, c });
    }
  }

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
          className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto z-10 flex flex-col md:flex-row"
        >
          {/* Setup controls */}
          <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <Settings2 className={`w-5 h-5 ${gameType === 'bingo' ? 'text-emerald-500' : 'text-violet-500'}`} />
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                  {gameType === 'bingo' ? 'Bingo Setup' : 'Dots & Boxes Setup'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Matrix customization options */}
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Matrix Custom Size (Between 3 and {maxLimit})
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1">Rows</label>
                    <input
                      type="number"
                      value={rows}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setRows(val);
                        setValidationError("");
                      }}
                      min={3}
                      max={maxLimit}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1">Columns</label>
                    <input
                      type="number"
                      value={cols}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setCols(val);
                        setValidationError("");
                      }}
                      min={3}
                      max={maxLimit}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {validationError && (
                  <p className="text-xs text-rose-500 font-semibold mb-3">{validationError}</p>
                )}

                {/* Presets */}
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Quick Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => handlePreset(num)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${
                        rows === num && cols === num
                          ? (gameType === 'bingo' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400' : 'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-500/10 dark:border-violet-500/30 dark:text-violet-400')
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border-slate-100 dark:border-slate-700/60 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {num} x {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game Specific Setup */}
              <div className="border-t border-slate-50 dark:border-slate-800/80 pt-4">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Opponent Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { playClickSound(); setIsBotGame(true); }}
                    className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 border text-sm font-semibold transition-all ${
                      isBotGame
                        ? (gameType === 'bingo' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-violet-500 border-violet-500 text-white')
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Cpu className="w-4 h-4" />
                    vs PC Bot
                  </button>
                  <button
                    onClick={() => { playClickSound(); setIsBotGame(false); }}
                    className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 border text-sm font-semibold transition-all ${
                      !isBotGame
                        ? (gameType === 'bingo' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-violet-500 border-violet-500 text-white')
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Local PvP
                  </button>
                </div>
              </div>

              {gameType === 'bingo' && (
                <div className="space-y-4 border-t border-slate-50 dark:border-slate-800/80 pt-4">
                  {/* Bingo generation modes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      Board Creation Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => { playClickSound(); setGenerationMode('random'); }}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                          generationMode === 'random'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30'
                            : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600'
                        }`}
                      >
                        Random Board Auto-Generated
                      </button>
                      <button
                        onClick={() => { playClickSound(); setGenerationMode('manual'); }}
                        className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                          generationMode === 'manual'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30'
                            : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600'
                        }`}
                      >
                        Manual Board (Custom inputs)
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Free Center Cell</span>
                      <p className="text-xs text-slate-400">Automatically mark the middle grid cell as free</p>
                    </div>
                    <button
                      onClick={() => { playClickSound(); setFreeCenter(!freeCenter); }}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-all ${
                        freeCenter ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transition-all ${freeCenter ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Winning Patterns */}
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                      Enabled Winning Patterns
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.keys(patterns).map((pat) => (
                        <label key={pat} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
                          <input
                            type="checkbox"
                            checked={(patterns as any)[pat]}
                            onChange={() => {
                              playClickSound();
                              setPatterns(prev => ({
                                ...prev,
                                [pat]: !(prev as any)[pat]
                              }));
                            }}
                            className="accent-emerald-500 h-4 w-4"
                          />
                          <span className="capitalize text-slate-700 dark:text-slate-300">
                            {pat.replace("Pattern", " Pattern")}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleStart}
              className={`w-full mt-8 py-3.5 px-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all text-sm ${
                gameType === 'bingo'
                  ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
                  : 'bg-violet-500 hover:bg-violet-600 shadow-violet-500/10'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              Start Game Now
            </button>
          </div>

          {/* Board preview / display area */}
          <div className="w-full md:w-[320px] bg-slate-50 dark:bg-slate-900/40 p-6 md:p-8 flex flex-col justify-between rounded-b-3xl md:rounded-b-none md:rounded-r-3xl">
            <div>
              <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                <Eye className="w-4 h-4" /> Live Board Preview
              </span>

              {/* Grid Preview */}
              <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-2xl bg-white dark:bg-slate-900/60 shadow-inner flex items-center justify-center min-h-[180px]">
                {gameType === 'bingo' ? (
                  <div
                    className="grid gap-1.5 w-full max-w-[160px]"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(cols, 10)}, minmax(0, 1fr))`
                    }}
                  >
                    {previewCells.map((cell, idx) => {
                      const isCenter = freeCenter && cell.r === Math.floor(rows / 2) && cell.c === Math.floor(cols / 2);
                      return (
                        <div
                          key={idx}
                          className={`aspect-square rounded flex items-center justify-center text-[10px] font-bold ${
                            isCenter
                              ? 'bg-emerald-500 text-white animate-pulse'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {isCenter ? 'FREE' : idx + 1}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="grid gap-4 p-2 relative"
                    style={{
                      gridTemplateColumns: `repeat(${Math.min(cols, 10)}, minmax(0, 1fr))`
                    }}
                  >
                    {/* Render dots for dots & boxes preview */}
                    {Array.from({ length: Math.min(rows + 1, 10) }).map((_, r) => (
                      <div key={r} className="flex gap-4">
                        {Array.from({ length: Math.min(cols + 1, 10) }).map((_, c) => (
                          <div
                            key={c}
                            className="w-2.5 h-2.5 bg-violet-400 dark:bg-violet-600 rounded-full shadow-sm"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 text-xs text-slate-400 space-y-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 p-3 rounded-xl">
              <p className="font-bold text-slate-500 dark:text-slate-400">Dimensions: {rows} x {cols}</p>
              <p>Total {gameType === 'bingo' ? 'Cells' : 'Boxes'}: {gameType === 'bingo' ? rows * cols : rows * cols}</p>
              <p>Opponent: {isBotGame ? 'PC Bot Level Smart' : 'Human Pass-and-Play'}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
