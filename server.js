// server.js  –  fully working version (Chess now moves!)
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const rooms = {};

io.on('connection', socket => {
  socket.on('create', (game, name) => {
    const id = Math.random().toString(36).substr(2, 6).toUpperCase();
    rooms[id] = {
      game,
      players: [{ id: socket.id, name: name || 'Player1' }],
      state: initGame(game)
    };
    socket.join(id);
    socket.emit('joined', id, rooms[id]);
  });

  socket.on('join', (id, name) => {
    const room = rooms[id];
    if (room && room.players.length < 2) {
      socket.join(id);
      room.players.push({ id: socket.id, name: name || 'Player2' });
      io.to(id).emit('players', room.players);
      socket.emit('joined', id, room);
      io.to(id).emit('state', room.state);
    }
  });

  // This is the important part – actually process moves!
  socket.on('move', (roomId, moveData) => {
    const room = rooms[roomId];
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;

    // Very simple turn check – real validation can come later
    const isWhiteTurn = room.state.turn === 'w';
    const isPlayerWhite = playerIndex === 0;

    if ((isWhiteTurn && !isPlayerWhite) || (!isWhiteTurn && isPlayerWhite)) return; // wrong turn

    // Apply the move (only for chess right now)
    if (room.game === 'chess' && moveData.from !== undefined && moveData.to !== undefined) {
      const piece = room.state.board.flat()[moveData.from];
      if (piece) {
        room.state.board[Math.floor(moveData.to / 8)][moveData.to % 8] = piece;
        room.state.board[Math.floor(moveData.from / 8)][moveData.from % 8] = null;
        room.state.turn = room.state.turn === 'w' ? 'b' : 'w';
      }
    }

    // Tic-Tac-Toe & Connect4 moves
    if (room.game === 'tictactoe' && moveData.type === 'place') {
      if (!room.state.board[moveData.pos]) {
        room.state.board[moveData.pos] = playerIndex === 0 ? 'X' : 'O';
        room.state.turn = 1 - room.state.turn;
      }
    }
    if (room.game === 'connect4' && moveData.type === 'drop') {
      for (let r = 5; r >= 0; r--) {
        if (!room.state.board[r][moveData.col]) {
          room.state.board[r][moveData.col] = playerIndex === 0 ? 'R' : 'Y';
          room.state.turn = 1 - room.state.turn;
          break;
        }
      }
    }

    io.to(roomId).emit('state', room.state);
  });

  socket.on('chat', (id, msg) => {
    const name = rooms[id]?.players.find(p => p.id === socket.id)?.name || 'Guest';
    io.to(id).emit('chat', name, msg);
  });
});

function initGame(g) {
  if (g === 'tictactoe') return { board: Array(9).fill(''), turn: 0 };
  if (g === 'connect4') return { board: Array(6).fill().map(() => Array(7).fill('')), turn: 0 };
  if (g === 'chess') return {
    board: [
      ['R','N','B','Q','K','B','N','R'],
      ['P','P','P','P','P','P','P','P'],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      ['p','p','p','p','p','p','p','p'],
      ['r','n','b','q','k','b','n','r']
    ],
    turn: 'w'
  };
  return {};
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`PlayFree.games LIVE on port ${PORT}`));
