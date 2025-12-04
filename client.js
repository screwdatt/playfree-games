// ... (keep all previous code, replace renderChess only)

function renderChess(a, s) {
  const board = document.createElement('div');
  board.style = 'width:100%;max-width:480px;margin:auto;display:grid;grid-template-columns:repeat(8,1fr);aspect-ratio:1/1;background:#769656;border:8px solid #b58863;border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,0.5)';

  const whitePieces = {'P':'♙','R':'♖','N':'♘','B':'♗','Q':'♕','K':'♔'};
  const blackPieces = {'p':'♟','r':'♜','n':'♞','b':'♝','q':'♛','k':'♚'};

  // Flip for white at bottom (display row 7 to 0)
  for (let row = 7; row >= 0; row--) {
    for (let col = 0; col < 8; col++) {
      const i = row * 8 + col;
      const piece = s.board[row][col];
      const sq = document.createElement('div');
      const isLight = (row + col) % 2 === 0;
      sq.style = `background:${isLight ? '#f0d9b5' : '#b58863'};display:flex;align-items:center;justify-content:center;font-size:clamp(32px,8vw,48px);cursor:pointer;border:1px solid rgba(0,0,0,0.1);user-select:none`;
      sq.textContent = piece ? (piece === piece.toUpperCase() ? whitePieces[piece] : blackPieces[piece]) : '';
      
      sq.onclick = () => chessClick(i, s);
      board.appendChild(sq);
    }
  }
  a.appendChild(board);
}

function chessClick(idx, s) {
  if (selected === idx) { selected = null; render(game, s); return; }
  if (selected !== null) {
    move({from: selected, to: idx});
    selected = null;
  } else {
    const row = Math.floor(idx / 8), col = idx % 8;
    const piece = s.board[row][col];
    if (piece && ((s.turn === 'w' && piece === piece.toUpperCase()) || (s.turn === 'b' && piece === piece.toLowerCase()))) {
      selected = idx;
      render(game, s);  // Re-render to highlight
    }
  }
}
