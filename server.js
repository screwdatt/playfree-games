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
      const fromRow = Math.floor(moveData.from / 8);
      const fromCol = moveData.from % 8;
      const toRow = Math.floor(moveData.to / 8);
      const toCol = moveData.to % 8;
      const piece = room.state.board[fromRow][fromCol];
      room.state.board[toRow][toCol] = piece;
      room.state.board[fromRow][fromCol] = null;
      room.state.turn = turnColor === 'w' ? 'b' : 'w';
      io.to(roomId).emit('state', room.state);
    }

    // Tic-Tac-Toe & Connect 4 (unchanged)
    if (room.game === 'tictactoe' && moveData.type === 'place') {
      if (!room.state.board[moveData.pos]) {
        room.state.board[moveData.pos] = playerIdx === 0 ? 'X' : 'O';
        room.state.turn = 1 - room.state.turn;
        io.to(roomId).emit('state', room.state);
      }
    }
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
    turn: 'w'
  };
  return {};
}

function isValidChessMove(board, from, to, turn) {
  const fromRow = Math.floor(from / 8), fromCol = from % 8;
  const toRow = Math.floor(to / 8), toCol = to % 8;
  const piece = board[fromRow][fromCol];
  if (!piece) return false;

  const isWhitePiece = piece === piece.toUpperCase();
  if ((turn === 'w' && !isWhitePiece) || (turn === 'b' && isWhitePiece)) return false;

  const target = board[toRow][toCol];
  if (target && ((turn === 'w' && target === target.toUpperCase()) || (turn === 'b' && target === target.toLowerCase()))) return false;

  const dx = Math.abs(toCol - fromCol);
  const dy = Math.abs(toRow - fromRow);
  const lowerPiece = piece.toLowerCase();

  // Pawn (forward 1, diagonal capture)
  if (lowerPiece === 'p') {
    const dir = turn === 'w' ? -1 : 1;
    const forward = (toRow - fromRow === dir) && (toCol === fromCol);
    const capture = (Math.abs(toCol - fromCol) === 1) && (toRow - fromRow === dir);
    return (forward && !target) || (capture && target);
  }

  // Knight (L-shape)
  if (lowerPiece === 'n') return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);

  // King (1 step any direction)
  if (lowerPiece === 'k') return dx <= 1 && dy <= 1;

  // Rook (horizontal/vertical)
  if (lowerPiece === 'r') return (dx === 0 || dy === 0) && pathClear(board, from, to);

  // Bishop (diagonal)
  if (lowerPiece === 'b') return dx === dy && pathClear(board, from, to);

  // Queen (rook + bishop)
  if (lowerPiece === 'q') return ((dx === 0 || dy === 0) || dx === dy) && pathClear(board, from, to);

  return false;
}

function pathClear(board, from, to) {
  const fromRow = Math.floor(from / 8), fromCol = from % 8;
  const toRow = Math.floor(to / 8), toCol = to % 8;
  const dx = toCol - fromCol > 0 ? 1 : (toCol - fromCol < 0 ? -1 : 0);
  const dy = toRow - fromRow > 0 ? 1 : (toRow - fromRow < 0 ? -1 : 0);
  let r = fromRow + dy, c = fromCol + dx;
  while (r !== toRow || c !== toCol) {
    if (board[r][c]) return false;
    r += dy; c += dx;
  }
  return true;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('PlayFree.games LIVE!'));
