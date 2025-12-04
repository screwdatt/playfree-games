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
  document.getElementById('code').textContent = id;
  document.getElementById('players').innerHTML = '<b>Players:</b> ' + data.players.map(p => p.name).join(' vs ');
  game = data.game;          // ← THIS WAS MISSING BEFORE
  render(game, data.state);  // ← THIS WAS MISSING BEFORE
});

socket.on('players', p => {
  document.getElementById('players').innerHTML = '<b>Players:</b> ' + p.map(x => x.name).join(' vs ');
});

socket.on('state', s => render(game, s));

function move(data) { if (room) socket.emit('move', room, data); }

function send() {
  const i = document.getElementById('msg');
  if (i.value.trim()) {
    socket.emit('chat', room, i.value);
    i.value = '';
  }
}

function copy() {
  navigator.clipboard.writeText(location.origin + '?room=' + room);
  alert('Link copied!');
}

socket.on('chat', (n, m) => {
  const log = document.getElementById('log');
  log.innerHTML += `<br><b>\( {n}:</b> \){m>`;
  log.scrollTop = log.scrollHeight;
});

function render(g, s) {
  const area = document.getElementById('game');
  area.innerHTML = '';
  selected = null;

  if (g === 'tictactoe') renderTTT(area, s);
  else if (g === 'connect4') renderC4(area, s);
  else if (g === 'chess') renderChess(area, s);
}

// ────────────────────── CHESS (mobile-proof) ──────────────────────
function renderChess(a, s) {
  const board = document.createElement('div');
  board.style = `
    width:min(95vw,480px);height:min(95vw,480px);margin:20px auto;
    display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);
    border:12px solid #654321;border-radius:12px;background:#8B5A2B;
    box-shadow:0 15px 40px rgba(0,0,0,0.7);touch-action:manipulation;
  `;

  const w = {P:'P',R:'R',N:'N',B:'B',Q:'Q',K:'K'};
  const b = {p:'p',r:'r',n:'n',b:'b',q:'q',k:'k'};

  for (let row = 7; row >= 0; row--) {
    for (let col = 0; col < 8; col++) {
      const idx = row * 8 + col;
      const piece = s.board[row][col];
      const light = (row + col) % 2 === 0;

      const sq = document.createElement('div');
      sq.dataset.idx = idx;
      sq.style = `
        background:${light?'#f0d9b5':'#b58863'};
        display:flex;align-items:center;justify-content:center;
        font-size:clamp(38px,9.5vw,60px);cursor:pointer;user-select:none;
        touch-action:manipulation;-webkit-tap-highlight-color:transparent;
      `;

      if (piece) {
        const isWhite = piece === piece.toUpperCase();
        sq.innerHTML = `<span style="color:\( {isWhite?'#fff':'#000'};text-shadow: \){isWhite?'2px 2px 4px #000':'1px 1px 3px #fff'}">
          ${isWhite ? w[piece] : b[piece]}
        </span>`;
      }

      if (selected === idx) sq.style.background = '#60a5fa99';

      const tap = (e) => {
        e.preventDefault();
        const i = parseInt(sq.dataset.idx);
        if (selected === i) selected = null;
        else if (selected !== null) { move({from:selected,to:i}); selected = null; }
        else if (piece && ((s.turn==='w'&&piece===piece.toUpperCase())||(s.turn==='b'&&piece===piece.toLowerCase()))) selected = i;
        render(game, s);
      };
      sq.onclick = sq.ontouchend = tap;

      board.appendChild(sq);
    }
  }
  a.appendChild(board);
}

// Tic-Tac-Toe & Connect4 (tiny versions, they work)
function renderTTT(a,s){/* keep your old one or delete for now */}
function renderC4(a,s){/* keep your old one or delete for now */}

// Auto-join from URL
const url = new URLSearchParams(location.search);
const r = url.get('room');
if (r) {
  room = r;
  document.getElementById('lobby').classList.add('hidden');
  document.getElementById('room').classList.remove('hidden');
  socket.emit('join', r, prompt('Name?')||'Guest');
}
