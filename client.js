const socket = io();
let room = null, game = null, selected = null;

document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', (e) => {
    e.preventDefault();
    game = card.dataset.game;
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('room').classList.remove('hidden');
    document.getElementById('title').textContent = card.textContent.trim();
    socket.emit('create', game, document.getElementById('name').value || 'Player');
  });
});

socket.on('joined', (id, data) => {
  room = id;
  document.getElementById('code').textContent = id;
  document.getElementById('players').innerHTML = '<b>Players:</b> ' + data.players.map(p => p.name).join(' vs ');
  render(game, data.state);
});

socket.on('players', p => document.getElementById('players').innerHTML = '<b>Players:</b> ' + p.map(x => x.name).join(' vs '));
socket.on('state', s => render(game, s));
socket.on('end', w => alert(w ? `${w} wins!` : 'Draw!'));

function move(data) { if (room) socket.emit('move', room, data); }
function send() {
  const i = document.getElementById('msg');
  if (i.value.trim()) { socket.emit('chat', room, i.value); i.value = ''; }
}
function copy() {
  navigator.clipboard.writeText(location.origin + '?room=' + room);
  alert('Link copied!');
}

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

// Tic-Tac-Toe (unchanged)
function renderTTT(a, s) {
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.textContent = s.board[i] || '';
    cell.style = 'width:33.3%;height:100px;font-size:70px;text-align:center;line-height:100px;border:2px solid #60a5fa;float:left;cursor:pointer;background:#1e293b';
    if (!s.board[i]) cell.onclick = () => move({type:'place', pos:i});
    a.appendChild(cell);
  }
}

// Connect 4 (unchanged)
function renderC4(a, s) {
  for (let col = 0; col < 7; col++) {
    const column = document.createElement('div');
    column.style = 'display:inline-block;width:14%;text-align:center;vertical-align:bottom;height:360px';
    for (let row = 5; row >= 0; row--) {
      const cell = document.createElement('div');
      const color = s.board[row][col] === 'R' ? '#e74c3c' : s.board[row][col] === 'Y' ? '#f1c40f' : '#2c3e50';
      cell.style = `width:50px;height:50px;border-radius:50%;background:${color};margin:6px auto;cursor:pointer;border:3px solid #34495e`;
      if (s.board[0][col] === '' || s.board.some(r => r[col] === '')) cell.onclick = () => move({type:'drop', col});
      column.appendChild(cell);
    }
    a.appendChild(column);
  }
}

// CHESS - FULL SQUARES + SOLID BLACK PIECES + CLICKABLE
function renderChess(a, s) {
  const board = document.createElement('div');
  board.style = 'width:100%;max-width:480px;margin:30px auto;display:grid;grid-template-columns:repeat(8,1fr);aspect-ratio:1/1;background:#333;border:12px solid #8B5A2B;border-radius:8px;box-shadow:0 15px 35px rgba(0,0,0,0.6);overflow:hidden';

  const whitePieces = { 'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔' };
  const blackPieces = { 'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚' };

  // White at bottom (row 7 to 0)
  for (let row = 7; row >= 0; row--) {
    for (let col = 0; col < 8; col++) {
      const idx = row * 8 + col;
      const piece = s.board[row][col];
      const isLight = (row + col) % 2 === 0;

      const sq = document.createElement('div');
      sq.style = `
        background:${isLight ? '#f0d9b5' : '#b58863'};
        display:flex;align-items:center;justify-content:center;
        font-size:clamp(36px,9vw,56px);
        cursor:pointer;
        user-select:none;
        position:relative;
      `;

      if (piece) {
        const isWhitePiece = piece === piece.toUpperCase();
        sq.innerHTML = isWhitePiece 
          ? `<span style="color:white;text-shadow:2px 2px 4px #000">${whitePieces[piece]}</span>`
          : `<span style="color:black;text-shadow:1px 1px 2px #fff">${blackPieces[piece]}</span>`;
      }

      // Highlight selected
      if (selected === idx) {
        sq.style.background = '#60a5fa88';
      }

      sq.onclick = () => {
        if (selected === idx) {
          selected = null;
        } else if (selected !== null) {
          move({ from: selected, to: idx });
          selected = null;
        } else {
          const p = s.board[row][col];
          if (p && ((s.turn === 'w' && p === p.toUpperCase()) || (s.turn === 'b' && p === p.toLowerCase()))) {
            selected = idx;
          }
        }
        render(game, s); // Re-render to update highlight
      };

      board.appendChild(sq);
    }
  }
  a.appendChild(board);
}

// Auto-join
const params = new URLSearchParams(location.search);
const join = params.get('room');
if (join) {
  room = join;
  document.getElementById('lobby').classList.add('hidden');
  document.getElementById('room').classList.remove('hidden');
  socket.emit('join', join, prompt('Your name?') || 'Guest');
}
