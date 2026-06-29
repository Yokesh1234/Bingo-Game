import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trash2, Sparkles, Check, Users, Loader, Cpu } from "lucide-react";
import { playClickSound, playReadySound } from "../utils/audio";
import { Player } from "../types";

interface BoardCreationProps {
  roomCode: string;
  players: Player[];
  myPlayerId: string;
  onSubmit: (board: number[][]) => void;
  myReadyStatus: boolean;
}

export default function BoardCreation({
  roomCode,
  players,
  myPlayerId,
  onSubmit,
  myReadyStatus,
}: BoardCreationProps) {
  // Local state for the 5x5 board (0 means empty)
  const [board, setBoard] = useState<number[][]>(() =>
    Array(5)
      .fill(null)
      .map(() => Array(5).fill(0))
  );

  // Next number to be placed (from 1 to 25)
  const [nextNum, setNextNum] = useState(1);

  // Derive how many numbers are placed
  const numbersPlaced = nextNum - 1;

  // Clear the board
  const handleClear = () => {
    playClickSound();
    setBoard(
      Array(5)
        .fill(null)
        .map(() => Array(5).fill(0))
    );
    setNextNum(1);
  };

  // Randomly fill the board with 1-25
  const handleRandomize = () => {
    playReadySound();
    const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
    // Shuffle numbers (Fisher-Yates)
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const newBoard: number[][] = [];
    for (let i = 0; i < 5; i++) {
      newBoard.push(numbers.slice(i * 5, i * 5 + 5));
    }

    setBoard(newBoard);
    setNextNum(26); // All numbers placed
  };

  // Handle cell click
  const handleCellClick = (r: number, c: number) => {
    if (myReadyStatus) return;

    const cellValue = board[r][c];

    // If cell is already filled, let's not replace it automatically unless they clear,
    // or let's remove the number if they click it (allowing them to fix mistakes easily!).
    // To allow fixing: clicking an already placed number will clear it and adjust nextNum!
    if (cellValue > 0) {
      playClickSound();
      // To keep it simple and avoid gaps, we can clear this cell, but that would leave a gap.
      // Alternatively, we can let them clear the whole board, or if we remove a cell,
      // all numbers greater than that cell shift down or we just allow clicking empty cells.
      // Let's do the simplest and most intuitive: if they click a filled cell, we clear that cell
      // and reset the board filling sequence to that number (and remove all numbers greater than that cell).
      // This is extremely clever and user-friendly!
      const clearedVal = board[r][c];
      const newBoard = board.map((row) =>
        row.map((val) => (val >= clearedVal ? 0 : val))
      );
      setBoard(newBoard);
      setNextNum(clearedVal);
      return;
    }

    if (nextNum > 25) return; // Board already full

    playClickSound();
    const newBoard = board.map((row, ri) =>
      row.map((val, ci) => (ri === r && ci === c ? nextNum : val))
    );

    setBoard(newBoard);
    setNextNum(nextNum + 1);
  };

  // Submit board
  const handleSubmit = () => {
    if (nextNum !== 26) return;
    onSubmit(board);
  };

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start px-4">
      {/* LEFT PANEL: Board Creation Area */}
      <div className="lg:col-span-7 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Create Your Board
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Room Code: <span className="font-mono font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-base">{roomCode}</span>
            </p>
          </div>
          {!myReadyStatus && (
            <div className="text-right">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Placed
              </span>
              <span className="text-xl font-black text-slate-700">
                {Math.min(25, numbersPlaced)} <span className="text-slate-300">/ 25</span>
              </span>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!myReadyStatus ? (
            <motion.div
              key="creation_controls"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Info text */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-700 block mb-1">How to place:</span>
                Click empty squares to place numbers from 1 to 25. To remove or reset, simply click any already-placed number to undo your board up to that point.
              </div>

              {/* 5x5 Grid */}
              <div className="grid grid-cols-5 gap-2.5 aspect-square max-w-sm mx-auto bg-slate-100 p-3 rounded-2xl border border-slate-200">
                {board.map((row, r) =>
                  row.map((val, c) => (
                    <button
                      key={`create_${r}_${c}`}
                      id={`cell_create_${r}_${c}`}
                      onClick={() => handleCellClick(r, c)}
                      className={`relative flex items-center justify-center font-bold text-lg md:text-xl aspect-square rounded-xl transition-all ${
                        val > 0
                          ? "bg-white text-slate-800 border-2 border-slate-200 shadow-sm hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 after:content-[''] after:absolute after:inset-0 after:rounded-xl after:opacity-0 hover:after:opacity-100 after:bg-rose-500/5 after:transition-all"
                          : "bg-slate-50 hover:bg-slate-200/50 text-transparent border border-dashed border-slate-300"
                      }`}
                    >
                      {val > 0 ? (
                        <motion.span
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                          {val}
                        </motion.span>
                      ) : (
                        nextNum <= 25 ? nextNum : ""
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <button
                  id="clear_board_btn"
                  onClick={handleClear}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </button>
                <button
                  id="random_board_btn"
                  onClick={handleRandomize}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  Randomize
                </button>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  id="submit_board_btn"
                  disabled={nextNum !== 26}
                  onClick={handleSubmit}
                  className={`w-full py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                    nextNum === 26
                      ? "bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white shadow-emerald-500/10 hover:shadow-emerald-500/20"
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                  }`}
                >
                  <Check className="h-5 w-5" />
                  Submit Layout & Start Game
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="waiting_room"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 space-y-6"
            >
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <Users className="absolute h-6 w-6 text-emerald-500" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800">
                  Waiting for other players...
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Your secret layout is locked in! The game will start automatically once everyone submits their board.
                </p>
              </div>

              {/* Submitted board preview */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 max-w-xs mx-auto">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  Your Locked Layout
                </h4>
                <div className="grid grid-cols-5 gap-1.5 aspect-square bg-slate-100 p-2 rounded-xl border border-slate-200/50">
                  {board.map((row) =>
                    row.map((val, i) => (
                      <div
                        key={`preview_${i}`}
                        className="flex items-center justify-center font-bold text-xs bg-white rounded-lg aspect-square text-slate-600 border border-slate-200"
                      >
                        {val}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT PANEL: Room Info & Players Status */}
      <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50 p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-400" />
          Players in Room ({players.length})
        </h3>

        <div className="space-y-3" id="player_status_list">
          {players.map((player) => {
            const isMe = player.id === myPlayerId;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isMe
                    ? "bg-slate-50/80 border-slate-200"
                    : "bg-white border-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm">
                      {player.isBot ? <Cpu className="w-5 h-5 text-slate-500" /> : player.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Online status indicator */}
                    <span
                      className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                        player.isOnline ? "bg-emerald-500" : "bg-slate-300 animate-pulse"
                      }`}
                    ></span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 text-sm flex items-center gap-1.5">
                      {player.name}
                      {isMe && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                      {player.isBot && (
                        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
                          BOT
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400 block">
                      {player.isBot ? "Ready to play" : (player.isOnline ? "Online" : "Offline / Disconnected")}
                    </span>
                  </div>
                </div>

                <div>
                  {player.ready ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                      <Check className="h-3.5 w-3.5" />
                      Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
                      <Loader className="h-3 w-3 animate-spin text-slate-400" />
                      Arranging Board
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {players.length < 2 && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 flex items-start gap-2.5">
            <span className="text-amber-500 font-bold text-base leading-none">!</span>
            <p>
              Bingo requires <span className="font-semibold">at least 2 players</span>. Send the Room Code to your friends so they can join!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
