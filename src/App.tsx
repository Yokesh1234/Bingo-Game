import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { Wifi, WifiOff, AlertCircle, RefreshCw } from "lucide-react";
import Lobby from "./components/Lobby";
import BoardCreation from "./components/BoardCreation";
import BingoGame from "./components/BingoGame";

// Multi-Game Components
import MainMenu from "./components/MainMenu";
import GameSetupModal from "./components/GameSetupModal";
import SettingsModal from "./components/SettingsModal";
import StatisticsModal from "./components/StatisticsModal";
import DotsAndBoxes from "./components/DotsAndBoxes";
import DotsAndBoxesOnline from "./components/DotsAndBoxesOnline";
import CustomBingo from "./components/CustomBingo";

import { Player, Room, GameEvent, PlatformSettings, GameStats, BingoSetup, DotsSetup, DotsRoom } from "./types";
import { playClickSound } from "./utils/audio";

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [dotsRoom, setDotsRoom] = useState<DotsRoom | null>(null);
  const [myBoard, setMyBoard] = useState<number[][]>([]);
  const [logs, setLogs] = useState<GameEvent[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Persistent storage for Player Name and unique Session ID
  const [playerId] = useState<string>(() => {
    let pId = localStorage.getItem("bingo_player_id");
    if (!pId) {
      pId = "p_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem("bingo_player_id", pId);
    }
    return pId;
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem("bingo_player_name") || "";
  });

  // Keep track of current room code for auto-reconnection
  const activeRoomCodeRef = useRef<string | null>(null);

  // Platform State Managers
  const [gameMode, setGameMode] = useState<'menu' | 'bingo-classic' | 'bingo-custom' | 'dots-and-boxes-local' | 'dots-and-boxes-online'>('menu');
  const [bingoSetup, setBingoSetup] = useState<BingoSetup | null>(null);
  const [dotsSetup, setDotsSetup] = useState<DotsSetup | null>(null);

  // Modals visibility
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupType, setSetupType] = useState<'bingo' | 'dots'>('bingo');

  // Load and persist Settings & Statistics
  const [settings, setSettings] = useState<PlatformSettings>(() => {
    try {
      const saved = localStorage.getItem("arcade_platform_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.player1Name) parsed.player1Name = localStorage.getItem("bingo_player_name") || "";
        return parsed;
      }
    } catch (e) {}
    return {
      theme: 'light',
      soundEnabled: true,
      animationSpeed: 'normal',
      player1Name: localStorage.getItem("bingo_player_name") || "",
      player1Color: "#10b981",
      player2Name: "PC Bot",
      player2Color: "#8b5cf6",
    };
  });

  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const saved = localStorage.getItem("arcade_platform_stats");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      bingoClassicPlayed: 0,
      bingoClassicWins: 0,
      bingoCustomPlayed: 0,
      bingoCustomWins: 0,
      dotsPlayed: 0,
      dotsWins: 0,
      dotsDraws: 0,
    };
  });

  // Keep profile settings and platform values in sync
  useEffect(() => {
    localStorage.setItem("arcade_platform_settings", JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("arcade_platform_stats", JSON.stringify(stats));
  }, [stats]);

  // Sync player 1 name with settings profile
  useEffect(() => {
    if (playerName && settings.player1Name !== playerName) {
      setSettings(prev => ({ ...prev, player1Name: playerName }));
    }
  }, [playerName]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const socketInstance: Socket = io({
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setIsConnected(true);
      setErrorMsg(null);
      
      if (activeRoomCodeRef.current) {
        socketInstance.emit("join_room", {
          roomCode: activeRoomCodeRef.current,
          name: playerName,
          playerId,
        });
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("room_state", (updatedRoom: Room & { myBoard: number[][] }) => {
      setRoom(updatedRoom);
      activeRoomCodeRef.current = updatedRoom.code;
      if (updatedRoom.myBoard) {
        setMyBoard(updatedRoom.myBoard);
      }

      // Record Classic stats when room is finished
      if (updatedRoom.gameState === 'FINISHED' && updatedRoom.winners.length > 0) {
        const amIWinner = updatedRoom.winners.includes(playerId);
        setStats(prev => {
          // Check to prevent double counting of finished state
          const alreadyPlayed = localStorage.getItem(`bingo_played_${updatedRoom.code}`);
          if (alreadyPlayed) return prev;
          
          localStorage.setItem(`bingo_played_${updatedRoom.code}`, "true");
          return {
            ...prev,
            bingoClassicPlayed: prev.bingoClassicPlayed + 1,
            bingoClassicWins: amIWinner ? prev.bingoClassicWins + 1 : prev.bingoClassicWins,
          };
        });
      }
    });

    socketInstance.on("dots_room_state", (updatedDotsRoom: DotsRoom) => {
      setDotsRoom(updatedDotsRoom);
      activeRoomCodeRef.current = updatedDotsRoom.code;
    });

    socketInstance.on("game_log", (logItem: { text: string; type: any }) => {
      const event: GameEvent = {
        type: logItem.type as any,
        playerName: "",
        text: logItem.text,
        timestamp: Date.now(),
      };
      setLogs((prev) => [event, ...prev].slice(0, 50));
    });

    socketInstance.on("error_msg", (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => {
        setErrorMsg((current) => (current === msg ? null : current));
      }, 4000);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [playerId]);

  // Handle room creation
  const handleCreateRoom = (name: string, isBotGame?: boolean) => {
    if (!socket) return;
    setPlayerName(name);
    localStorage.setItem("bingo_player_name", name);
    setLogs([]);
    socket.emit("join_room", { roomCode: "", name, playerId, isBotGame });
  };

  // Handle joining an existing room
  const handleJoinRoom = (roomCode: string, name: string) => {
    if (!socket) return;
    setPlayerName(name);
    localStorage.setItem("bingo_player_name", name);
    setLogs([]);
    socket.emit("join_room", { roomCode, name, playerId });
  };

  // Handle board layout submission
  const handleSubmitBoard = (board: number[][]) => {
    if (!socket) return;
    setMyBoard(board);
    socket.emit("submit_board", { board });
  };

  // Handle selecting a number on active turn
  const handleSelectNumber = (num: number) => {
    if (!socket) return;
    socket.emit("select_number", { number: num });
  };

  // Handle Play Again / Restart Room
  const handleRestartGame = () => {
    if (!socket) return;
    socket.emit("restart_game");
  };

  // Handle leaving the room back to Lobby
  const handleLeaveRoom = () => {
    if (!socket) return;
    socket.emit("leave_room");
    setRoom(null);
    setMyBoard([]);
    setLogs([]);
    activeRoomCodeRef.current = null;
    setGameMode('menu');
  };

  const handleCreateDotsRoom = (name: string) => {
    if (!socket) return;
    setPlayerName(name);
    localStorage.setItem("bingo_player_name", name);
    socket.emit("join_dots_room", { roomCode: "", name, playerId, rows: 5, cols: 5 }); // default size for online
  };

  const handleJoinDotsRoom = (roomCode: string, name: string) => {
    if (!socket) return;
    setPlayerName(name);
    localStorage.setItem("bingo_player_name", name);
    socket.emit("join_dots_room", { roomCode, name, playerId });
  };

  const handleSelectDotsLine = (r: number, c: number, type: 'h'|'v') => {
    if (!socket) return;
    socket.emit("submit_dots_line", { r, c, type });
  };

  const handleRestartDotsRoom = () => {
    if (!socket) return;
    socket.emit("restart_dots_room");
  };

  const handleLeaveDotsRoom = () => {
    if (!socket) return;
    socket.emit("leave_dots_room");
    setDotsRoom(null);
    activeRoomCodeRef.current = null;
    setGameMode('menu');
  };
  const recordCustomBingoGame = (winnerId: 'player1' | 'player2') => {
    setStats((prev) => ({
      ...prev,
      bingoCustomPlayed: prev.bingoCustomPlayed + 1,
      bingoCustomWins: winnerId === 'player1' ? prev.bingoCustomWins + 1 : prev.bingoCustomWins,
    }));
  };

  const recordDotsGame = (winnerId: 'player1' | 'player2' | 'draw') => {
    setStats((prev) => ({
      ...prev,
      dotsPlayed: prev.dotsPlayed + 1,
      dotsWins: winnerId === 'player1' ? prev.dotsWins + 1 : prev.dotsWins,
      dotsDraws: winnerId === 'draw' ? prev.dotsDraws + 1 : prev.dotsDraws,
    }));
  };

  const isMyReadyStatus = room?.players.find((p) => p.id === playerId)?.ready || false;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased flex flex-col justify-between transition-colors">
      {/* GLOBAL CONNECTION STATUS BANNER */}
      <div className="relative z-50">
        <AnimatePresence>
          {!isConnected && gameMode === 'bingo-classic' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-amber-500 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2"
            >
              <WifiOff className="h-4 w-4 animate-pulse" />
              Disconnected from server. Trying to reconnect...
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Error notification banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-rose-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-sm font-semibold"
            >
              <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex items-center justify-center py-6">
        <AnimatePresence mode="wait">
          {gameMode === 'menu' ? (
            <motion.div
              key="menu_screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <MainMenu
                settings={settings}
                stats={stats}
                onSelectGame={(selected) => {
                  if (selected === 'bingo-classic') {
                    setGameMode('bingo-classic');
                  } else if (selected === 'bingo-custom') {
                    setSetupType('bingo');
                    setIsSetupOpen(true);
                  } else if (selected === 'dots-and-boxes-local') {
                    setSetupType('dots');
                    setIsSetupOpen(true);
                  } else if (selected === 'dots-and-boxes-online') {
                    setGameMode('dots-and-boxes-online');
                  }
                }}
                onToggleTheme={() => {
                  setSettings(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
                }}
                onToggleSound={() => {
                  setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
                }}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenStats={() => setIsStatsOpen(true)}
              />
            </motion.div>
          ) : gameMode === 'bingo-classic' ? (
            !room ? (
              <motion.div
                key="lobby_screen"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full flex justify-center"
              >
                <Lobby
                  defaultName={playerName}
                  onJoin={handleJoinRoom}
                  onCreate={handleCreateRoom}
                  onBackToMenu={() => setGameMode('menu')}
                />
              </motion.div>
            ) : room.gameState === "BOARD_CREATION" ? (
              <motion.div
                key="creation_screen"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <BoardCreation
                  roomCode={room.code}
                  players={room.players}
                  myPlayerId={playerId}
                  onSubmit={handleSubmitBoard}
                  myReadyStatus={isMyReadyStatus}
                  isBotGame={room.isBotGame}
                />
              </motion.div>
            ) : (
              <motion.div
                key="game_screen"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <BingoGame
                  room={room}
                  myPlayerId={playerId}
                  markedNumbers={room.markedNumbers}
                  turnIndex={room.turnIndex}
                  winners={room.winners}
                  myBoard={myBoard}
                  onSelectNumber={handleSelectNumber}
                  onRestart={handleRestartGame}
                  onLeave={handleLeaveRoom}
                  logs={logs}
                />
              </motion.div>
            )
          ) : gameMode === 'bingo-custom' && bingoSetup ? (
            <motion.div
              key="custom_bingo_screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full"
            >
              <CustomBingo
                setup={bingoSetup}
                settings={settings}
                onBackToMenu={() => setGameMode('menu')}
                onRecordGame={recordCustomBingoGame}
              />
            </motion.div>
          ) : gameMode === 'dots-and-boxes-local' && dotsSetup ? (
            <motion.div
              key="dots_screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full"
            >
              <DotsAndBoxes
                setup={dotsSetup}
                settings={settings}
                onBackToMenu={() => setGameMode('menu')}
                onRecordGame={recordDotsGame}
              />
            </motion.div>
          ) : gameMode === 'dots-and-boxes-online' ? (
            !dotsRoom ? (
              <motion.div
                key="lobby_dots_screen"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full flex justify-center"
              >
                <Lobby
                  defaultName={playerName}
                  onJoin={handleJoinDotsRoom}
                  onCreate={handleCreateDotsRoom}
                  onBackToMenu={() => setGameMode('menu')}
                  gameType="dots"
                />
              </motion.div>
            ) : (
              <motion.div
                key="dots_online_screen"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full"
              >
                <DotsAndBoxesOnline
                  room={dotsRoom}
                  myPlayerId={playerId}
                  settings={settings}
                  onSelectLine={handleSelectDotsLine}
                  onRestart={handleRestartDotsRoom}
                  onLeave={handleLeaveDotsRoom}
                />
              </motion.div>
            )
          ) : null}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="py-5 border-t border-slate-100 dark:border-slate-900 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
        <p>Arcade Board Game Suite © {new Date().getFullYear()} • Powered by React & Socket.IO</p>
      </footer>

      {/* OVERLAY MODALS */}
      <GameSetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        gameType={setupType}
        onStartBingo={(setup) => {
          setBingoSetup(setup);
          setGameMode('bingo-custom');
        }}
        onStartDots={(setup) => {
          setDotsSetup(setup);
          setGameMode('dots-and-boxes-local');
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSet) => {
          setSettings(prev => {
            const updated = { ...prev, ...newSet };
            if (newSet.player1Name) {
              setPlayerName(newSet.player1Name);
              localStorage.setItem("bingo_player_name", newSet.player1Name);
            }
            return updated;
          });
        }}
      />

      <StatisticsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        stats={stats}
        onResetStats={() => {
          setStats({
            bingoClassicPlayed: 0,
            bingoClassicWins: 0,
            bingoCustomPlayed: 0,
            bingoCustomWins: 0,
            dotsPlayed: 0,
            dotsWins: 0,
            dotsDraws: 0,
          });
        }}
      />
    </div>
  );
}
