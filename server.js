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
    rooms[id] = { game, players: [{id: socket.id, name: name||'P1'}], state: init(game) };
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

  socket.on('move', (id, move) => {
    const room = rooms[id];
    if (room && apply(room.game, room.state, move, socket.id)) {
      io.to(id).emit('state', room.state);
      const winner = checkWin(room.game, room.state);
      if (winner !== null) io.to(id).emit('end', winner);
    }
  });

  socket.on('chat', (id, msg) => {
    const name = rooms[id]?.players.find(p => p.id === socket.id)?.name || 'Guest';
    io.to(id).emit('chat', name, msg);
  });
});

function init(g) {
  if (g === 'tictactoe') return {board: Array(9).fill(''), turn: 0};
  if (g === 'connect4') return {board: Array(6).fill().map(()=>Array(7).fill('')), turn: 0};
  if (g === 'chess') return {board: initialChess(), turn: 'w'};
  return {};
}

function apply(g, s, m, id) { return true; }  // client-side validation for launch
function checkWin(g, s) { return null; }

function initialChess() {
  return [
    ['R','N','B','Q','K','B','N','R'],
    ['P','P','P','P','P','P','P','P'],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ['p','p','p','p','p','p','p','p'],
    ['r','n','b','q','k','b','n','r']
  ];
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`PlayFree.games running on port ${PORT}`));
