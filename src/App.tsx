import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";
import { Wifi, WifiOff, AlertCircle, RefreshCw } from "lucide-react";
import Lobby from "./components/Lobby";
import BoardCreation from "./components/BoardCreation";
import BingoGame from "./components/BingoGame";
import { Player, Room, GameEvent } from "./types";

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
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

  // Initialize Socket.IO connection
  useEffect(() => {
    // Connect to the same origin (Express + Socket.IO server on port 3000)
    const socketInstance: Socket = io({
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setIsConnected(true);
      setErrorMsg(null);
      
      // Auto-reconnect if we were in an active room
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
    });

    socketInstance.on("game_log", (logItem: { text: string; type: any }) => {
      const event: GameEvent = {
        type: logItem.type as any,
        playerName: "",
        text: logItem.text,
        timestamp: Date.now(),
      };
      setLogs((prev) => [event, ...prev].slice(0, 50)); // limit to latest 50 logs
    });

    socketInstance.on("error_msg", (msg: string) => {
      setErrorMsg(msg);
      // Automatically clear error after 4 seconds
      setTimeout(() => {
        setErrorMsg((current) => (current === msg ? null : current));
      }, 4000);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [playerId]);

  // Handle room creation
  const handleCreateRoom = (name: string) => {
    if (!socket) return;
    setPlayerName(name);
    localStorage.setItem("bingo_player_name", name);
    setLogs([]);
    socket.emit("join_room", { roomCode: "", name, playerId });
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
  };

  // Check if player's board is ready
  const isMyReadyStatus = room?.players.find((p) => p.id === playerId)?.ready || false;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col justify-between">
      {/* GLOBAL CONNECTION STATUS BANNER */}
      <div className="relative z-50">
        <AnimatePresence>
          {!isConnected && (
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
      <main className="flex-1 flex items-center justify-center py-8">
        <AnimatePresence mode="wait">
          {!room ? (
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
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="py-6 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
        <p>1-25 Bingo © {new Date().getFullYear()} • Powered by Socket.IO & Express</p>
      </footer>
    </div>
  );
}
