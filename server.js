const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Chess = require('chess.js').Chess;

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const rooms = {};

io.on('connection', socket => {
  socket.on('create', (game, name) => {
    const id = Math.random().toString(36).substr(2, 6).toUpperCase();
    rooms[id] = { game, players: [{id: socket.id, name: name||'P1'}], state: initGame(game) };
    socket.join(id);
    socket.emit('joined', id, rooms[id]);
  });

  socket.on('join', (id, name) => {
    const room = rooms[id];
    if (room && room.players.length < 2) {
      socket.join(id);
      room.players.push({id: socket.id, name: name||'P2'});
      io.to(id).emit('players', room.players);
      socket.emit('joined', id, room);
      io.to(id).emit('state', room.state);
    }
  });

  socket.on('move', (roomId, moveData) => {
    const room = rooms[roomId];
    if (!room) return;

    const playerIdx = room.players.findIndex(p => p.id === socket.id);
    if (playerIdx === -1) return;

    const isWhite = playerIdx === 0;
    const turnColor = room.state.turn;

    if ((turnColor === 'w' && !isWhite) || (turnColor === 'b' && isWhite)) return;

    if (room.game === 'chess') {
      const chess = new Chess(room.state.fen);
      const from = String.fromCharCode(97 + (moveData.from % 8)) + (8 - Math.floor(moveData.from / 8));
      const to = String.fromCharCode(97 + (moveData.to % 8)) + (8 - Math.floor(moveData.to / 8));
      const move = chess.move({ from, to, promotion: 'q' });
      if (move) {
        room.state.fen = chess.fen();
        room.state.turn = chess.turn();
        io.to(roomId).emit('state', room.state);
        if (chess.isGameOver()) io.to(roomId).emit('end', chess.turn() === 'w' ? room.players[1].name : room.players[0].name);
      }
    }

    // Tic-Tac-Toe
    if (room.game === 'tictactoe' && moveData.type === 'place') {
      if (!room.state.board[moveData.pos]) {
        room.state.board[moveData.pos] = playerIdx === 0 ? 'X' : 'O';
        room.state.turn = 1 - room.state.turn;
        io.to(roomId).emit('state', room.state);
      }
    }

    // Connect 4
    if (room.game === 'connect4' && moveData.type === 'drop') {
      for (let r = 5; r >= 0; r--) {
        if (!room.state.board[r][moveData.col]) {
          room.state.board[r][moveData.col] = playerIdx === 0 ? 'R' : 'Y';
          room.state.turn = 1 - room.state.turn;
          io.to(roomId).emit('state', room.state);
          break;
        }
      }
    }
  });

  socket.on('chat', (id, msg) => {
    const name = rooms[id]?.players.find(p => p.id === socket.id)?.name || 'Guest';
    io.to(id).emit('chat', name, msg);
  });
});

function initGame(g) {
  if (g === 'tictactoe') return {board: Array(9).fill(''), turn: 0};
  if (g === 'connect4') return {board: Array(6).fill().map(()=>Array(7).fill('')), turn: 0};
  if (g === 'chess') return {fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', turn: 'w'};
  return {};
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('PlayFree.games LIVE!'));
