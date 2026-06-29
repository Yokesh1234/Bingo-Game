import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Volume2, VolumeX, LogOut, RotateCcw, Award, ShieldAlert, WifiOff, MessageSquare, Cpu } from "lucide-react";
import { playClickSound, playMarkSound, playLineCompleteSound, playWinnerSound } from "../utils/audio";
import { Player, Room, GameEvent } from "../types";

interface BingoGameProps {
  room: Room;
  myPlayerId: string;
  markedNumbers: number[];
  turnIndex: number;
  winners: string[];
  myBoard: number[][];
  onSelectNumber: (num: number) => void;
  onRestart: () => void;
  onLeave: () => void;
  logs: GameEvent[];
}

export default function BingoGame({
  room,
  myPlayerId,
  markedNumbers,
  turnIndex,
  winners,
  myBoard,
  onSelectNumber,
  onRestart,
  onLeave,
  logs,
}: BingoGameProps) {
  const [muted, setMuted] = useState(false);
  const [localLinesCount, setLocalLinesCount] = useState(0);

  const activePlayer = room.players[turnIndex];
  const isMyTurn = activePlayer?.id === myPlayerId;
  const markedSet = new Set(markedNumbers);

  const myPlayerObj = room.players.find((p) => p.id === myPlayerId);
  const myCompletedLines = myPlayerObj?.completedLines || 0;

  // Track lines that are complete to highlight them
  const [completedRows, setCompletedRows] = useState<number[]>([]);
  const [completedCols, setCompletedCols] = useState<number[]>([]);
  const [completedDiags, setCompletedDiags] = useState<number[]>([]); // 0: main, 1: anti

  // Check lines on board update to play a sound and trigger visual highlights
  useEffect(() => {
    if (!myBoard || myBoard.length !== 5) return;

    const rows: number[] = [];
    const cols: number[] = [];
    const diags: number[] = [];

    // Check rows
    for (let r = 0; r < 5; r++) {
      let complete = true;
      for (let c = 0; c < 5; c++) {
        if (!markedSet.has(myBoard[r][c])) {
          complete = false;
          break;
        }
      }
      if (complete) rows.push(r);
    }

    // Check cols
    for (let c = 0; c < 5; c++) {
      let complete = true;
      for (let r = 0; r < 5; r++) {
        if (!markedSet.has(myBoard[r][c])) {
          complete = false;
          break;
        }
      }
      if (complete) cols.push(c);
    }

    // Check main diag
    let d1 = true;
    for (let i = 0; i < 5; i++) {
      if (!markedSet.has(myBoard[i][i])) {
        d1 = false;
        break;
      }
    }
    if (d1) diags.push(0);

    // Check anti diag
    let d2 = true;
    for (let i = 0; i < 5; i++) {
      if (!markedSet.has(myBoard[i][4 - i])) {
        d2 = false;
        break;
      }
    }
    if (d2) diags.push(1);

    const totalLines = rows.length + cols.length + diags.length;

    // If lines count increased, play a line sound
    if (totalLines > localLinesCount) {
      if (!muted) {
        if (totalLines >= 5) {
          playWinnerSound();
        } else {
          playLineCompleteSound();
        }
      }
      setLocalLinesCount(totalLines);
    } else if (totalLines < localLinesCount) {
      // Re-sync if game resets
      setLocalLinesCount(totalLines);
    }

    setCompletedRows(rows);
    setCompletedCols(cols);
    setCompletedDiags(diags);
  }, [markedNumbers, myBoard, muted]);

  // Handle choosing a cell
  const handleCellClick = (val: number) => {
    if (!isMyTurn || room.gameState !== "PLAYING") return;
    if (markedSet.has(val)) return;

    if (!muted) playMarkSound();
    onSelectNumber(val);
  };

  // Check if a specific cell belongs to any completed line (for visual green highlight)
  const isCellInCompletedLine = (r: number, c: number) => {
    if (completedRows.includes(r)) return true;
    if (completedCols.includes(c)) return true;
    if (completedDiags.includes(0) && r === c) return true;
    if (completedDiags.includes(1) && r === 4 - c) return true;
    return false;
  };

  // Get Bingo progress letter coloring
  const getBingoLetterStyle = (index: number) => {
    const activeLettersCount = Math.min(5, myCompletedLines);
    if (index < activeLettersCount) {
      return "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110 border-emerald-400";
    }
    return "bg-slate-50 text-slate-300 border-slate-200";
  };

  const bingoLetters = ["B", "I", "N", "G", "O"];

  // Render winner layout
  const isWinner = winners.includes(myPlayerId);
  const winnerPlayers = room.players.filter((p) => winners.includes(p.id));

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 space-y-6">
      {/* HEADER HUD */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-xl shadow-slate-100/50">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            1-25 Bingo Room
            <span className="font-mono text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              {room.code}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Turn order: {room.players.map((p) => p.name).join(" ➔ ")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute Toggle */}
          <button
            onClick={() => setMuted(!muted)}
            className="p-2.5 rounded-xl hover:bg-slate-100 border border-slate-100 text-slate-500 transition-all"
            title={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
          </button>
          {/* Leave Button */}
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100/80 rounded-xl transition-all border border-rose-100"
          >
            <LogOut className="h-4 w-4" />
            Lobby
          </button>
        </div>
      </div>

      {/* BINGO PROGRESS HEADER */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-100/50 text-center">
        <h3 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
          Your Bingo Progress
        </h3>
        <div className="flex justify-center items-center gap-3 md:gap-5" id="bingo_letters_row">
          {bingoLetters.map((letter, idx) => {
            const isLit = idx < myCompletedLines;
            return (
              <motion.div
                key={`letter_${idx}`}
                id={`bingo_letter_${letter}`}
                className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl border-2 flex items-center justify-center font-black text-xl md:text-3xl transition-all ${getBingoLetterStyle(
                  idx
                )}`}
                animate={isLit ? { scale: [1, 1.2, 1.1] } : {}}
                transition={{ duration: 0.3, type: "spring" }}
              >
                {letter}
              </motion.div>
            );
          })}
        </div>
        <p className="text-sm text-slate-500 mt-4">
          Lines completed: <span className="font-extrabold text-slate-800">{myCompletedLines} / 5</span>
        </p>
      </div>

      {/* ACTIVE GAME GRID & LOGS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: THE BINGO BOARD */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50 p-6 flex flex-col items-center">
          {/* Turn Banner */}
          <div className="w-full mb-6">
            <AnimatePresence mode="wait">
              {isMyTurn ? (
                <motion.div
                  key="my_turn_banner"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl p-4 text-center shadow-lg shadow-emerald-500/10 border border-emerald-400"
                >
                  <p className="font-bold text-sm tracking-wide uppercase">Your Turn!</p>
                  <p className="text-xs opacity-90 mt-0.5">Click any unmarked cell on your board.</p>
                </motion.div>
              ) : (
                <motion.div
                  key="other_turn_banner"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-50 border border-slate-100 text-slate-600 rounded-2xl p-4 text-center"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Turn</p>
                  <p className="font-bold text-sm text-slate-700 mt-0.5">
                    {activePlayer ? activePlayer.name : "Waiting..."} is choosing
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5x5 Play Board */}
          <div
            id="play_board_container"
            className={`w-full max-w-sm grid grid-cols-5 gap-2.5 p-3.5 bg-slate-100 rounded-2xl border transition-all ${
              isMyTurn
                ? "ring-4 ring-emerald-500/10 border-emerald-300"
                : "border-slate-200"
            }`}
          >
            {myBoard.map((row, rIdx) =>
              row.map((val, cIdx) => {
                const isMarked = markedSet.has(val);
                const isInLine = isCellInCompletedLine(rIdx, cIdx);

                return (
                  <button
                    key={`play_${rIdx}_${cIdx}`}
                    id={`cell_play_${rIdx}_${cIdx}`}
                    disabled={isMarked || !isMyTurn}
                    onClick={() => handleCellClick(val)}
                    className={`relative aspect-square font-black text-lg md:text-xl rounded-xl transition-all shadow-sm ${
                      isMarked
                        ? isInLine
                          ? "bg-emerald-500 text-white border-2 border-emerald-400 shadow-emerald-100/50"
                          : "bg-slate-200 text-slate-400 border border-slate-300 line-through cursor-not-allowed"
                        : isMyTurn
                        ? "bg-white hover:bg-emerald-50 text-slate-800 border-2 border-slate-200 hover:border-emerald-300 active:scale-95 hover:scale-[1.02] cursor-pointer"
                        : "bg-white text-slate-600 border border-slate-200 cursor-not-allowed"
                    }`}
                  >
                    {val}
                    {isMarked && (
                      <span className="absolute bottom-1 right-1">
                        <Check className={`h-3 w-3 ${isInLine ? "text-emerald-100" : "text-slate-400"}`} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SCOREBOARD, PLAYERS, AND LIVE CHAT/EVENTS LOG */}
        <div className="lg:col-span-5 space-y-6">
          {/* Room Scoreboard */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              Scoreboard
            </h3>
            <div className="space-y-2.5" id="game_scoreboard">
              {room.players.map((player) => {
                const isMe = player.id === myPlayerId;
                const isActive = player.id === activePlayer?.id;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      isActive
                        ? "bg-emerald-50/50 border-emerald-100"
                        : isMe
                        ? "bg-slate-50 border-slate-100"
                        : "bg-white border-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-xs">
                          {player.isBot ? <Cpu className="w-4 h-4 text-slate-500" /> : player.name.charAt(0).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 block h-2 w-2 rounded-full ring-2 ring-white ${
                            player.isOnline ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        ></span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          {player.name}
                          {isMe && <span className="text-[9px] bg-slate-200/60 px-1 rounded">You</span>}
                          {player.isBot && <span className="text-[9px] text-violet-600 bg-violet-100 px-1 rounded">BOT</span>}
                        </span>
                        <div className="flex gap-0.5 text-[10px] tracking-wider text-emerald-600 font-bold">
                          {Array.from({ length: Math.min(5, player.completedLines) }).map((_, idx) => (
                            <span key={idx}>{bingoLetters[idx]}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-slate-700">
                        {player.completedLines} <span className="text-slate-300">/ 5</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Live Room Event Logs */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50 p-6 flex flex-col h-72">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Live Log
            </h3>
            <div
              className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-200"
              id="game_event_logs"
            >
              {logs.map((log, index) => {
                let logBg = "bg-slate-50 text-slate-500";
                if (log.type === "success") logBg = "bg-emerald-50 text-emerald-700 font-medium";
                if (log.type === "win") logBg = "bg-amber-50 text-amber-800 font-bold border border-amber-100";
                if (log.type === "select") logBg = "bg-slate-800 text-white font-semibold";
                if (log.type === "disconnect") logBg = "bg-rose-50 text-rose-600";

                return (
                  <div
                    key={index}
                    className={`p-2.5 rounded-xl text-xs flex justify-between items-center ${logBg}`}
                  >
                    <span>{log.text}</span>
                    <span className="text-[10px] opacity-60 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
              {logs.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-12">No events logged yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BINGO GAME OVER OVERLAY MODAL */}
      <AnimatePresence>
        {room.gameState === "FINISHED" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border border-slate-100 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-6"
              id="win_overlay_modal"
            >
              <div className="relative inline-flex items-center justify-center">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center animate-bounce">
                  <Award className="h-10 w-10 text-amber-500" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tight text-slate-800">
                  🎉 BINGO!
                </h2>
                <div className="text-sm text-slate-500">
                  We have {winnerPlayers.length > 1 ? "winners" : "a winner"}!
                </div>
                <div className="text-xl font-extrabold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl inline-block mt-1">
                  {winnerPlayers.map((w) => w.name).join(" & ")}
                </div>
              </div>

              {/* Show final standings */}
              <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Final Standings</h4>
                {room.players
                  .sort((a, b) => b.completedLines - a.completedLines)
                  .map((p, idx) => (
                    <div key={p.id} className="flex justify-between items-center text-xs text-slate-700">
                      <span className="font-semibold flex items-center gap-1.5">
                        <span className="text-slate-400 w-4 font-mono">#{idx + 1}</span>
                        {p.name}
                        {p.id === myPlayerId && <span className="text-[10px] text-slate-400 font-normal">(You)</span>}
                      </span>
                      <span className="font-bold text-slate-800">{p.completedLines} lines</span>
                    </div>
                  ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  id="restart_game_btn"
                  onClick={onRestart}
                  className="flex-1 py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 transition-all text-sm"
                >
                  <RotateCcw className="h-4 w-4" />
                  Play Again
                </button>
                <button
                  id="lobby_return_btn"
                  onClick={onLeave}
                  className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
                >
                  Return to Lobby
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
