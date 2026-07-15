import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Player, Room, GameState, DotsRoom } from "./src/types.js";

// Keep track of rooms in memory
const rooms: Record<string, Room> = {};
const dotsRooms: Record<string, DotsRoom> = {};

// Helper to generate a room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No easy-to-confuse characters
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Calculate the number of completed lines (rows, columns, diagonals)
function calculateCompletedLines(board: number[][], markedNumbers: Set<number>): number {
  if (!board || board.length !== 5) return 0;
  let completed = 0;

  // Check rows
  for (let r = 0; r < 5; r++) {
    let rowComplete = true;
    for (let c = 0; c < 5; c++) {
      if (!markedNumbers.has(board[r][c])) {
        rowComplete = false;
        break;
      }
    }
    if (rowComplete) completed++;
  }

  // Check columns
  for (let c = 0; c < 5; c++) {
    let colComplete = true;
    for (let r = 0; r < 5; r++) {
      if (!markedNumbers.has(board[r][c])) {
        colComplete = false;
        break;
      }
    }
    if (colComplete) completed++;
  }

  // Main diagonal (top-left to bottom-right)
  let diag1Complete = true;
  for (let i = 0; i < 5; i++) {
    if (!markedNumbers.has(board[i][i])) {
      diag1Complete = false;
      break;
    }
  }
  if (diag1Complete) completed++;

  // Anti-diagonal (top-right to bottom-left)
  let diag2Complete = true;
  for (let i = 0; i < 5; i++) {
    if (!markedNumbers.has(board[i][4 - i])) {
      diag2Complete = false;
      break;
    }
  }
  if (diag2Complete) completed++;

  return completed;
}

// Validate that a board is a valid 5x5 grid containing 1-25 exactly once
function validateBoard(board: number[][]): boolean {
  if (!board || board.length !== 5) return false;
  const numbers = new Set<number>();
  for (let r = 0; r < 5; r++) {
    if (!board[r] || board[r].length !== 5) return false;
    for (let c = 0; c < 5; c++) {
      const val = board[r][c];
      if (typeof val !== "number" || val < 1 || val > 25 || numbers.has(val)) {
        return false;
      }
      numbers.add(val);
    }
  }
  return numbers.size === 25;
}

function generateRandomBoard(): number[][] {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  const board: number[][] = [];
  for (let i = 0; i < 5; i++) {
    board.push(numbers.slice(i * 5, i * 5 + 5));
  }
  return board;
}

// Prune inactive/empty rooms (rooms with all players offline for over 15 minutes)
function pruneRooms() {
  Object.keys(rooms).forEach((code) => {
    const room = rooms[code];
    const anyActive = room.players.some((p) => p.isOnline && !p.isBot);
    if (!anyActive) {
      delete rooms[code];
    }
  });
  Object.keys(dotsRooms).forEach((code) => {
    const room = dotsRooms[code];
    const anyActive = room.players.some((p) => p.isOnline);
    if (!anyActive) {
      delete dotsRooms[code];
    }
  });
}

function broadcastDotsRoomState(roomCode: string, io: Server) {
  const room = dotsRooms[roomCode];
  if (!room) return;
  io.to(roomCode).emit("dots_room_state", room);
}

function handleSelectNumberLogic(roomCode: string, playerId: string, number: number, io: Server, socket?: Socket) {
  const room = rooms[roomCode];
  if (!room || room.gameState !== "PLAYING") return;

  const activePlayer = room.players[room.turnIndex];
  if (!activePlayer || activePlayer.id !== playerId) {
    if (socket) socket.emit("error_msg", "It's not your turn!");
    return;
  }

  if (number < 1 || number > 25 || room.markedNumbers.includes(number)) {
    if (socket) socket.emit("error_msg", "Invalid number choice.");
    return;
  }

  // Record selected number
  room.markedNumbers.push(number);

  // Recalculate line scores for all players
  const markedSet = new Set(room.markedNumbers);
  room.players.forEach((p) => {
    p.completedLines = calculateCompletedLines(p.board, markedSet);
  });

  io.to(roomCode).emit("game_log", {
    text: `${activePlayer.name} selected ${number}`,
    type: "select",
    number,
  });

  // Check if any player completed 5 lines
  const winners = room.players.filter((p) => p.completedLines >= 5);

  if (winners.length > 0) {
    room.gameState = "FINISHED";
    room.winners = winners.map((w) => w.id);

    const winnerNames = winners.map((w) => w.name).join(" and ");
    io.to(roomCode).emit("game_log", {
      text: `🎉 BINGO! Winner: ${winnerNames}`,
      type: "win",
    });
  } else {
    // Rotate turn to next online player
    let nextTurnIndex = (room.turnIndex + 1) % room.players.length;
    let found = false;

    for (let i = 0; i < room.players.length; i++) {
      if (room.players[nextTurnIndex].isOnline) {
        room.turnIndex = nextTurnIndex;
        found = true;
        break;
      }
      nextTurnIndex = (nextTurnIndex + 1) % room.players.length;
    }

    if (!found) {
      room.turnIndex = 0;
    }
  }

  broadcastRoomState(roomCode, io);

  // Check if it's a bot's turn next
  if (room.gameState === "PLAYING") {
    const nextPlayer = room.players[room.turnIndex];
    if (nextPlayer && nextPlayer.isBot) {
      triggerBotTurn(roomCode, io);
    }
  }
}

function triggerBotTurn(roomCode: string, io: Server) {
  setTimeout(() => {
    const room = rooms[roomCode];
    if (!room || room.gameState !== "PLAYING") return;

    const activePlayer = room.players[room.turnIndex];
    if (!activePlayer || !activePlayer.isBot) return;

    const unmarked: number[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const num = activePlayer.board[r][c];
        if (!room.markedNumbers.includes(num)) {
          unmarked.push(num);
        }
      }
    }

    if (unmarked.length > 0) {
      const pick = unmarked[Math.floor(Math.random() * unmarked.length)];
      handleSelectNumberLogic(roomCode, activePlayer.id, pick, io);
    }
  }, 1500); // Slight delay so human can see what happened
}

// Broadcast game state to everyone in the room individually to hide other players' boards
function broadcastRoomState(roomCode: string, io: Server) {
  const room = rooms[roomCode];
  if (!room) return;

  for (const player of room.players) {
    if (player.isOnline && player.socketId) {
      // Send custom room state with other players' boards blanked out for security/fairness
      const cleanPlayers = room.players.map((p) => ({
        id: p.id,
        name: p.name,
        ready: p.ready,
        completedLines: p.completedLines,
        isOnline: p.isOnline,
      }));

      io.to(player.socketId).emit("room_state", {
        code: room.code,
        gameState: room.gameState,
        markedNumbers: room.markedNumbers,
        turnIndex: room.turnIndex,
        winners: room.winners,
        myBoard: player.board,
        players: cleanPlayers,
      });
    }
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const PORT = 3000;

  // Middleware to parse JSON
  app.use(express.json());

  // API Endpoint to check server status
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: Date.now() });
  });

  // Socket.IO handlers
  io.on("connection", (socket: Socket) => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    // Trigger pruning check occasionally
    pruneRooms();

    // Join / Create Room
    socket.on("join_room", ({ roomCode, name, playerId, isBotGame }: { roomCode: string; name: string; playerId: string; isBotGame?: boolean }) => {
      let code = roomCode?.trim().toUpperCase();
      const isCreate = !code;

      if (isCreate) {
        // Find an unused room code
        do {
          code = generateRoomCode();
        } while (rooms[code]);

        rooms[code] = {
          code,
          players: [],
          gameState: "BOARD_CREATION",
          markedNumbers: [],
          turnIndex: 0,
          winners: [],
          isBotGame: !!isBotGame,
        };
      }

      const room = rooms[code];
      if (!room) {
        socket.emit("error_msg", "Room not found or has expired.");
        return;
      }

      // Check if player is already in this room (reconnection)
      let player = room.players.find((p) => p.id === playerId);

      if (player) {
        // Update connection metadata
        player.socketId = socket.id;
        player.isOnline = true;
        // Keep name updated
        if (name) player.name = name;
      } else {
        // Check if room is in active gameplay and doesn't allow new joins
        if (room.gameState !== "BOARD_CREATION") {
          socket.emit("error_msg", "Game has already started in this room.");
          return;
        }

        // Limit to 5 players max
        if (room.players.length >= 5) {
          socket.emit("error_msg", "Room is full. Maximum is 5 players.");
          return;
        }

        // Create new player
        player = {
          id: playerId,
          socketId: socket.id,
          name: name || `Player ${room.players.length + 1}`,
          board: Array(5).fill(null).map(() => Array(5).fill(0)), // empty board initially
          ready: false,
          completedLines: 0,
          isOnline: true,
        };
        room.players.push(player);

        // If it's a new room and isBotGame is true, add the bot player immediately
        if (isCreate && room.isBotGame) {
          const botPlayer: Player = {
            id: `bot_${Math.random().toString(36).substring(2, 9)}`,
            socketId: "", // Bots don't have socket connection
            name: "PC Bot",
            board: generateRandomBoard(),
            ready: true,
            completedLines: 0,
            isOnline: true,
            isBot: true,
          };
          room.players.push(botPlayer);
        }
      }

      currentRoomCode = code;
      currentPlayerId = playerId;
      socket.join(code);

      // Broadcast room update to all players
      broadcastRoomState(code, io);

      // Log join/reconnect event
      io.to(code).emit("game_log", {
        text: `${player.name} joined the room.`,
        type: "system",
      });
      
      if (isCreate && room.isBotGame) {
        io.to(code).emit("game_log", {
          text: `PC Bot has joined and is ready!`,
          type: "system",
        });
      }
    });

    // Board Submitted by Player
    socket.on("submit_board", ({ board }: { board: number[][] }) => {
      if (!currentRoomCode || !currentPlayerId) return;

      const room = rooms[currentRoomCode];
      if (!room) return;

      const player = room.players.find((p) => p.id === currentPlayerId);
      if (!player) return;

      // Validate board layout
      if (!validateBoard(board)) {
        socket.emit("error_msg", "Invalid board layout. Must contain numbers 1-25 exactly once.");
        return;
      }

      player.board = board;
      player.ready = true;

      io.to(currentRoomCode).emit("game_log", {
        text: `${player.name} is ready!`,
        type: "success",
      });

      // Check if all online players in the room are ready
      const onlinePlayers = room.players.filter((p) => p.isOnline);
      const allReady = onlinePlayers.length >= 2 && onlinePlayers.every((p) => p.ready);

      if (allReady) {
        room.gameState = "PLAYING";
        room.markedNumbers = [];
        room.turnIndex = 0;
        room.winners = [];
        room.players.forEach((p) => {
          p.completedLines = 0;
        });

        io.to(currentRoomCode).emit("game_log", {
          text: `All players are ready! The game has started.`,
          type: "system",
        });

        // Set turn to first online player
        const activeIdx = room.players.findIndex((p) => p.isOnline);
        if (activeIdx !== -1) {
          room.turnIndex = activeIdx;
        }

        // Trigger bot if it's bot's turn first
        const firstPlayer = room.players[room.turnIndex];
        if (firstPlayer && firstPlayer.isBot) {
          triggerBotTurn(currentRoomCode, io);
        }
      }

      broadcastRoomState(currentRoomCode, io);
    });

    // Active Player Selects a Number
    socket.on("select_number", ({ number }: { number: number }) => {
      if (!currentRoomCode || !currentPlayerId) return;
      handleSelectNumberLogic(currentRoomCode, currentPlayerId, number, io, socket);
    });

    // Restart game / Play Again
    socket.on("restart_game", () => {
      if (!currentRoomCode) return;

      const room = rooms[currentRoomCode];
      if (!room || room.gameState !== "FINISHED") return;

      // Reset room state for another round
      room.gameState = "BOARD_CREATION";
      room.markedNumbers = [];
      room.winners = [];
      room.turnIndex = 0;
      room.players.forEach((p) => {
        if (p.isBot) {
          p.ready = true;
          p.completedLines = 0;
          p.board = generateRandomBoard();
        } else {
          p.ready = false;
          p.completedLines = 0;
          p.board = Array(5).fill(null).map(() => Array(5).fill(0)); // empty board for fresh layout
        }
      });

      io.to(currentRoomCode).emit("game_log", {
        text: `Game restarted! Create your boards.`,
        type: "system",
      });

      broadcastRoomState(currentRoomCode, io);
    });

    // Leave Room
    socket.on("leave_room", () => {
      if (!currentRoomCode || !currentPlayerId) return;

      const room = rooms[currentRoomCode];
      if (!room) return;

      const playerIdx = room.players.findIndex((p) => p.id === currentPlayerId);
      if (playerIdx !== -1) {
        const playerName = room.players[playerIdx].name;
        room.players.splice(playerIdx, 1);

        io.to(currentRoomCode).emit("game_log", {
          text: `${playerName} left the room.`,
          type: "system",
        });

        // If no players left, clean up the room
        if (room.players.length === 0) {
          delete rooms[currentRoomCode];
        } else {
          // Adjust turnIndex if it went out of bounds or if we need to rotate
          if (room.turnIndex >= room.players.length) {
            room.turnIndex = 0;
          }
          // If in active play, check if there's enough active players to continue
          const onlinePlayers = room.players.filter((p) => p.isOnline);
          if (room.gameState === "PLAYING" && onlinePlayers.length < 2) {
            // Note: If only 1 player remains, we could let them wait or declare win,
            // but keeping the room state online allows them to reconnect.
          }
          broadcastRoomState(currentRoomCode, io);
        }
      }

      socket.leave(currentRoomCode);
      currentRoomCode = null;
      currentPlayerId = null;
    });

    // Handle sudden disconnects
    socket.on("disconnect", () => {
      if (!currentRoomCode || !currentPlayerId) return;

      const room = rooms[currentRoomCode];
      if (!room) return;

      const player = room.players.find((p) => p.id === currentPlayerId);
      if (player) {
        player.isOnline = false;

        io.to(currentRoomCode).emit("game_log", {
          text: `${player.name} disconnected.`,
          type: "disconnect",
        });

        // If the disconnected player was the active turn player, advance the turn
        if (room.gameState === "PLAYING" && room.players[room.turnIndex]?.id === currentPlayerId) {
          let nextTurnIndex = (room.turnIndex + 1) % room.players.length;
          let found = false;

          for (let i = 0; i < room.players.length; i++) {
            if (room.players[nextTurnIndex].isOnline) {
              room.turnIndex = nextTurnIndex;
              found = true;
              break;
            }
            nextTurnIndex = (nextTurnIndex + 1) % room.players.length;
          }

          if (found) {
            const nextPlayer = room.players[room.turnIndex];
            io.to(currentRoomCode).emit("game_log", {
              text: `It is now ${nextPlayer.name}'s turn.`,
              type: "system",
            });
          }
        }

        broadcastRoomState(currentRoomCode, io);
      }
    });

    // DOTS AND BOXES HANDLERS
    let currentDotsRoomCode: string | null = null;
    let currentDotsPlayerId: string | null = null;

    socket.on("join_dots_room", ({ roomCode, name, playerId, rows = 5, cols = 5 }: { roomCode: string; name: string; playerId: string; rows?: number; cols?: number; }) => {
      let code = roomCode?.trim().toUpperCase();
      const isCreate = !code;

      if (isCreate) {
        do {
          code = generateRoomCode();
        } while (dotsRooms[code]);

        dotsRooms[code] = {
          code,
          players: [],
          gameState: 'WAITING',
          lines: [],
          boxes: [],
          turnIndex: 0,
          winner: null,
          rows,
          cols
        };
      }

      const room = dotsRooms[code];
      if (!room) {
        socket.emit("error_msg", "Room not found or has expired.");
        return;
      }

      let player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.isOnline = true;
        player.socketId = socket.id;
        player.name = name;
      } else {
        if (room.players.length >= 2) {
          socket.emit("error_msg", "Room is already full.");
          return;
        }
        player = {
          id: playerId,
          socketId: socket.id,
          name,
          isOnline: true,
          score: 0
        };
        room.players.push(player);
      }

      currentDotsRoomCode = code;
      currentDotsPlayerId = playerId;
      socket.join(code);

      if (room.players.length === 2 && room.gameState === 'WAITING') {
        room.gameState = 'PLAYING';
      }

      broadcastDotsRoomState(code, io);
    });

    socket.on("submit_dots_line", ({ r, c, type }: { r: number, c: number, type: 'h'|'v' }) => {
      if (!currentDotsRoomCode || !currentDotsPlayerId) return;
      const room = dotsRooms[currentDotsRoomCode];
      if (!room || room.gameState !== 'PLAYING') return;

      const activePlayer = room.players[room.turnIndex];
      if (!activePlayer || activePlayer.id !== currentDotsPlayerId) return;

      // Check if line exists
      const exists = room.lines.some(l => l.r === r && l.c === c && l.type === type);
      if (exists) return;

      const owner = room.turnIndex === 0 ? 'player1' : 'player2';
      room.lines.push({ r, c, type, owner });

      // Check boxes
      let boxesCompleted = 0;
      const checkAndCompleteBox = (boxR: number, boxC: number) => {
        if (boxR < 0 || boxR >= room.rows || boxC < 0 || boxC >= room.cols) return 0;
        
        const hasTop = room.lines.some(l => l.r === boxR && l.c === boxC && l.type === 'h');
        const hasBottom = room.lines.some(l => l.r === boxR + 1 && l.c === boxC && l.type === 'h');
        const hasLeft = room.lines.some(l => l.r === boxR && l.c === boxC && l.type === 'v');
        const hasRight = room.lines.some(l => l.r === boxR && l.c === boxC + 1 && l.type === 'v');

        if (hasTop && hasBottom && hasLeft && hasRight) {
          // ensure not already claimed
          if (!room.boxes.some(b => b.r === boxR && b.c === boxC)) {
            room.boxes.push({ r: boxR, c: boxC, owner });
            return 1;
          }
        }
        return 0;
      };

      if (type === 'h') {
        boxesCompleted += checkAndCompleteBox(r - 1, c);
        boxesCompleted += checkAndCompleteBox(r, c);
      } else {
        boxesCompleted += checkAndCompleteBox(r, c - 1);
        boxesCompleted += checkAndCompleteBox(r, c);
      }

      if (boxesCompleted > 0) {
        activePlayer.score += boxesCompleted;
        // Check win
        const totalBoxes = room.rows * room.cols;
        if (room.boxes.length >= totalBoxes) {
          room.gameState = 'FINISHED';
          const p1Score = room.players[0].score;
          const p2Score = room.players[1].score;
          if (p1Score > p2Score) room.winner = room.players[0].id;
          else if (p2Score > p1Score) room.winner = room.players[1].id;
          else room.winner = 'draw';
        }
      } else {
        // Switch turn
        room.turnIndex = room.turnIndex === 0 ? 1 : 0;
      }

      broadcastDotsRoomState(currentDotsRoomCode, io);
    });

    socket.on("restart_dots_room", () => {
      if (!currentDotsRoomCode) return;
      const room = dotsRooms[currentDotsRoomCode];
      if (room) {
        room.lines = [];
        room.boxes = [];
        room.gameState = room.players.length === 2 ? 'PLAYING' : 'WAITING';
        room.turnIndex = 0;
        room.winner = null;
        room.players.forEach(p => p.score = 0);
        broadcastDotsRoomState(currentDotsRoomCode, io);
      }
    });

    socket.on("leave_dots_room", () => {
      if (currentDotsRoomCode && currentDotsPlayerId) {
        const room = dotsRooms[currentDotsRoomCode];
        if (room) {
          room.players = room.players.filter((p) => p.id !== currentDotsPlayerId);
          if (room.players.length === 0) {
            delete dotsRooms[currentDotsRoomCode];
          } else {
            if (room.gameState === 'PLAYING') {
              room.gameState = 'FINISHED';
              room.winner = room.players[0].id; // other player wins by default
            }
            broadcastDotsRoomState(currentDotsRoomCode, io);
          }
        }
        socket.leave(currentDotsRoomCode);
        currentDotsRoomCode = null;
        currentDotsPlayerId = null;
      }
    });

    socket.on("disconnect", () => {
      // Disconnect Bingo
      if (currentRoomCode && currentPlayerId) {
        const room = rooms[currentRoomCode];
        if (room) {
          const player = room.players.find((p) => p.id === currentPlayerId);
          if (player) {
            player.isOnline = false;
            io.to(currentRoomCode).emit("game_log", {
              text: `${player.name} disconnected.`,
              type: "disconnect",
            });
            broadcastRoomState(currentRoomCode, io);
          }
        }
      }
      
      // Disconnect Dots
      if (currentDotsRoomCode && currentDotsPlayerId) {
        const room = dotsRooms[currentDotsRoomCode];
        if (room) {
          const player = room.players.find((p) => p.id === currentDotsPlayerId);
          if (player) {
            player.isOnline = false;
            broadcastDotsRoomState(currentDotsRoomCode, io);
          }
        }
      }
    });
  });

  // Serve static assets in development or production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Bingo Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
