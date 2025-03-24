// ======================================
// إعداد المتغيرات العامة لحالة اللعبة
// ======================================
let board = [];                // مصفوفة ثنائية الأبعاد لتمثيل اللوحة (8x8)
let selectedPiece = null;      // يحتفظ بالموقع الحالي للقطعة المختارة { row, col }
let validMoves = [];           // قائمة بالحركات الصحيحة للقطعة المختارة
let turn = "white";            // الدور الحالي (white أو black)
let lastMove = null;           // لتتبع آخر حركة (مفيد لـ en passant)

// تعريف الرموز المستخدمة لكل قطعة باستخدام رموز اليونيكود
const pieceSymbols = {
  white: {
    king:   "♔",
    queen:  "♕",
    rook:   "♖",
    bishop: "♗",
    knight: "♘",
    pawn:   "♙"
  },
  black: {
    king:   "♚",
    queen:  "♛",
    rook:   "♜",
    bishop: "♝",
    knight: "♞",
    pawn:   "♟"
  }
};

// ======================================
// دوال التهيئة والرسم للوحة الشطرنج
// ======================================

/**
 * إنشاء مصفوفة اللوحة مع وضع القطع في أماكنها الابتدائية
 */
function initializeBoard() {
  board = new Array(8).fill(null).map(() => new Array(8).fill(null));
  
  // وضع القطع الرئيسية للونين أبيض وأسود
  const backRank = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
  
  // الصفوف العلوية (black) - في التمثيل الصف 0 (يعادل الرتبة 8)
  for (let col = 0; col < 8; col++) {
    board[0][col] = createPiece(backRank[col], "black");
    board[1][col] = createPiece("pawn", "black");
  }
  
  // الصفوف السفلية (white) - الصف 7 (يعادل الرتبة 1)
  for (let col = 0; col < 8; col++) {
    board[6][col] = createPiece("pawn", "white");
    board[7][col] = createPiece(backRank[col], "white");
  }
}

/**
 * دالة مساعدة لإنشاء كائن القطعة
 * @param {string} type - نوع القطعة (pawn, rook, knight, bishop, queen, king)
 * @param {string} color - لون القطعة ("white" أو "black")
 */
function createPiece(type, color) {
  return {
    type: type,
    color: color,
    symbol: pieceSymbols[color][type],
    hasMoved: false   // مفيد للتبييت والحركات الأولى للبيادق
  };
}

/**
 * رسم اللوحة على صفحة الويب داخل العنصر الذي يحمل id="chessboard"
 */
function renderBoard() {
  const boardContainer = document.getElementById("chessboard");
  boardContainer.innerHTML = ""; // تنظيف المحتوى السابق

  // إنشاء شبكة 8x8 للخانات
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.dataset.row = row;
      cell.dataset.col = col;
      
      // حساب لون الخانة تبعاً للتقليد (يمكن تحسين حساب اللون إذا رغبت)
      if ((row + col) % 2 === 0) {
        cell.classList.add("light");
      } else {
        cell.classList.add("dark");
      }
      
      // إذا كانت هناك قطعة في الموقع، عرض رمزها
      const piece = board[row][col];
      if (piece) {
        const pieceSpan = document.createElement("span");
        pieceSpan.classList.add("piece");
        pieceSpan.textContent = piece.symbol;
        cell.appendChild(pieceSpan);
      }
      
      // إضافة حدث النقر على الخانة
      cell.addEventListener("click", handleCellClick);
      boardContainer.appendChild(cell);
    }
  }
}

/**
 * إزالة تظليل الحركات الصحيحة من الخانات
 */
function clearHighlights() {
  document.querySelectorAll(".cell.highlight").forEach(cell => {
    cell.classList.remove("highlight");
  });
}

// ======================================
// دوال التعامل مع النقر والحركات
// ======================================

/**
 * التعامل مع نقر المستخدم على الخانة
 */
function handleCellClick(event) {
  const cell = event.currentTarget;
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);
  const clickedPiece = board[row][col];

  // إذا لم يكن هناك قطعة مختارة حالياً:
  if (!selectedPiece) {
    // تأكد أن هناك قطعة وأنها من لون الدور الحالي
    if (clickedPiece && clickedPiece.color === turn) {
      selectedPiece = { row, col };
      validMoves = getValidMoves(row, col);
      highlightCells(validMoves);
    }
  } else {
    // محاولة نقل القطعة إلى الموقع الجديد
    // تحقق إذا كان الموقع ضمن الحركات الصحيحة
    if (isCellInValidMoves(row, col)) {
      movePiece(selectedPiece, { row, col });
      clearHighlights();
      selectedPiece = null;
      validMoves = [];
      // تبديل الدور بعد الحركة
      turn = turn === "white" ? "black" : "white";
      // بعد كل حركة، تحقق من كش ملك (وللتبسيط، عرض تنبيه)
      if (isKingInCheck(turn)) {
        alert("الملك " + turn + " تحت التهديد!");
      }
      // تحقق من حالة كش مات
      if (checkForCheckmate(turn)) {
        alert("كش مات! انتهت اللعبة.");
      }
    } else {
      // إعادة التحديد إذا نقرت على قطعة من لونك
      if (clickedPiece && clickedPiece.color === turn) {
        clearHighlights();
        selectedPiece = { row, col };
        validMoves = getValidMoves(row, col);
        highlightCells(validMoves);
      } else {
        // إعادة تعيين الاختيار
        clearHighlights();
        selectedPiece = null;
        validMoves = [];
      }
    }
  }
  renderBoard();
}

/**
 * التحقق مما إذا كانت الخانة المحددة ضمن الحركات الصحيحة
 */
function isCellInValidMoves(row, col) {
  return validMoves.some(move => move.row === row && move.col === col);
}

/**
 * تظليل الخانات التي يمكن الانتقال إليها
 */
function highlightCells(moves) {
  moves.forEach(move => {
    const selector = `.cell[data-row="${move.row}"][data-col="${move.col}"]`;
    const cell = document.querySelector(selector);
    if (cell) {
      cell.classList.add("highlight");
    }
  });
}

// ======================================
// دوال حساب الحركات الصحيحة لكل قطعة
// ======================================

/**
 * الحصول على الحركات الصحيحة للقطعة الموجودة في (row, col)
 */
function getValidMoves(row, col) {
  const piece = board[row][col];
  if (!piece) return [];
  
  let moves = [];
  switch (piece.type) {
    case "pawn":
      moves = getPawnMoves(row, col, piece);
      break;
    case "rook":
      moves = getRookMoves(row, col, piece);
      break;
    case "knight":
      moves = getKnightMoves(row, col, piece);
      break;
    case "bishop":
      moves = getBishopMoves(row, col, piece);
      break;
    case "queen":
      moves = getQueenMoves(row, col, piece);
      break;
    case "king":
      moves = getKingMoves(row, col, piece);
      // إضافة حركة التبييت للملك إذا لم يتحرك
      moves = moves.concat(getCastlingMoves(row, col, piece));
      break;
  }
  // يمكن إضافة المزيد من الشروط للتحقق من الوضع (مثل الكشف عن التعرض للكش)
  return moves;
}

/*-------------------------
   حركات البيادق
-------------------------*/
function getPawnMoves(row, col, piece) {
  let moves = [];
  const direction = piece.color === "white" ? -1 : 1; // الأبيض يتحرك لأعلى (نقص في الصف) والأسود يتحرك لأسفل
  const startRow = piece.color === "white" ? 6 : 1;

  // الحركة إلى الأمام بمربع واحد
  if (isInBounds(row + direction, col) && !board[row + direction][col]) {
    moves.push({ row: row + direction, col });
    // إذا كانت في الصف الابتدائي يمكن أن تتحرك مربعين إذا لم تكن الخانة الأولى مشغولة
    if (row === startRow && !board[row + 2 * direction][col]) {
      moves.push({ row: row + 2 * direction, col });
    }
  }
  
  // الهجمات القطرية
  for (let deltaCol of [-1, 1]) {
    if (isInBounds(row + direction, col + deltaCol)) {
      const target = board[row + direction][col + deltaCol];
      if (target && target.color !== piece.color) {
        moves.push({ row: row + direction, col: col + deltaCol });
      }
      // حركة en passant
      if (!target && lastMove && lastMove.piece.type === "pawn" &&
          Math.abs(lastMove.from.row - lastMove.to.row) === 2 &&
          lastMove.to.row === row && lastMove.to.col === col + deltaCol) {
        moves.push({ row: row + direction, col: col + deltaCol });
      }
    }
  }
  return moves;
}

/*-------------------------
   حركات الرخ (القلعة)
-------------------------*/
function getRookMoves(row, col, piece) {
  let moves = [];
  const directions = [
    { dr: -1, dc: 0 }, // أعلى
    { dr: 1, dc: 0 },  // أسفل
    { dr: 0, dc: -1 }, // يسار
    { dr: 0, dc: 1 }   // يمين
  ];
  directions.forEach(dir => {
    let r = row + dir.dr, c = col + dir.dc;
    while (isInBounds(r, c)) {
      if (!board[r][c]) {
        moves.push({ row: r, col: c });
      } else {
        if (board[r][c].color !== piece.color) {
          moves.push({ row: r, col: c });
        }
        break;
      }
      r += dir.dr;
      c += dir.dc;
    }
  });
  return moves;
}

/*-------------------------
   حركات الحصان
-------------------------*/
function getKnightMoves(row, col, piece) {
  let moves = [];
  const offsets = [
    { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
    { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
    { dr: 1, dc: -2 },  { dr: 1, dc: 2 },
    { dr: 2, dc: -1 },  { dr: 2, dc: 1 }
  ];
  offsets.forEach(offset => {
    const r = row + offset.dr, c = col + offset.dc;
    if (isInBounds(r, c)) {
      if (!board[r][c] || board[r][c].color !== piece.color) {
        moves.push({ row: r, col: c });
      }
    }
  });
  return moves;
}

/*-------------------------
   حركات الفيل
-------------------------*/
function getBishopMoves(row, col, piece) {
  let moves = [];
  const directions = [
    { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
    { dr: 1, dc: -1 },  { dr: 1, dc: 1 }
  ];
  directions.forEach(dir => {
    let r = row + dir.dr, c = col + dir.dc;
    while (isInBounds(r, c)) {
      if (!board[r][c]) {
        moves.push({ row: r, col: c });
      } else {
        if (board[r][c].color !== piece.color) {
          moves.push({ row: r, col: c });
        }
        break;
      }
      r += dir.dr;
      c += dir.dc;
    }
  });
  return moves;
}

/*-------------------------
   حركات الملكة
-------------------------*/
function getQueenMoves(row, col, piece) {
  // حركة الملكة = حركة الرخ + حركة الفيل
  return getRookMoves(row, col, piece).concat(getBishopMoves(row, col, piece));
}

/*-------------------------
   حركات الملك
-------------------------*/
function getKingMoves(row, col, piece) {
  let moves = [];
  const offsets = [
    { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
    { dr: 0, dc: -1 },                 { dr: 0, dc: 1 },
    { dr: 1, dc: -1 },  { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
  ];
  offsets.forEach(offset => {
    const r = row + offset.dr, c = col + offset.dc;
    if (isInBounds(r, c)) {
      if (!board[r][c] || board[r][c].color !== piece.color) {
        moves.push({ row: r, col: c });
      }
    }
  });
  return moves;
}

/**
 * حركات التبييت (Castling) للملك
 */
function getCastlingMoves(row, col, king) {
  let moves = [];
  // التبييت مسموح إذا لم يتحرك الملك ولا الرخ المعني
  if (king.hasMoved) return moves;
  
  // التبييت على الجهة اليسرى (Queen side)
  if (canCastle(row, col, "left")) {
    moves.push({ row: row, col: col - 2, castling: "left" });
  }
  // التبييت على الجهة اليمنى (King side)
  if (canCastle(row, col, "right")) {
    moves.push({ row: row, col: col + 2, castling: "right" });
  }
  return moves;
}

/**
 * التحقق من إمكانية التبييت على جهة معينة
 */
function canCastle(row, col, side) {
  const king = board[row][col];
  if (!king || king.hasMoved) return false;
  let rookCol = side === "left" ? 0 : 7;
  const rook = board[row][rookCol];
  if (!rook || rook.type !== "rook" || rook.hasMoved) return false;
  
  // التأكد من عدم وجود قطع بين الملك والرخ
  const step = side === "left" ? -1 : 1;
  for (let c = col + step; side === "left" ? c > rookCol : c < rookCol; c += step) {
    if (board[row][c]) return false;
  }
  // في تطبيق متقدم يمكن أيضًا التحقق من عدم تعرض الملك للمهاجمة أثناء المرور
  return true;
}

/**
 * التحقق مما إذا كانت الإحداثيات (row, col) ضمن حدود اللوحة
 */
function isInBounds(row, col) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// ======================================
// دوال تنفيذ الحركة والتحديثات الخاصة باللعبة
// ======================================

/**
 * نقل القطعة من موقع إلى آخر مع التعامل مع الحركات الخاصة
 */
function movePiece(from, to) {
  const piece = board[from.row][from.col];
  if (!piece) return;
  
  // معالجة حركة التبييت
  if (piece.type === "king" && Math.abs(from.col - to.col) === 2) {
    // تحديد الجهة
    if (to.col < from.col) {
      // تبييت على الجهة اليسرى
      board[from.row][0].hasMoved = true;
      board[from.row][to.col + 1] = board[from.row][0];
      board[from.row][0] = null;
    } else {
      // تبييت على الجهة اليمنى
      board[from.row][7].hasMoved = true;
      board[from.row][to.col - 1] = board[from.row][7];
      board[from.row][7] = null;
    }
  }
  
  // معالجة حركة en passant للبيادق
  if (piece.type === "pawn" && from.col !== to.col && !board[to.row][to.col]) {
    // إذا تم التحرك قطرياً دون وجود قطعة في الموقع الهدف، يتم أخذ البيادق
    const pawnRow = piece.color === "white" ? to.row + 1 : to.row - 1;
    board[pawnRow][to.col] = null;
  }
  
  // تحديث حالة القطعة (على سبيل المثال: hasMoved)
  piece.hasMoved = true;
  
  // حفظ الحركة الأخيرة للتعامل مع en passant لاحقاً
  lastMove = {
    piece: piece,
    from: { ...from },
    to: { ...to }
  };
  
  // نقل القطعة إلى الموقع الجديد
  board[to.row][to.col] = piece;
  board[from.row][from.col] = null;
}

// ======================================
// دوال التحقق من كش ملك وكش مات
// ======================================

/**
 * التحقق مما إذا كان ملك لون معين تحت التهديد
 */
function isKingInCheck(color) {
  // ابحث عن موقع الملك
  let kingPos = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = board[row][col];
      if (p && p.type === "king" && p.color === color) {
        kingPos = { row, col };
        break;
      }
    }
    if (kingPos) break;
  }
  if (!kingPos) return false;
  
  // افحص كل قطعة من الخصم للتحقق مما إذا كانت قادرة على الوصول إلى موقع الملك
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = board[row][col];
      if (p && p.color !== color) {
        const moves = getValidMoves(row, col);
        if (moves.some(move => move.row === kingPos.row && move.col === kingPos.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * تحقق من حالة كش مات للون معين
 * (ملاحظة: تنفيذ دقيق لشروط كش مات يتطلب محاكاة جميع الحركات الممكنة، هنا نقدم تحقق مبسط)
 */
function checkForCheckmate(color) {
  // افحص جميع القطع التي تنتمي للون المعني
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = board[row][col];
      if (p && p.color === color) {
        const moves = getValidMoves(row, col);
        // إذا كانت أي حركة صحيحة لا تعرض الملك للكش
        for (let move of moves) {
          const boardCopy = JSON.parse(JSON.stringify(board));
          // تنفيذ الحركة مؤقتاً على النسخة
          boardCopy[move.row][move.col] = p;
          boardCopy[row][col] = null;
          if (!simulateKingCheck(boardCopy, color)) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

/**
 * دالة محاكاة للتحقق مما إذا كان الملك في وضع كش في لوحة معطاة
 */
function simulateKingCheck(simBoard, color) {
  let kingPos = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = simBoard[row][col];
      if (p && p.type === "king" && p.color === color) {
        kingPos = { row, col };
        break;
      }
    }
    if (kingPos) break;
  }
  if (!kingPos) return true;
  
  // افحص حركات القطع الخصمية على اللوحة المحاكاة
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = simBoard[row][col];
      if (p && p.color !== color) {
        // لاستخدام دوال الحركة مع اللوحة المحاكاة يمكن تطوير نسخة منفصلة
        const moves = getValidMovesForSim(row, col, p, simBoard);
        if (moves.some(move => move.row === kingPos.row && move.col === kingPos.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * نسخة معدلة من دالة الحصول على الحركات لتعمل على لوحة محددة (محاكاة)
 */
function getValidMovesForSim(row, col, piece, simBoard) {
  // نستبدل استخدام board بـ simBoard داخل الدوال الأساسية
  let originalBoard = board;
  board = simBoard;
  let moves = getValidMoves(row, col);
  board = originalBoard;
  return moves;
}

// ======================================
// بدء اللعبة عند تحميل الصفحة
// ======================================
document.addEventListener("DOMContentLoaded", () => {
  initializeBoard();
  renderBoard();
});