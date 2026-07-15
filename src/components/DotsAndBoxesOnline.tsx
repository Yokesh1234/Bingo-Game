import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, RotateCcw, Award, Users, Copy, Check, ArrowLeftRight, CornerUpLeft } from "lucide-react";
import { playClickSound, playMarkSound, playLineCompleteSound, playWinnerSound } from "../utils/audio";
import { PlatformSettings, DotsRoom } from "../types";

interface DotsAndBoxesOnlineProps {
  room: DotsRoom;
  myPlayerId: string;
  settings: PlatformSettings;
  onSelectLine: (r: number, c: number, type: 'h'|'v') => void;
  onRestart: () => void;
  onLeave: () => void;
}

export default function DotsAndBoxesOnline({
  room,
  myPlayerId,
  settings,
  onSelectLine,
  onRestart,
  onLeave,
}: DotsAndBoxesOnlineProps) {
  const { rows, cols, lines, boxes, turnIndex, winner, gameState, players } = room;
  const isFinished = gameState === 'FINISHED';

  // Player Names & Colors
  const myPlayerIndex = players.findIndex(p => p.id === myPlayerId);
  const amIPlayer1 = myPlayerIndex === 0;

  const p1 = players[0];
  const p2 = players[1];

  const player1Name = p1?.name || "Player 1";
  const player1Color = amIPlayer1 ? settings.player1Color || "#10b981" : "#8b5cf6"; // Emerald/Violet
  const player2Name = p2?.name || "Player 2";
  const player2Color = amIPlayer1 ? "#8b5cf6" : settings.player1Color || "#10b981";

  const scores = {
    player1: p1?.score || 0,
    player2: p2?.score || 0
  };

  const turn = turnIndex === 0 ? 'player1' : 'player2';

  // UI state
  const [copiedCode, setCopiedCode] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<{ r: number; c: number; type: 'h' | 'v' } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Helper to check if line exists
  const getLine = (r: number, c: number, type: 'h' | 'v') => {
    return lines.find((l) => l.r === r && l.c === c && l.type === type) || null;
  };

  const handleLineClick = (r: number, c: number, type: 'h' | 'v') => {
    if (gameState !== 'PLAYING') return;
    if (turnIndex !== myPlayerIndex) return; // Not my turn
    if (getLine(r, c, type)) return;

    onSelectLine(r, c, type);
    playClickSound();
  };

  // Handle Canvas Drawing & Events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Responsive sizing logic
    const container = containerRef.current;
    if (!container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const padding = 32;
      const size = Math.min(rect.width - padding, rect.height - padding, 480);
      
      // Apply device pixel ratio for sharp lines
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      ctx.scale(dpr, dpr);
      
      drawBoard(ctx, size);
    };

    const drawBoard = (ctx: CanvasRenderingContext2D, size: number) => {
      // Clear
      ctx.clearRect(0, 0, size, size);

      const margin = 30;
      const playableWidth = size - margin * 2;
      const cellWidth = playableWidth / cols;
      const cellHeight = playableWidth / rows;

      // 1. Draw completed boxes backgrounds
      boxes.forEach((box) => {
        if (box.owner) {
          ctx.fillStyle = box.owner === 'player1' ? `${player1Color}1a` : `${player2Color}1a`; // 10% opacity
          ctx.fillRect(
            margin + box.c * cellWidth + 2,
            margin + box.r * cellHeight + 2,
            cellWidth - 4,
            cellHeight - 4
          );

          // Draw owner initial in center
          ctx.fillStyle = box.owner === 'player1' ? player1Color : player2Color;
          ctx.font = "bold 14px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const text = box.owner === 'player1' ? player1Name.charAt(0).toUpperCase() : player2Name.charAt(0).toUpperCase();
          ctx.fillText(text, margin + box.c * cellWidth + cellWidth / 2, margin + box.r * cellHeight + cellHeight / 2);
        }
      });

      // 2. Draw lines hover preview
      if (hoveredLine && turn === 'player1' && !isFinished) {
        ctx.strokeStyle = `${player1Color}60`; // 37% opacity
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();

        if (hoveredLine.type === 'h') {
          ctx.moveTo(margin + hoveredLine.c * cellWidth, margin + hoveredLine.r * cellHeight);
          ctx.lineTo(margin + (hoveredLine.c + 1) * cellWidth, margin + hoveredLine.r * cellHeight);
        } else {
          ctx.moveTo(margin + hoveredLine.c * cellWidth, margin + hoveredLine.r * cellHeight);
          ctx.lineTo(margin + hoveredLine.c * cellWidth, margin + (hoveredLine.r + 1) * cellHeight);
        }
        ctx.stroke();
      }

      // 3. Draw claimed lines
      lines.forEach((line) => {
        ctx.strokeStyle = line.owner === 'player1' ? player1Color : player2Color;
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();

        if (line.type === 'h') {
          ctx.moveTo(margin + line.c * cellWidth, margin + line.r * cellHeight);
          ctx.lineTo(margin + (line.c + 1) * cellWidth, margin + line.r * cellHeight);
        } else {
          ctx.moveTo(margin + line.c * cellWidth, margin + line.r * cellHeight);
          ctx.lineTo(margin + line.c * cellWidth, margin + (line.r + 1) * cellHeight);
        }
        ctx.stroke();
      });

      // 4. Draw grid dots
      for (let r = 0; r <= rows; r++) {
        for (let col = 0; col <= cols; col++) {
          ctx.fillStyle = settings.theme === 'dark' ? "#334155" : "#cbd5e1"; // dots color slate-700 / slate-300
          ctx.beginPath();
          ctx.arc(margin + col * cellWidth, margin + r * cellHeight, 6, 0, Math.PI * 2);
          ctx.fill();

          // Highlight dot with white center
          ctx.fillStyle = settings.theme === 'dark' ? "#0f172a" : "#ffffff";
          ctx.beginPath();
          ctx.arc(margin + col * cellWidth, margin + r * cellHeight, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    // Interaction handler logic
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (gameState !== 'PLAYING' || turnIndex !== myPlayerIndex) {
        setHoveredLine(null);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;

      if ('touches' in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const size = rect.width;
      const margin = 30;
      const playableWidth = size - margin * 2;
      const cellWidth = playableWidth / cols;
      const cellHeight = playableWidth / rows;

      // Find closest line
      let minDistance = Infinity;
      let closestLine: { r: number; c: number; type: 'h' | 'v' } | null = null;
      const threshold = 18; // detection radius

      // Check horizontal lines candidates
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c < cols; c++) {
          const lineY = margin + r * cellHeight;
          const startX = margin + c * cellWidth;
          const endX = margin + (c + 1) * cellWidth;

          if (x >= startX - 10 && x <= endX + 10) {
            const dist = Math.abs(y - lineY);
            if (dist < minDistance && dist < threshold) {
              minDistance = dist;
              closestLine = { r, c, type: 'h' };
            }
          }
        }
      }

      // Check vertical lines candidates
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const lineX = margin + c * cellWidth;
          const startY = margin + r * cellHeight;
          const endY = margin + (r + 1) * cellHeight;

          if (y >= startY - 10 && y <= endY + 10) {
            const dist = Math.abs(x - lineX);
            if (dist < minDistance && dist < threshold) {
              minDistance = dist;
              closestLine = { r, c, type: 'v' };
            }
          }
        }
      }

      // Check if candidate is already taken
      if (closestLine && getLine(closestLine.r, closestLine.c, closestLine.type)) {
        closestLine = null;
      }

      setHoveredLine(closestLine);
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (gameState !== 'PLAYING' || turnIndex !== myPlayerIndex) return;
      if (hoveredLine) {
        handleLineClick(hoveredLine.r, hoveredLine.c, hoveredLine.type);
        setHoveredLine(null);
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousemove", handlePointerMove);
    canvas.addEventListener("touchstart", handlePointerMove);
    canvas.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", handlePointerMove);
      canvas.removeEventListener("touchstart", handlePointerMove);
      canvas.removeEventListener("mousedown", handlePointerDown);
    };
  }, [lines, boxes, hoveredLine, turn, settings.theme]);

  if (gameState === 'WAITING') {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col justify-between min-h-[85vh]">
        {/* Header Bar */}
        <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { playClickSound(); onLeave(); }}
              className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-all"
              title="Leave Room"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                Dots and Boxes Online
              </h2>
              <div className="flex items-center gap-2 text-xs font-semibold mt-0.5">
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider">
                  {rows}x{cols} Grid
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Waiting lobby design */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full py-12">
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-100/50 dark:shadow-none text-center space-y-6">
            <div className="relative">
              {/* Pulsing indicator */}
              <div className="w-16 h-16 bg-violet-100 dark:bg-violet-500/10 text-violet-500 rounded-full flex items-center justify-center mx-auto shadow-md">
                <Users className="w-8 h-8 animate-pulse" />
              </div>
              <span className="absolute top-0 right-[calc(50%-2rem)] flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                Waiting for Opponent...
              </h3>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Share this room code with your friend. Once they join, the match will begin automatically!
              </p>
            </div>

            {/* Room Code Display Card */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                Your Room Code
              </span>
              
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-black tracking-widest text-slate-800 dark:text-slate-100 font-mono select-all">
                  {room.code}
                </span>
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(room.code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                    playClickSound();
                  }}
                  className={`p-3 rounded-xl transition-all ${
                    copiedCode
                      ? 'bg-emerald-500 text-white'
                      : 'bg-violet-500 text-white hover:bg-violet-600 active:scale-95 shadow-md shadow-violet-500/15'
                  }`}
                  title="Copy Room Code"
                >
                  {copiedCode ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>

              {copiedCode && (
                <p className="text-[11px] font-semibold text-emerald-500 animate-fade-in">
                  Room code copied to clipboard!
                </p>
              )}
            </div>

            {/* Current Players inside room */}
            <div className="space-y-3 pt-2 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Players in Room (1/2)
              </span>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/25 border border-slate-100 dark:border-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      {player1Name} <span className="text-xs text-violet-500 font-normal ml-1.5">(You, Host)</span>
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    Ready
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 animate-pulse" />
                    <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                      Waiting for player to connect...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const remainingBoxes = boxes.filter(b => b.owner === null).length;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col justify-between min-h-[85vh]">
      {/* Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { playClickSound(); onLeave(); }}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-all"
            title="Leave Room"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              Dots and Boxes
            </h2>
            <div className="flex items-center gap-2 text-xs font-semibold mt-0.5">
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded uppercase tracking-wider">
                {rows}x{cols} Grid
              </span>
              <span className="flex items-center gap-1 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded cursor-pointer group"
                    onClick={() => {
                      navigator.clipboard.writeText(room.code);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}>
                <span className="uppercase font-mono">ROOM: {room.code}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {isFinished && (
            <button
              onClick={onRestart}
              className="px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
          )}
        </div>
      </header>

      {/* Main Grid Section */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Statistics, Scores & Active Turn Indicator (4 Cols) */}
        <div className="lg:col-span-4 space-y-4 order-2 lg:order-1">
          {/* Active Turn banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4.5 rounded-3xl shadow-sm space-y-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Active Session
            </span>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: player1Color }}
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {player1Name}
                </span>
              </div>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                {scores.player1}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/80 pt-2.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: player2Color }}
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {player2Name}
                </span>
              </div>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                {scores.player2}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 px-3.5 py-2.5 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-800/80">
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                <ArrowLeftRight className="w-3.5 h-3.5 text-violet-500" /> Current Turn
              </span>
              <span
                className="text-xs font-black uppercase px-2.5 py-1 rounded-full text-white tracking-wider"
                style={{ backgroundColor: turn === 'player1' ? player1Color : player2Color }}
              >
                {turn === 'player1' ? player1Name : player2Name}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-medium text-center">
              Remaining Boxes to Claim: <strong className="text-slate-600 dark:text-slate-300">{remainingBoxes}</strong>
            </div>
          </div>

          {/* Guidelines info card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl text-xs text-slate-500 dark:text-slate-400 leading-relaxed border border-slate-100 dark:border-slate-800/60">
            <p className="font-extrabold text-slate-600 dark:text-slate-300 mb-1">How to Play:</p>
            <p>1. Take turns drawing horizontal or vertical lines between the dots.</p>
            <p>2. Complete the 4th side of any 1x1 box to claim it and score a point.</p>
            <p>3. Claiming a box awards you an <strong className="text-emerald-500">extra consecutive turn</strong>!</p>
          </div>
        </div>

        {/* Canvas Display Area (8 Cols) */}
        <div className="lg:col-span-8 flex justify-center order-1 lg:order-2">
          <div
            ref={containerRef}
            className="w-full max-w-[500px] aspect-square flex items-center justify-center p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-100/40 dark:shadow-none"
          >
            <canvas ref={canvasRef} className="cursor-crosshair block outline-none" />
          </div>
        </div>
      </div>

      {/* WINNER SCREEN OVERLAY */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md shadow-amber-500/10">
                <Award className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-1">
                {winner === 'draw' ? "It's a Draw!" : "Winner Announced!"}
              </h3>

              <p className="text-sm text-slate-400 mb-4">
                {winner === 'draw'
                  ? "Both sides successfully claimed an equal amount of boxes!"
                  : `Congratulations! ${winner === 'player1' ? player1Name : player2Name} outmaneuvered the board.`}
              </p>

              {/* Score summary */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-6 text-sm">
                <div>
                  <span className="block text-xs text-slate-400 font-bold">{player1Name}</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100">{scores.player1}</span>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-700">
                  <span className="block text-xs text-slate-400 font-bold">{player2Name}</span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-100">{scores.player2}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={onRestart}
                  className="py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl active:scale-[0.98] transition-all text-sm shadow-md"
                >
                  Play Again
                </button>
                <button
                  onClick={() => { playClickSound(); onLeave(); }}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-2xl active:scale-[0.98] transition-all text-sm"
                >
                  Leave Room
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
