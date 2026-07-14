import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, RotateCcw, Award, Cpu, Users, Volume2, VolumeX, Shuffle, Check, Sparkles, MessageSquare, Plus } from "lucide-react";
import { playClickSound, playMarkSound, playLineCompleteSound, playWinnerSound } from "../utils/audio";
import { PlatformSettings, BingoSetup } from "../types";

interface CustomBingoProps {
  setup: BingoSetup;
  settings: PlatformSettings;
  onBackToMenu: () => void;
  onRecordGame: (winnerId: 'player1' | 'player2') => void;
}

export default function CustomBingo({
  setup,
  settings,
  onBackToMenu,
  onRecordGame,
}: CustomBingoProps) {
  const { rows, cols, isBotGame, freeCenter, generationMode, winningPatterns } = setup;
  const totalNumbers = rows * cols;
  const targetLinesToWin = Math.max(3, Math.min(5, Math.floor((rows + cols) / 2))); // 3 for 3x3, 4 for 4x4, 5 for 5x5+

  const player1Name = settings.player1Name || "Player 1";
  const player1Color = settings.player1Color || "#10b981"; // Emerald
  const player2Name = isBotGame ? "PC Bot" : (settings.player2Name || "Player 2");
  const player2Color = isBotGame ? "#8b5cf6" : (settings.player2Color || "#8b5cf6"); // Violet

  // Boards states
  const [playerBoard, setPlayerBoard] = useState<number[][]>([]);
  const [botBoard, setBotBoard] = useState<number[][]>([]);
  const [boardReady, setBoardReady] = useState(false);
  
  // Manual creation states
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  
  // Gameplay states
  const [markedNumbers, setMarkedNumbers] = useState<number[]>([]);
  const [turn, setTurn] = useState<'player1' | 'player2'>('player1');
  const [gameLogs, setGameLogs] = useState<{ text: string; type: 'system' | 'player1' | 'player2' | 'win' }[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [winner, setWinner] = useState<'player1' | 'player2' | 'draw' | null>(null);

  // Line stats
  const [playerCompletedLines, setPlayerCompletedLines] = useState(0);
  const [botCompletedLines, setBotCompletedLines] = useState(0);

  // Generate a randomized board array
  const generateRandomBoard = (): number[][] => {
    const numbers = Array.from({ length: totalNumbers }, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    const board: number[][] = [];
    for (let r = 0; r < rows; r++) {
      board.push(numbers.slice(r * cols, r * cols + cols));
    }
    return board;
  };

  const initGame = () => {
    setMarkedNumbers([]);
    setTurn('player1');
    setIsFinished(false);
    setWinner(null);
    setSelectedCell(null);
    setPlayerCompletedLines(0);
    setBotCompletedLines(0);
    
    // PC Bot board is always auto-generated randomly
    const newBotBoard = generateRandomBoard();
    setBotBoard(newBotBoard);

    if (generationMode === 'random') {
      const newPlayerBoard = generateRandomBoard();
      setPlayerBoard(newPlayerBoard);
      setBoardReady(true);
      setGameLogs([{ text: "Game started! Your board is ready.", type: 'system' }]);
    } else {
      // Create empty board filled with 0s
      setPlayerBoard(Array(rows).fill(null).map(() => Array(cols).fill(0)));
      setBoardReady(false);
      setGameLogs([{ text: "Fill your custom board to start.", type: 'system' }]);
    }
    playClickSound();
  };

  useEffect(() => {
    initGame();
  }, [rows, cols, isBotGame, freeCenter, generationMode]);

  // Handle auto-populating free center cell
  useEffect(() => {
    if (boardReady && freeCenter) {
      const centerR = Math.floor(rows / 2);
      const centerC = Math.floor(cols / 2);
      const numAtCenter = playerBoard[centerR]?.[centerC];
      if (numAtCenter && !markedNumbers.includes(numAtCenter)) {
        setMarkedNumbers([numAtCenter]);
      }
    }
  }, [boardReady]);

  // Calculate completed lines based on patterns selected
  const checkCompletedLinesAndPatterns = (board: number[][], currentMarked: number[]) => {
    if (board.length === 0) return 0;
    const markedSet = new Set(currentMarked);
    let count = 0;

    // Check rows pattern
    if (winningPatterns.rows) {
      for (let r = 0; r < rows; r++) {
        let completed = true;
        for (let c = 0; c < cols; c++) {
          const isCenter = freeCenter && r === Math.floor(rows / 2) && c === Math.floor(cols / 2);
          if (!isCenter && !markedSet.has(board[r][c])) {
            completed = false;
            break;
          }
        }
        if (completed) count++;
      }
    }

    // Check columns pattern
    if (winningPatterns.columns) {
      for (let c = 0; c < cols; c++) {
        let completed = true;
        for (let r = 0; r < rows; r++) {
          const isCenter = freeCenter && r === Math.floor(rows / 2) && c === Math.floor(cols / 2);
          if (!isCenter && !markedSet.has(board[r][c])) {
            completed = false;
            break;
          }
        }
        if (completed) count++;
      }
    }

    // Check diagonals (if square matrix)
    if (winningPatterns.diagonals && rows === cols) {
      // Left-to-right diagonal
      let d1 = true;
      for (let i = 0; i < rows; i++) {
        const isCenter = freeCenter && i === Math.floor(rows / 2);
        if (!isCenter && !markedSet.has(board[i][i])) {
          d1 = false;
        }
      }
      if (d1) count++;

      // Right-to-left diagonal
      let d2 = true;
      for (let i = 0; i < rows; i++) {
        const isCenter = freeCenter && i === Math.floor(rows / 2) && (rows - 1 - i) === Math.floor(cols / 2);
        if (!isCenter && !markedSet.has(board[i][rows - 1 - i])) {
          d2 = false;
        }
      }
      if (d2) count++;
    }

    // Check corners (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
    if (winningPatterns.corners) {
      if (
        markedSet.has(board[0][0]) &&
        markedSet.has(board[0][cols - 1]) &&
        markedSet.has(board[rows - 1][0]) &&
        markedSet.has(board[rows - 1][cols - 1])
      ) {
        count++;
      }
    }

    // X Pattern
    if (winningPatterns.xPattern && rows === cols) {
      let xMatches = true;
      for (let i = 0; i < rows; i++) {
        const isCenter = freeCenter && i === Math.floor(rows / 2);
        if (!isCenter && !markedSet.has(board[i][i])) xMatches = false;
        if (!isCenter && !markedSet.has(board[i][rows - 1 - i])) xMatches = false;
      }
      if (xMatches) count++;
    }

    // Plus Pattern
    if (winningPatterns.plusPattern) {
      const midR = Math.floor(rows / 2);
      const midC = Math.floor(cols / 2);
      let plusMatches = true;
      
      // Check horizontal middle line
      for (let c = 0; c < cols; c++) {
        if (!markedSet.has(board[midR][c])) plusMatches = false;
      }
      // Check vertical middle line
      for (let r = 0; r < rows; r++) {
        if (!markedSet.has(board[r][midC])) plusMatches = false;
      }
      if (plusMatches) count++;
    }

    // Custom Pattern: Frame / Border cells complete
    if (winningPatterns.customPattern) {
      let borderMatches = true;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
            if (!markedSet.has(board[r][c])) borderMatches = false;
          }
        }
      }
      if (borderMatches) count++;
    }

    return count;
  };

  // Recalculate completed lines as numbers get marked
  useEffect(() => {
    if (!boardReady) return;

    const pLines = checkCompletedLinesAndPatterns(playerBoard, markedNumbers);
    const bLines = checkCompletedLinesAndPatterns(botBoard, markedNumbers);

    setPlayerCompletedLines(pLines);
    setBotCompletedLines(bLines);

    // Audio triggers
    if (markedNumbers.length > 0 && settings.soundEnabled) {
      if (pLines > playerCompletedLines) {
        playLineCompleteSound();
      } else {
        playMarkSound();
      }
    }

    // Check win condition
    const pWins = pLines >= targetLinesToWin;
    const bWins = bLines >= targetLinesToWin;

    if (pWins || bWins) {
      setIsFinished(true);
      if (pWins && bWins) {
        setWinner('draw');
        setGameLogs(prev => [{ text: "🎉 Double BINGO! It's a grand draw!", type: 'system' }, ...prev]);
        onRecordGame('player1'); // record victory
      } else if (pWins) {
        setWinner('player1');
        setGameLogs(prev => [{ text: `🎉 BINGO! Congratulations ${player1Name}!`, type: 'win' }, ...prev]);
        onRecordGame('player1');
        if (settings.soundEnabled) playWinnerSound();
      } else {
        setWinner('player2');
        setGameLogs(prev => [{ text: `😔 BINGO! ${player2Name} claims the victory.`, type: 'system' }, ...prev]);
        onRecordGame('player2');
        if (settings.soundEnabled) playWinnerSound();
      }
    }
  }, [markedNumbers, boardReady]);

  // Handle picking/selecting a cell value in manual mode
  const assignManualNumber = (num: number) => {
    if (!selectedCell) return;
    playClickSound();

    // Check if duplicate
    let isDuplicate = false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (playerBoard[r][c] === num) {
          isDuplicate = true;
          break;
        }
      }
    }

    if (isDuplicate) return;

    const updated = playerBoard.map((rowArr, rIdx) => {
      if (rIdx !== selectedCell.r) return rowArr;
      return rowArr.map((cellVal, cIdx) => (cIdx === selectedCell.c ? num : cellVal));
    });

    setPlayerBoard(updated);

    // Auto move selected cell to next empty cell
    let nextCell = null;
    let foundCurrent = false;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === selectedCell.r && c === selectedCell.c) {
          foundCurrent = true;
          continue;
        }
        if (foundCurrent && updated[r][c] === 0) {
          nextCell = { r, c };
          break;
        }
      }
      if (nextCell) break;
    }

    // Fallback to find any empty cell from the start if sequential is not found
    if (!nextCell) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (updated[r][c] === 0) {
            nextCell = { r, c };
            break;
          }
        }
        if (nextCell) break;
      }
    }

    setSelectedCell(nextCell);
  };

  // Submit manual creation
  const handleStartGameWithManualBoard = () => {
    playClickSound();
    // Validate if any zeros exist
    const hasEmpty = playerBoard.some(row => row.some(val => val === 0));
    if (hasEmpty) {
      alert("Please fill all cells of your Bingo board before starting!");
      return;
    }
    setBoardReady(true);
    setGameLogs([{ text: "Custom board submitted! Game is live.", type: 'system' }]);
  };

  // Select/Mark a number in active turn
  const selectNumber = (num: number) => {
    if (isFinished || markedNumbers.includes(num)) return;
    if (turn !== 'player1') return;

    setMarkedNumbers(prev => [...prev, num]);
    setGameLogs(prev => [
      { text: `${player1Name} selected ${num}`, type: 'player1' },
      ...prev
    ]);

    // Give turn to Bot
    setTurn('player2');
  };

  // Bot Turn trigger
  useEffect(() => {
    if (!isBotGame || turn !== 'player2' || isFinished || !boardReady) return;

    const botDelay = setTimeout(() => {
      // Smart Bot strategy:
      // Identify unmarked numbers on bot's own board and evaluate which pick completes the most lines
      const unmarkedNumbers: number[] = [];
      botBoard.forEach((row) => {
        row.forEach((num) => {
          if (!markedNumbers.includes(num)) {
            unmarkedNumbers.push(num);
          }
        });
      });

      if (unmarkedNumbers.length === 0) return;

      let chosenNum = unmarkedNumbers[0];
      let maxLinesCompleted = -1;

      // Simple lookahead evaluation to choose the best number to complete lines
      unmarkedNumbers.forEach((candidate) => {
        const potentialMarked = [...markedNumbers, candidate];
        const linesCount = checkCompletedLinesAndPatterns(botBoard, potentialMarked);
        if (linesCount > maxLinesCompleted) {
          maxLinesCompleted = linesCount;
          chosenNum = candidate;
        }
      });

      // Fallback to select a highly connected number if no lines are immediately completable
      if (maxLinesCompleted <= botCompletedLines) {
        chosenNum = unmarkedNumbers[Math.floor(Math.random() * unmarkedNumbers.length)];
      }

      setMarkedNumbers(prev => [...prev, chosenNum]);
      setGameLogs(prev => [
        { text: `${player2Name} selected ${chosenNum}`, type: 'player2' },
        ...prev
      ]);
      setTurn('player1');
    }, settings.animationSpeed === 'slow' ? 1500 : settings.animationSpeed === 'fast' ? 500 : 900);

    return () => clearTimeout(botDelay);
  }, [turn, isBotGame, markedNumbers, botBoard, isFinished, boardReady]);

  // List of all numbers to find unused ones in manual mode
  const allManualNumbers = Array.from({ length: totalNumbers }, (_, i) => i + 1);
  const usedNumbers = new Set(playerBoard.flat());

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
              Bingo vs PC
            </h2>
            <p className="text-xs text-slate-400">
              Custom Matrix: {rows} x {cols} • Target to Win: {targetLinesToWin} patterns
            </p>
          </div>
        </div>

        <button
          onClick={initGame}
          className="px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs"
        >
          <RotateCcw className="w-4 h-4" />
          Restart Game
        </button>
      </header>

      {/* Main setup and play states split */}
      {!boardReady ? (
        /* Manual Board Creation step */
        <div className="flex-1 flex flex-col md:flex-row gap-6 items-center justify-center">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-xl w-full max-w-md">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-2.5 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-500" /> Manual Board Editor
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Tap a cell on the grid, then select an available number from the list below to assign it. Clear the board anytime by restarting.
            </p>

            {/* Editing Board Grid */}
            <div
              className="grid gap-2 mb-6"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
              }}
            >
              {playerBoard.map((rowArr, r) =>
                rowArr.map((cellVal, c) => {
                  const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => { playClickSound(); setSelectedCell({ r, c }); }}
                      className={`aspect-square rounded-xl border flex items-center justify-center font-black text-base transition-all ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105'
                          : cellVal > 0
                          ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-100 dark:border-slate-700/60 text-slate-300'
                      }`}
                    >
                      {cellVal > 0 ? cellVal : "?"}
                    </button>
                  );
                })
              )}
            </div>

            <button
              onClick={handleStartGameWithManualBoard}
              disabled={playerBoard.some(r => r.some(v => v === 0))}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-bold rounded-2xl active:scale-[0.98] transition-all text-sm shadow-md"
            >
              Confirm Board Configuration
            </button>
          </div>

          {/* Unused numbers picker pool */}
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-3xl w-full max-w-sm flex-1 flex flex-col justify-between self-stretch">
            <div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-3">
                Unused Numbers Pool
              </span>
              
              <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto p-1">
                {allManualNumbers.map((num) => {
                  const isUsed = usedNumbers.has(num);
                  return (
                    <button
                      key={num}
                      disabled={isUsed || !selectedCell}
                      onClick={() => assignManualNumber(num)}
                      className={`aspect-square rounded-lg border text-sm font-extrabold flex items-center justify-center transition-all ${
                        isUsed
                          ? 'bg-slate-100 border-slate-100 dark:bg-slate-800 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed line-through'
                          : 'bg-white hover:bg-emerald-50 dark:bg-slate-900 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-500 active:scale-95'
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => {
                playClickSound();
                // Randomize unfilled cells
                const pool = allManualNumbers.filter(num => !usedNumbers.has(num));
                const updated = playerBoard.map((rowArr) =>
                  rowArr.map((cellVal) => {
                    if (cellVal > 0) return cellVal;
                    const randIdx = Math.floor(Math.random() * pool.length);
                    const pick = pool.splice(randIdx, 1)[0];
                    return pick;
                  })
                );
                setPlayerBoard(updated);
                setSelectedCell(null);
              }}
              className="mt-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-2"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Autofill Remaining Randomly
            </button>
          </div>
        </div>
      ) : (
        /* Active Game Play State */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Active board and markers (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-xl w-full max-w-[460px]">
              <div className="flex items-center justify-between mb-4 border-b border-slate-50 dark:border-slate-800/80 pb-3">
                <span className="text-xs text-slate-400 font-bold">Your Game Card</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 font-bold">Score:</span>
                  <span className="text-sm font-black text-emerald-500">{playerCompletedLines} / {targetLinesToWin}</span>
                </div>
              </div>

              {/* Game Grid */}
              <div
                className="grid gap-2.5"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
                }}
              >
                {playerBoard.map((rowArr, r) =>
                  rowArr.map((cellVal, c) => {
                    const isMarked = markedNumbers.includes(cellVal);
                    const isCenter = freeCenter && r === Math.floor(rows / 2) && c === Math.floor(cols / 2);
                    const canSelect = turn === 'player1' && !isMarked && !isFinished;

                    return (
                      <button
                        key={`${r}-${c}`}
                        disabled={!canSelect}
                        onClick={() => selectNumber(cellVal)}
                        className={`aspect-square rounded-2xl border flex flex-col items-center justify-center transition-all ${
                          isMarked
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-[0.97]'
                            : isCenter
                            ? 'bg-amber-500 border-amber-500 text-white shadow-inner animate-pulse'
                            : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:scale-[1.03] active:scale-95'
                        }`}
                      >
                        {isCenter && isMarked ? (
                          <span className="text-[10px] font-black">FREE</span>
                        ) : isCenter ? (
                          <span className="text-[10px] font-black text-amber-100">FREE</span>
                        ) : (
                          <span className="text-lg font-black">{cellVal}</span>
                        )}
                        {isMarked && !isCenter && <Check className="w-3.5 h-3.5 mt-0.5" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Game details, opponent statistics and logs (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Action status/Turn bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Current Turn:</span>
              <span
                className={`text-xs font-black px-3 py-1 rounded-full text-white tracking-wider uppercase flex items-center gap-1.5 ${
                  turn === 'player1' ? 'bg-emerald-500' : 'bg-violet-500'
                }`}
              >
                {turn === 'player1' ? (
                  <>Your Turn</>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5 animate-bounce" /> PC Thinking...
                  </>
                )}
              </span>
            </div>

            {/* Scoreboard block */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Completed Patterns</span>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-600 dark:text-slate-300">{player1Name}</span>
                  <div className="flex gap-0.5 text-emerald-500 font-extrabold text-xs">
                    {Array.from({ length: targetLinesToWin }).map((_, i) => (
                      <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < playerCompletedLines ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    ))}
                    <span className="ml-1.5">{playerCompletedLines}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm border-t border-slate-50 dark:border-slate-800/80 pt-2">
                  <span className="font-bold text-slate-600 dark:text-slate-300">{player2Name}</span>
                  <div className="flex gap-0.5 text-violet-500 font-extrabold text-xs">
                    {Array.from({ length: targetLinesToWin }).map((_, i) => (
                      <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < botCompletedLines ? 'bg-violet-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                    ))}
                    <span className="ml-1.5">{botCompletedLines}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Logs and events console */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm h-[180px] flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Match Log Console
              </span>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {gameLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg font-medium ${
                      log.type === 'win'
                        ? 'bg-amber-50 border border-amber-200 text-amber-700 font-bold'
                        : log.type === 'player1'
                        ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                        : log.type === 'player2'
                        ? 'bg-violet-50 border border-violet-100 text-violet-700'
                        : 'bg-slate-50 border border-slate-100 text-slate-500'
                    }`}
                  >
                    {log.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WINNER MODAL SCREEN OVERLAY */}
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
                {winner === 'draw' ? "Double BINGO!" : "BINGO Winner!"}
              </h3>

              <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                {winner === 'draw'
                  ? "Incredible match! Both you and the computer declared BINGO simultaneously!"
                  : winner === 'player1'
                  ? `Spectacular victory! You claimed ${playerCompletedLines} patterns before the bot could counter!`
                  : `Well played, but PC Bot claimed ${botCompletedLines} completed patterns first.`}
              </p>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={initGame}
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
