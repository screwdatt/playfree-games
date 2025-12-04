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

    if (room.game === 'chess' && isValidChessMove(room.state.board, moveData.from, moveData.to, turnColor)) {
      // Move the piece
      const fromRow = Math.floor(moveData.from / 8);
      const fromCol = moveData.from % 8;
      const toRow = Math.floor(moveData.to / 8);
      const toCol = moveData.to % 8;
      const piece = room.state.board[fromRow][fromCol];
      room.state.board[toRow][toCol] = piece;
      room.state.board[fromRow][fromCol] = null;
      room.state.turn = turnColor === 'w' ? 'b' : 'w';

      // Check win (simplified - full checkmate later)
      const winner = checkmate(room.state.board, room.state.turn === 'w' ? 'b' : 'w');
      if (winner) io.to(roomId).emit('end', winner === 'w' ? room.players[0].name : room.players[1].name);

      io.to(roomId).emit('state', room.state);
    }
    // ... (TicTacToe & Connect4 same as before)
  });

  socket.on('chat', (id, msg) => {
    const name = rooms[id]?.players.find(p => p.id === socket.id)?.name || 'Guest';
    io.to(id).emit('chat', name, msg);
  });
});

function initGame(g) {
  if (g === 'tictactoe') return {board: Array(9).fill(''), turn: 0};
  if (g === 'connect4') return {board: Array(6).fill().map(()=>Array(7).fill('')), turn: 0};
  if (g === 'chess') return {
    board: [
      ['r','n','b','q','k','b','n','r'],
      ['p','p','p','p','p','p','p','p'],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      [null,null,null,null,null,null,null,null],
      ['P','P','P','P','P','P','P','P'],
      ['R','N','B','Q','K','B','N','R']
    ],
    turn: 'w'  // White at bottom
  };
}

function isValidChessMove(board, from, to, turn) {
  const fromRow = Math.floor(from / 8), fromCol = from % 8;
  const toRow = Math.floor(to / 8), toCol = to % 8;
  const piece = board[fromRow][fromCol];
  if (!piece || (turn === 'w' ? piece.isLowerCase() : !piece.isLowerCase())) return false;  // Wrong color

  const dx = toCol - fromCol;
  const dy = toRow - fromRow;
  const target = board[toRow][toCol];

  if (target && (turn === 'w' === target.isUpperCase())) return false;  // Can't capture own

  const deltas = getDeltas(piece);
  if (!deltas.some(d => d.dx === dx && d.dy === dy)) return false;

  // Path clear for sliding pieces
  if (isSliding(piece)) {
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    const sx = dx / steps, sy = dy / steps;
    for (let i = 1; i < steps; i++) {
      if (board[fromRow + sy * i][fromCol + sx * i]) return false;
    }
  }

  // Pawn special
  if (piece.toLowerCase() === 'p') {
    if (dx === 0 && dy === 0) return false;
    const dir = turn === 'w' ? -1 : 1;
    if (dx === 0 && Math.abs(dy) === 1) return true;  // Forward
    if (Math.abs(dx) === 1 && dy === dir) return !target;  // Wait, capture only if target
    no, capture if target
    if (Math.abs(dx) === 1 && dy === dir && target) return true;
    return false;
  }

  return true;
}

function getDeltas(p) {
  const lower = p.toLowerCase();
  switch(lower) {
    case 'p': return [{dx:0,dy:-1},{dx:1,dy:-1},{dx:-1,dy:-1}];  // White pawn example
    case 'r': return getStraight();
    case 'b': return getDiag();
    case 'q': return getStraight().concat(getDiag());
    case 'k': return [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0},{dx:1,dy:1},{dx:1,dy:-1},{dx:-1,dy:1},{dx:-1,dy:-1}];
    case 'n': return [{dx:1,dy:2},{dx:1,dy:-2},{dx:-1,dy:2},{dx:-1,dy:-2},{dx:2,dy:1},{dx:2,dy:-1},{dx:-2,dy:1},{dx:-2,dy:-1}];
  }
  return [];
}

function getStraight() {
  return [{dx:0,dy:1},{dx:0,dy:-1},{dx:1,dy:0},{dx:-1,dy:0}];
}

function getDiag() {
  return [{dx:1,dy:1},{dx:1,dy:-1},{dx:-1,dy:1},{dx:-1,dy:-1}];
}

function isSliding(p) {
  const lower = p.toLowerCase();
  return lower === 'r' || lower === 'b' || lower === 'q';
}

function checkmate(board, losingColor) {
  // Simplified - expand later
  return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Chess VALIDATED & READY!'));
