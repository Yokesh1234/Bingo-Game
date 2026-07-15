import { useState, FormEvent } from "react";
import { motion } from "motion/react";
import { Play, ArrowRight, ArrowLeft, User, Hash, Users, Cpu } from "lucide-react";
import { playClickSound } from "../utils/audio";

interface LobbyProps {
  onJoin: (roomCode: string, name: string) => void;
  onCreate: (name: string, isBotGame?: boolean) => void;
  defaultName: string;
  onBackToMenu?: () => void;
  gameType?: 'bingo' | 'dots';
}

export default function Lobby({ onJoin, onCreate, defaultName, onBackToMenu, gameType = 'bingo' }: LobbyProps) {
  const [name, setName] = useState(defaultName);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  const handleCreate = (e: FormEvent, isBotGame: boolean = false) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name first!");
      return;
    }
    setError("");
    playClickSound();
    onCreate(name.trim(), isBotGame);
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name first!");
      return;
    }
    if (!roomCode.trim() || roomCode.trim().length !== 6) {
      setError("Please enter a valid 6-character room code.");
      return;
    }
    setError("");
    playClickSound();
    onJoin(roomCode.trim().toUpperCase(), name.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-100/50 p-8"
      id="lobby_container"
    >
      <div className="text-center mb-8 relative">
        {onBackToMenu && (
          <button
            onClick={() => { playClickSound(); onBackToMenu(); }}
            className="absolute -top-3 -left-3 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl transition-all"
            title="Back to Game Arena"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
        )}
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-800" id="lobby_title">
          {gameType === 'dots' ? (
            <>Dots & <span className="text-violet-500">Boxes</span></>
          ) : (
            <>1-25 <span className="text-emerald-500">Bingo</span></>
          )}
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          {gameType === 'dots'
            ? "Connect dots, complete boxes, and challenge friends in real-time."
            : "A real-time multiplayer version of the classic Indian 1–25 board game."}
        </p>
      </div>

      <div className="space-y-6">
        {/* Name input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold tracking-wider uppercase text-slate-400 block">
            Your Name
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <User className="h-4 w-4" />
            </span>
            <input
              id="player_name_input"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error && e.target.value.trim()) setError("");
              }}
              maxLength={15}
              className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all text-sm ${
                gameType === 'dots'
                  ? 'focus:ring-violet-500/20 focus:border-violet-500'
                  : 'focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
            />
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 rounded-lg p-3 text-center"
            id="lobby_error"
          >
            {error}
          </motion.div>
        )}

        {/* Divider & Action modes */}
        <div className="grid grid-cols-1 gap-6 pt-2">
          {/* Create Room Block */}
          {gameType === 'dots' ? (
            <button
              id="create_room_btn"
              onClick={(e) => handleCreate(e, false)}
              className="w-full py-4 px-4 bg-violet-500 hover:bg-violet-600 active:scale-[0.98] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-violet-500/15 hover:shadow-violet-500/25 transition-all text-sm"
            >
              <Users className="h-5 w-5" />
              Create Room & Play
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-1">
              <button
                id="create_room_btn"
                onClick={(e) => handleCreate(e, false)}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all text-sm"
              >
                <Users className="h-5 w-5 mb-1" />
                Play with Friends
              </button>
              <button
                id="create_bot_room_btn"
                onClick={(e) => handleCreate(e, true)}
                className="w-full py-3.5 px-4 bg-violet-500 hover:bg-violet-600 active:scale-[0.98] text-white font-semibold rounded-xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 transition-all text-sm"
              >
                <Cpu className="h-5 w-5 mb-1" />
                Play vs PC
              </button>
            </div>
          )}

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-xs font-bold tracking-widest uppercase text-slate-300">
              OR JOIN ROOM
            </span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          {/* Join Room Form */}
          <form onSubmit={handleJoin} className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wider uppercase text-slate-400 block">
                Room Code
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Hash className="h-4 w-4" />
                </span>
                <input
                  id="room_code_input"
                  type="text"
                  placeholder="e.g. A7FQ92"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value.toUpperCase().slice(0, 6));
                    if (error) setError("");
                  }}
                  className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-center tracking-widest text-slate-700 placeholder-slate-400 uppercase font-semibold focus:outline-none focus:ring-2 transition-all text-sm ${
                    gameType === 'dots'
                      ? 'focus:ring-violet-500/20 focus:border-violet-500'
                      : 'focus:ring-emerald-500/20 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            <button
              id="join_room_submit_btn"
              type="submit"
              className={`w-full py-3.5 px-4 active:scale-[0.98] text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all text-sm ${
                gameType === 'dots'
                  ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/15 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-900 shadow-slate-800/10 shadow-md'
              }`}
            >
              <Play className="h-4 w-4" />
              Join Room
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <h4 className="text-xs font-bold tracking-wider uppercase text-slate-400 mb-2">Rules of the Game</h4>
        {gameType === 'dots' ? (
          <ul className="text-xs text-slate-500 space-y-1.5 text-left list-disc list-inside">
            <li>Take turns drawing horizontal or vertical lines between dots.</li>
            <li>Completing the 4th side of any 1x1 box claims it for points.</li>
            <li>Claiming a box awards you an <span className="font-semibold text-slate-700">extra consecutive turn</span>!</li>
            <li>The player with the most claimed boxes at the end wins the match.</li>
          </ul>
        ) : (
          <ul className="text-xs text-slate-500 space-y-1.5 text-left list-disc list-inside">
            <li>Arrange numbers 1 to 25 in any secret layout you prefer.</li>
            <li>Once all players are ready, take turns selecting a number.</li>
            <li>Selecting a number marks it on <span className="font-semibold text-slate-700">everyone's</span> board.</li>
            <li>Completing any full Row, Column, or Diagonal makes a line.</li>
            <li>First player to complete <span className="font-semibold text-emerald-600">5 lines (B-I-N-G-O)</span> wins!</li>
          </ul>
        )}
      </div>
    </motion.div>
  );
}
