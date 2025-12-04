const socket = io();
let room = null, game = null, selected = null;

document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('click', () => {
    game = card.dataset.game;
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('room').classList.remove('hidden');
    document.getElementById('title').textContent = card.textContent.trim();
    socket.emit('create', game, document.getElementById('name').value || 'Player');
  }, { passive: false });
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
    if (!s.board[i]) cell.addEventListener('click', () => move({type:'place', pos:i}), { passive: false });
    a.appendChild(cell);
  }
}

// Connect 4 (unchanged, but touch-safe)
function renderC4(a, s) {
  for (let col = 0; col < 7; col++) {
    const column = document.createElement('div');
    column.style = 'display:inline-block;width:14%;text-align:center;vertical-align:bottom;height:360px';
    for (let row = 5; row >= 0; row--) {
      const cell = document.createElement('div');
      const color = s.board[row][col] === 'R' ? '#e74c3c' : s.board[row][col] === 'Y' ? '#f1c40f' : '#2c3e50';
      cell.style = `width:50px;height:50px;border-radius:50%;background:${color};margin:6px auto;cursor:pointer;border:3px solid #34495e`;
      if (s.board[0][col] === '' || s.board.some(r => r[col] === '')) {
        cell.addEventListener('click', () => move({type:'drop', col}), { passive: false });
      }
      column.appendChild(cell);
    }
    a.appendChild(column);
  }
}

// CHESS — MOBILE BULLETPROOF: LARGER TAPS + TOUCH EVENTS
function renderChess(a, s) {
  const board = document.createElement('div');
  board.id = 'chess-board';
  board.style = `
    width: min(95vw, 480px); height: min(95vw, 480px); margin: 20px auto;
    display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr);
    background: #8B5A2B; border: 12px solid #654321; border-radius: 12px;
    box-shadow: 0 15px 40px rgba(0,0,0,0.7); touch-action: manipulation;
    overflow: hidden; position: relative;
  `;

  const whitePieces = { P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕', K: '♔' };
  const blackPieces = { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' };

  // White at bottom (row 7 to 0)
  for (let row = 7; row >= 0; row--) {
    for (let col = 0; col < 8; col++) {
      const idx = row * 8 + col;
      const piece = s.board[row][col];
      const isLight = (row + col) % 2 === 0;

      const sq = document.createElement('div');
      sq.dataset.idx = idx;
      sq.style = `
        background: ${isLight ? '#f0d9b5' : '#b58863'};
        display: flex; align-items: center; justify-content: center;
        font-size: clamp(32px, 8vw, 48px); cursor: pointer; user-select: none;
        border: 1px solid rgba(0,0,0,0.1); position: relative; min-height: 0;
        touch-action: manipulation; -webkit-tap-highlight-color: transparent;
      `;

      if (piece) {
        const isWhite = piece === piece.toUpperCase();
        const symbol = isWhite ? whitePieces[piece] : blackPieces[piece];
        sq.innerHTML = `
          <span style="
            color: ${isWhite ? '#FFFFFF' : '#000000'};
            text-shadow: ${isWhite ? '2px 2px 4px rgba(0,0,0,0.8)' : '1px 1px 2px rgba(255,255,255,0.8)'};
            font-weight: bold; font-size: inherit; z-index: 2;
            filter: drop-shadow(0 0 2px ${isWhite ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.3)'});
          ">${symbol}</span>
        `;
      }

      // MOBILE + DESKTOP: CLICK + TOUCHEND
      const handleTap = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetIdx = parseInt(sq.dataset.idx);
        if (selected === targetIdx) {
          selected = null;
        } else if (selected !== null) {
          move({ from: selected, to: targetIdx });
          selected = null;
        } else {
          const p = s.board[Math.floor(targetIdx / 8)][targetIdx % 8];
          if (p && ((s.turn === 'w' && p === p.toUpperCase()) || (s.turn === 'b' && p !== p.toUpperCase()))) {
            selected = targetIdx;
          }
        }
        render(game, s); // Re-render highlight
      };

      sq.addEventListener('click', handleTap, { passive: false });
      sq.addEventListener('touchend', handleTap, { passive: false });

      // Highlight
      if (selected === idx) {
        sq.style.background = '#60a5fa99';
        sq.style.transform = 'scale(1.02)';
      }

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
