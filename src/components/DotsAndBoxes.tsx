import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, RotateCcw, Award, Cpu, Users, Volume2, VolumeX, Eye, ArrowLeftRight, CornerUpLeft } from "lucide-react";
import { playClickSound, playMarkSound, playLineCompleteSound, playWinnerSound } from "../utils/audio";
import { PlatformSettings, DotsSetup } from "../types";

interface DotsAndBoxesProps {
  setup: DotsSetup;
  settings: PlatformSettings;
  onBackToMenu: () => void;
  onRecordGame: (winnerId: 'player1' | 'player2' | 'draw') => void;
}

interface Line {
  r: number;
  c: number;
  type: 'h' | 'v'; // horizontal or vertical
  owner: 'player1' | 'player2';
}

interface Box {
  r: number;
  c: number;
  owner: 'player1' | 'player2' | null;
}

interface GameStateHistory {
  lines: Line[];
  boxes: Box[];
  scores: { player1: number; player2: number };
  turn: 'player1' | 'player2';
  isFinished: boolean;
}

export default function DotsAndBoxes({
  setup,
  settings,
  onBackToMenu,
  onRecordGame,
}: DotsAndBoxesProps) {
  const { rows, cols, isBotGame } = setup;

  // Player Names & Colors
  const player1Name = settings.player1Name || "Player 1";
  const player1Color = settings.player1Color || "#10b981"; // Emerald
  const player2Name = isBotGame ? "PC Bot" : (settings.player2Name || "Player 2");
  const player2Color = isBotGame ? "#8b5cf6" : (settings.player2Color || "#8b5cf6"); // Violet

  // Game States
  const [lines, setLines] = useState<Line[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [turn, setTurn] = useState<'player1' | 'player2'>('player1');
  const [isFinished, setIsFinished] = useState(false);
  const [winner, setWinner] = useState<'player1' | 'player2' | 'draw' | null>(null);

  // Undo History
  const [history, setHistory] = useState<GameStateHistory[]>([]);

  // Hovered line state for drawing preview
  const [hoveredLine, setHoveredLine] = useState<{ r: number; c: number; type: 'h' | 'v' } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Initialize fresh game board
  const initializeGame = () => {
    setLines([]);
    
    // Create boxes state
    const initialBoxes: Box[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        initialBoxes.push({ r, c, owner: null });
      }
    }
    setBoxes(initialBoxes);
    setScores({ player1: 0, player2: 0 });
    setTurn('player1');
    setIsFinished(false);
    setWinner(null);
    setHistory([]);
    setHoveredLine(null);
    playClickSound();
  };

  useEffect(() => {
    initializeGame();
  }, [rows, cols, isBotGame]);

  // Save state to history for undo
  const saveToHistory = (currentLines: Line[], currentBoxes: Box[], currentScores: typeof scores, currentTurn: typeof turn, currentIsFinished: boolean) => {
    const snap: GameStateHistory = {
      lines: JSON.parse(JSON.stringify(currentLines)),
      boxes: JSON.parse(JSON.stringify(currentBoxes)),
      scores: { ...currentScores },
      turn: currentTurn,
      isFinished: currentIsFinished,
    };
    setHistory((prev) => [...prev, snap]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    playClickSound();

    // If bot game and it's player turn, undoing means going back to the last state that was the player's turn!
    let nextHistory = [...history];
    let snap = nextHistory.pop();

    if (isBotGame && snap && snap.turn === 'player2' && nextHistory.length > 0) {
      // If we undo right after bot took a turn, pop again to restore player's turn before their own move!
      snap = nextHistory.pop();
    }

    if (snap) {
      setLines(snap.lines);
      setBoxes(snap.boxes);
      setScores(snap.scores);
      setTurn(snap.turn);
      setIsFinished(snap.isFinished);
      setWinner(null);
      setHistory(nextHistory);
    }
  };

  // Helper to check if line exists
  const getLine = (r: number, c: number, type: 'h' | 'v', checkLines: Line[] = lines) => {
    return checkLines.find((l) => l.r === r && l.c === c && l.type === type) || null;
  };

  // Main Draw / Move logic
  const claimLine = (r: number, c: number, type: 'h' | 'v', activePlayer: 'player1' | 'player2') => {
    if (isFinished) return false;
    if (getLine(r, c, type)) return false; // Already claimed

    const newLine: Line = { r, c, type, owner: activePlayer };
    const updatedLines = [...lines, newLine];

    // Save history BEFORE making the move
    saveToHistory(lines, boxes, scores, turn, isFinished);

    // Check if we completed any boxes
    let boxesCompletedCount = 0;
    const updatedBoxes = boxes.map((box) => {
      if (box.owner) return box;

      // Check all 4 lines of this box
      // Horizontal top: (r, c, 'h')
      // Horizontal bottom: (r + 1, c, 'h')
      // Vertical left: (r, c, 'v')
      // Vertical right: (r, c + 1, 'v')
      const top = getLine(box.r, box.c, 'h', updatedLines);
      const bottom = getLine(box.r + 1, box.c, 'h', updatedLines);
      const left = getLine(box.r, box.c, 'v', updatedLines);
      const right = getLine(box.r, box.c + 1, 'v', updatedLines);

      if (top && bottom && left && right) {
        boxesCompletedCount++;
        return { ...box, owner: activePlayer };
      }
      return box;
    });

    // Update scores
    const updatedScores = { ...scores };
    if (activePlayer === 'player1') {
      updatedScores.player1 += boxesCompletedCount;
    } else {
      updatedScores.player2 += boxesCompletedCount;
    }

    // Play appropriate sound
    if (settings.soundEnabled) {
      if (boxesCompletedCount > 0) {
        playLineCompleteSound();
      } else {
        playMarkSound();
      }
    }

    setLines(updatedLines);
    setBoxes(updatedBoxes);
    setScores(updatedScores);

    // Total boxes
    const totalBoxesCount = rows * cols;
    const allBoxesClaimed = updatedScores.player1 + updatedScores.player2 === totalBoxesCount;

    if (allBoxesClaimed) {
      setIsFinished(true);
      let winSide: 'player1' | 'player2' | 'draw' = 'draw';
      if (updatedScores.player1 > updatedScores.player2) {
        winSide = 'player1';
        setWinner('player1');
      } else if (updatedScores.player2 > updatedScores.player1) {
        winSide = 'player2';
        setWinner('player2');
      } else {
        setWinner('draw');
      }
      onRecordGame(winSide);
      if (settings.soundEnabled) {
        playWinnerSound();
      }
    } else {
      // If boxes were completed, active player gets another turn!
      if (boxesCompletedCount === 0) {
        setTurn(activePlayer === 'player1' ? 'player2' : 'player1');
      }
    }

    return true;
  };

  // Bot logic
  useEffect(() => {
    if (!isBotGame || turn !== 'player2' || isFinished) return;

    const timer = setTimeout(() => {
      // Bot decision engine
      const allPossibleLines: { r: number; c: number; type: 'h' | 'v' }[] = [];
      
      // Horizontal lines
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!getLine(r, c, 'h')) allPossibleLines.push({ r, c, type: 'h' });
        }
      }
      // Vertical lines
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c <= cols; c++) {
          if (!getLine(r, c, 'v')) allPossibleLines.push({ r, c, type: 'v' });
        }
      }

      if (allPossibleLines.length === 0) return;

      // Evaluation: Count sides of each box to prioritize moves
      const getBoxSidesCount = (box: Box, currentLines: Line[]) => {
        let count = 0;
        if (getLine(box.r, box.c, 'h', currentLines)) count++;
        if (getLine(box.r + 1, box.c, 'h', currentLines)) count++;
        if (getLine(box.r, box.c, 'v', currentLines)) count++;
        if (getLine(box.r, box.c + 1, 'v', currentLines)) count++;
        return count;
      };

      // 1. GREEDY STEP: Check if any box has exactly 3 lines completed (completing it claims points and gives another turn!)
      const closingMoves: { r: number; c: number; type: 'h' | 'v' }[] = [];
      // 2. SAFE MOVES: Pick lines that DO NOT complete the 3rd side of any box (to avoid giving opponent box completion moves)
      const safeMoves: { r: number; c: number; type: 'h' | 'v' }[] = [];
      // 3. DEAD-END MOVES: Lines that complete 3rd side of box (gives away a point)
      const badMoves: { r: number; c: number; type: 'h' | 'v' }[] = [];

      allPossibleLines.forEach((candidate) => {
        // Evaluate what happens if we place this line
        const tempLines = [...lines, { ...candidate, owner: 'player2' as const }];
        
        // Find boxes touched by this line
        let completedABox = false;
        let createsThreeSidedBox = false;

        boxes.forEach((box) => {
          if (box.owner) return;
          const originalSides = getBoxSidesCount(box, lines);
          const newSides = getBoxSidesCount(box, tempLines);

          if (originalSides === 3 && newSides === 4) {
            completedABox = true;
          }
          if (originalSides === 2 && newSides === 3) {
            createsThreeSidedBox = true;
          }
        });

        if (completedABox) {
          closingMoves.push(candidate);
        } else if (createsThreeSidedBox) {
          badMoves.push(candidate);
        } else {
          safeMoves.push(candidate);
        }
      });

      let chosenMove = null;

      if (closingMoves.length > 0) {
        // Greedy win! Take first box completion
        chosenMove = closingMoves[0];
      } else if (safeMoves.length > 0) {
        // Play a safe move
        chosenMove = safeMoves[Math.floor(Math.random() * safeMoves.length)];
      } else {
        // No safe moves, just take any bad move (try to choose one with least damaging outcome)
        chosenMove = badMoves[Math.floor(Math.random() * badMoves.length)];
      }

      if (chosenMove) {
        claimLine(chosenMove.r, chosenMove.c, chosenMove.type, 'player2');
      }
    }, settings.animationSpeed === 'slow' ? 1200 : settings.animationSpeed === 'fast' ? 400 : 700);

    return () => clearTimeout(timer);
  }, [turn, isBotGame, lines, boxes, isFinished]);

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
      if (isFinished || (isBotGame && turn === 'player2')) return;

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
      if (isFinished || (isBotGame && turn === 'player2')) return;
      if (hoveredLine) {
        claimLine(hoveredLine.r, hoveredLine.c, hoveredLine.type, 'player1');
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

  const remainingBoxes = boxes.filter(b => b.owner === null).length;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col justify-between min-h-[85vh]">
      {/* Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { playClickSound(); onBackToMenu(); }}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-all"
            title="Back to Main Menu"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              Dots and Boxes
            </h2>
            <p className="text-xs text-slate-400">
              Board Size: {rows} x {cols} • {isBotGame ? "Playing vs AI" : "Local Two Player"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {history.length > 0 && !isFinished && (
            <button
              onClick={handleUndo}
              className="px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs"
              title="Undo Last Move"
            >
              <CornerUpLeft className="w-4 h-4" />
              Undo
            </button>
          )}
          <button
            onClick={initializeGame}
            className="px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>
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
                  onClick={initializeGame}
                  className="py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl active:scale-[0.98] transition-all text-sm shadow-md"
                >
                  Play Again
                </button>
                <button
                  onClick={() => { playClickSound(); onBackToMenu(); }}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-2xl active:scale-[0.98] transition-all text-sm"
                >
                  Back to Menu
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
