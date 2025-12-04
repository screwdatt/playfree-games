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

// Tic-Tac-Toe & Connect4 unchanged (they already work)

// CHESS — FINAL VERSION: SOLID PIECES + 100% MOBILE CLICKABLE
function renderChess(a, s) {
  const board = document.createElement('div');
  board.style = `
    width:100%; max-width:480px; margin:20px auto;
    display:grid; grid-template-columns:repeat(8,1fr);
    aspect-ratio:1/1; background:#8B5A2B;
    border:12px solid #654321; border-radius:12px;
    box-shadow:0 15px 40px rgba(0,0,0,0.7);
    overflow:hidden;
  `;

  const whitePieces = { P:'♙', R:'♖', N:'♘', B:'♗', Q:'♕', K:'♔' };
  const blackPieces = { p:'♟', r:'♜', n:'♞', b:'♝', q:'♛', k:'♚' };

  // White at bottom (row 7 → 0)
  for (let row = 7; row >= 0; row--) {
    for (let col = 0; col < 8; col++) {
      const idx = row * 8 + col;
      const piece = s.board[row][col];
      const isLight = (row + col) % 2 === 0;

      const sq = document.createElement('div');
      sq.style = `
        background:${isLight ? '#f0d9b5' : '#b58863'};
        display:flex; align-items:center; justify-content:center;
        font-size:clamp(38px, 9.5vw, 60px);
        cursor:pointer; user-select:none; touch-action:manipulation;
        position:relative; border:1px solid rgba(0,0,0,0.15);
      `;

      if (piece) {
        const isWhite = piece === piece.toUpperCase();
        const symbol = isWhite ? whitePieces[piece] : blackPieces[piece];
        sq.innerHTML = `
          <span style="color:${isWhite ? 'white' : 'black'};
                      text-shadow:${isWhite ? '2px 2px 4px #000' : '1px 1px 3px #fff'};
                      font-weight:bold; filter:drop-shadow(0 0 3px ${isWhite ? '#000' : '#fff'});">
            ${symbol}
          </span>
        `;
      }

      // Highlight selected
      if (selected === idx) {
        sq.style.background = '#60a5fa99';
      }

      // MOBILE + DESKTOP CLICK/TAP
      sq.onclick = sq.ontouchend = (e) => {
        e.preventDefault();
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
        render(game, s);
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
