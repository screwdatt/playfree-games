const socket = io();
let room = null, game = null, selected = null; // for chess

document.querySelectorAll('.card').forEach(c => c.onclick = () => {
  game = c.dataset.game;
  document.getElementById('lobby').classList.add('hidden');
  document.getElementById('room').classList.remove('hidden');
  document.getElementById('title').textContent = c.textContent;
  socket.emit('create', game, document.getElementById('name').value || 'Player');
});

socket.on('joined', (id, data) => {
  room = id;
  document.getElementById('code').textContent = id;
  document.getElementById('players').innerHTML = '<b>Players:</b> ' + data.players.map(p=>p.name).join(' vs ');
  render(game, data.state);
});

socket.on('players', p => document.getElementById('players').innerHTML = '<b>Players:</b> ' + p.map(x=>x.name).join(' vs '));
socket.on('state', s => render(game, s));
socket.on('end', w => alert(w ? `${w} wins!` : 'Draw!'));

function move(data) { if (room) socket.emit('move', room, data); }
function send() { const i = document.getElementById('msg'); if (i.value) { socket.emit('chat', room, i.value); i.value=''; } }
function copy() { navigator.clipboard.writeText(location.origin + '?room=' + room); alert('Link copied!'); }

socket.on('chat', (n, m) => {
  const log = document.getElementById('log');
  log.innerHTML += `<br><b>\( {n}:</b> \){m}`;
  log.scrollTop = log.scrollHeight;
});

function render(g, s) {
  const area = document.getElementById('game');
  area.innerHTML = '';
  selected = null;

  if (g === 'tictactoe') renderTTT(area, s);
  if (g === 'connect4') renderC4(area, s);
  if (g === 'chess') renderChess(area, s);
}

// Tic-Tac-Toe (perfect on mobile)
function renderTTT(a, s) {
  const symbols = ['', 'X', 'O'];
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.textContent = symbols[s.board[i] === 'X' ? 1 : s.board[i] === 'O' ? 2 : 0];
    cell.style = 'width:33.33%;height:100px;font-size:60px;text-align:center;line-height:100px;border:2px solid #60a5fa;float:left;cursor:pointer;background:#1e293b';
    if (!s.board[i]) cell.onclick = () => move({type:'place', pos:i});
    a.appendChild(cell);
  }
}

// Connect 4 (tap column)
function renderC4(a, s) {
  const colors = { 'R': '#e74c3c', 'Y': '#f1c40f', '': '#2c3e50' };
  for (let col = 0; col < 7; col++) {
    const column = document.createElement('div');
    column.style = 'display:inline-block;width:14%;text-align:center';
    for (let row = 5; row >= 0; row--) {
      const cell = document.createElement('div');
      cell.style = `width:50px;height:50px;border-radius:50%;background:${colors[s.board[row][col]] || '#2c3e50'};margin:6px auto;cursor:pointer;border:3px solid #34495e`;
      if (!s.board[0][col] || s.board.some(r => r[col] === '')) cell.onclick = () => move({type:'drop', col});
      column.appendChild(cell);
    }
    a.appendChild(column);
  }
}

// Chess — tap to select, tap to move (mobile-first!)
function renderChess(a, s) {
  const board = document.createElement('div');
  board.style = 'width:100%;max-width:480px;margin:auto;display:grid;grid-template-columns:repeat(8,1fr);aspect-ratio:1/1;background:#333';
  
  const pieceUnicode = {
    'K': 'K', 'Q': 'Q', 'R': 'R', 'B': 'B', 'N': 'N', 'P': 'P',
    'k': 'k', 'q': 'q', 'r': 'r', 'b': 'b', 'n': 'n', 'p': 'p'
  };

  s.board.flat().forEach((piece, i) => {
    const sq = document.createElement('div');
    const isLight = (Math.floor(i/8) + i%8) % 2 === 0;
    sq.style = `background:${isLight?'#f0d9b5':'#8b5a2b'};display:flex;align-items:center;justify-content:center;font-size:8vw;cursor:pointer`;
    sq.textContent = piece ? pieceUnicode[piece] || piece : '';
    
    sq.onclick = () => {
      if (selected === i) { selected = null; render(game, s); return; }
      if (selected !== null) {
        move({from: selected, to: i});
        selected = null;
      } else if (piece && ((s.turn === 'w' && 'PRNBQK'.includes(piece)) || (s.turn === 'b' && 'prnbqk'.includes(piece)))) {
        selected = i;
        sq.style.background = '#60a5fa';
      }
    };
    
    if (selected === i) sq.style.background = '#60a5fa';
    board.appendChild(sq);
  });
  a
