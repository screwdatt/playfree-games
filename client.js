const socket = io();
let room = null, game = null, selected = null;

document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', () => {
    game = card.dataset.game;
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('room').classList.remove('hidden');
    document.getElementById('title').textContent = card.textContent.trim();
    socket.emit('create', game, document.getElementById('name').value || 'Player');
  });
});

socket.on('joined', (id, data) => {
  room = id;
  game = data.game;
  document.getElementById('code').textContent = id;
  document.getElementById('players').innerHTML = '<b>Players:</b> ' + data.players.map(p => p.name).join(' vs ');
  render(game, data.state);
});

socket.on('players', p => document.getElementById('players').innerHTML = '<b>Players:</b> ' + p.map(x => x.name).join(' vs '));
socket.on('state', s => render(game, s));
socket.on('end', w => alert(w ? `${w} wins!` : 'Draw!'));

function move(data) { if (room) socket.emit('move', room, data); }
function send() { const i = document.getElementById('msg'); if (i.value.trim()) { socket.emit('chat', room, i.value); i.value = ''; } }
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

// Tic-Tac-Toe
function renderTTT(a, s) {
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.textContent = s.board[i] || '';
    cell.style = 'width:33.3%;height:100px;font-size:70px;text-align:center;line-height:100px;border:2px solid #60a5fa;float:left;cursor:pointer;background:#1e293b';
    if (!s.board[i]) cell.addEventListener('click', () => move({type:'place', pos:i}));
    a.appendChild(cell);
  }
}

// Connect 4
function renderC4(a, s) {
  for (let col = 0; col < 7; col++) {
    const column = document.createElement('div');
    column.style = 'display:inline-block;width:14%;text-align:center;height:360px';
    for (let row = 5; row >= 0; row--) {
      const cell = document.createElement('div');
      const color = s.board[row][col] === 'R' ? '#e74c3c' : s.board[row][col] === 'Y' ? '#f1c40f' : '#2c3e50';
      cell.style = `width:50px;height:50px;border-radius:50%;background:${color};margin:6px auto;cursor:pointer;border:3px solid #34495e`;
      if (s.board[0][col] === '' || s.board.some(r => r[col] === '')) cell.addEventListener('click', () => move({type:'drop', col}));
      column.appendChild(cell);
    }
    a.appendChild(column);
  }
}

// Chess - Text symbols (R N B Q K P / r n b q k p)
function renderChess(a, s) {
  const board = document.createElement('div');
  board.style = 'width:min(95vw,480px);height:min(95vw,480px);margin:20px auto;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);border:12px solid #654321;border-radius:12px;background:#8B5A2B;box-shadow:0 15px 40px rgba(0,0,0,0.7);touch-action:manipulation';

  const chess = new Chess(s.fen);
  const pieces = chess.board();

  for (let row = 7; row >= 0; row--) {  // White at bottom
    for (let col = 0; col < 8; col++) {
      const idx = row * 8 + col;
      const piece = pieces[row][col];
      const light = (row + col) % 2 === 0;

      const sq = document.createElement('div');
      sq.dataset.idx = idx;
      sq.style = `background:${light?'#f0d9b5':'#b58863'};display:flex;align-items:center;justify-content:center;font-size:clamp(32px,8vw,48px);cursor:pointer;user-select:none;touch-action:manipulation;-webkit-tap-highlight-color:transparent;border:1px solid rgba(0,0,0,0.1)`;

      if (piece) {
        const isWhite = piece.color === 'w';
        sq.textContent = isWhite ? piece.type.toUpperCase() : piece.type;
        sq.style.color = isWhite ? '#FFFFFF' : '#000000';
        sq.style.textShadow = isWhite ? '2px 2px 4px #000' : '1px 1px 3px #FFF';
        sq.style.fontWeight = 'bold';
      }

      if (selected === idx) sq.style.background = '#60a5fa99';

      const handleClick = (e) => {
        e.preventDefault();
        const i = parseInt(sq.dataset.idx);
        if (selected === i) selected = null;
        else if (selected !== null) { move({from: selected, to: i}); selected = null; }
        else if (piece && ((s.turn === 'w' && piece.color === 'w') || (s.turn === 'b' && piece.color === 'b'))) selected = i;
        render(game, s);
      };
      sq.addEventListener('click', handleClick);
      sq.addEventListener('touchend', handleClick);

      board.appendChild(sq);
    }
  }
  a.appendChild(board);
}

// Auto-join
const params = new URLSearchParams(location.search);
const joinRoom = params.get('room');
if (joinRoom) {
  room = joinRoom;
  document.getElementById('lobby').classList.add('hidden');
  document.getElementById('room').classList.remove('hidden');
  socket.emit('join', joinRoom, prompt('Your name?') || 'Guest');
}
