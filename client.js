const socket = io();
let room = null, game = null;

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

function move(m) { if (room) socket.emit('move', room, m); }
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
  if (g === 'tictactoe') renderTTT(area, s);
  if (g === 'connect4') renderC4(area, s);
  if (g === 'chess') renderChess(area, s);
}

function renderTTT(a, s) {
  for (let i = 0; i < 9; i++) {
    const c = document.createElement('div');
    c.textContent = s.board[i] || '';
    c.style = 'width:100px;height:100px;font-size:70px;text-align:center;line-height:100px;border:3px solid #60a5fa;display:inline-block;cursor:pointer;background:#1e293b';
    c.onclick = () => move(i);
    a.appendChild(c);
  }
}

function renderC4(a, s) {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const d = document.createElement('div');
      const color = s.board[r][c] === 'R' ? 'red' : s.board[r][c] === 'Y' ? 'yellow' : '#333';
      d.style = `width:60px;height:60px;border-radius:50%;background:${color};display:inline-block;margin:4px;cursor:pointer`;
      d.onclick = () => move(c);
      a.appendChild(d);
    }
    a.appendChild(document.createElement('br'));
  }
}

function renderChess(a, s) {
  const b = document.createElement('div');
  b.style = 'width:480px;height:480px;display:grid;grid-template-columns:repeat(8,1fr);margin:auto;background:#333';
  const pieces = { 'R':'R', 'N':'N', 'B':'B', 'Q':'Q', 'K':'K', 'P':'P', 'r':'r', 'n':'n', 'b':'b', 'q':'q', 'k':'k', 'p':'p' };
  s.board.flat().forEach((p, i) => {
    const sq = document.createElement('div');
    sq.textContent = pieces[p] || '';
    sq.style = `background:${(Math.floor(i/8)+i%8)%2?'#8b5a2b':'#f0d9b5'};font-size:50px;text-align:center;line-height:60px;cursor:pointer`;
    sq.onclick = () => move(i);
    b.appendChild(sq);
  });
  a.appendChild(b);
}

// Auto-join from URL
const urlParams = new URLSearchParams(location.search);
const joinRoom = urlParams.get('room');
if (joinRoom) {
  room = joinRoom;
  document.getElementById('lobby').classList.add('hidden');
  document.getElementById('room').classList.remove('hidden');
  socket.emit('join', joinRoom, prompt('Your name?') || 'Guest');
}
