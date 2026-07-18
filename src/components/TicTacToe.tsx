import { useState } from "react";
import { motion } from "motion/react";
import { X, Play } from "lucide-react";

interface TicTacToeProps {
  onClose: () => void;
  onWin: () => void;
  onShowToast: (msg: string, type: "success" | "error" | "info") => void;
  rewardAmount: number;
}

const WINS_PATTERNS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export default function TicTacToe({ onClose, onWin, onShowToast, rewardAmount }: TicTacToeProps) {
  const [board, setBoard] = useState<string[]>(Array(9).fill(""));
  const [active, setActive] = useState(true);
  const [statusText, setStatusText] = useState("Your Turn (X)");

  const resetBoard = () => {
    setBoard(Array(9).fill(""));
    setActive(true);
    setStatusText("Your Turn (X)");
  };

  const checkWinner = (tempBoard: string[], player: string) => {
    return WINS_PATTERNS.some((pattern) =>
      pattern.every((index) => tempBoard[index] === player)
    );
  };

  const findWinningMove = (tempBoard: string[], player: string) => {
    for (const pattern of WINS_PATTERNS) {
      const [x, y, z] = pattern;
      if (tempBoard[x] === player && tempBoard[y] === player && tempBoard[z] === "") return z;
      if (tempBoard[x] === player && tempBoard[z] === player && tempBoard[y] === "") return y;
      if (tempBoard[y] === player && tempBoard[z] === player && tempBoard[x] === "") return x;
    }
    return -1;
  };

  const compMoveSmart = (tempBoard: string[]) => {
    if (!active) return;
    let move = -1;

    // 1. Can AI win?
    move = findWinningMove(tempBoard, "O");
    // 2. Block player?
    if (move === -1) {
      move = findWinningMove(tempBoard, "X");
    }
    // 3. Take center?
    if (move === -1 && tempBoard[4] === "") {
      move = 4;
    }
    // 4. Random empty slot
    if (move === -1) {
      const emptyIdxs = tempBoard
        .map((val, idx) => (val === "" ? idx : null))
        .filter((val) => val !== null) as number[];
      if (emptyIdxs.length > 0) {
        move = emptyIdxs[Math.floor(Math.random() * emptyIdxs.length)];
      }
    }

    if (move !== -1) {
      const nextBoard = [...tempBoard];
      nextBoard[move] = "O";
      setBoard(nextBoard);

      if (checkWinner(nextBoard, "O")) {
        setActive(false);
        setStatusText("Computer Won!");
        setTimeout(() => {
          onShowToast("You Lost! Try Again.", "error");
          resetBoard();
        }, 1500);
      } else if (!nextBoard.includes("")) {
        setActive(false);
        setStatusText("Draw!");
        setTimeout(() => {
          resetBoard();
        }, 1500);
      } else {
        setStatusText("Your Turn (X)");
      }
    }
  };

  const handleCellClick = (idx: number) => {
    if (!active || board[idx] !== "") return;

    const nextBoard = [...board];
    nextBoard[idx] = "X";
    setBoard(nextBoard);

    if (checkWinner(nextBoard, "X")) {
      setActive(false);
      setStatusText("You Won!");
      setTimeout(() => {
        onWin();
        onClose();
      }, 1000);
      return;
    }

    if (!nextBoard.includes("")) {
      setActive(false);
      setStatusText("Draw!");
      setTimeout(() => {
        resetBoard();
      }, 1500);
      return;
    }

    setStatusText("AI Thinking...");
    setTimeout(() => {
      compMoveSmart(nextBoard);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Tic Tac Toe</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 text-center mb-6">
          <p className="text-slate-300 text-sm">
            Beat Smart AI = <span className="text-yellow-400 font-bold">{rewardAmount} Coins</span>
          </p>
        </div>

        {/* Board Grid */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[300px] mx-auto mb-6">
          {board.map((cell, idx) => (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              className={`aspect-square bg-slate-800/40 rounded-xl flex items-center justify-center text-4xl font-extrabold shadow-md border border-white/5 active:scale-95 transition-all ${
                cell === "X" ? "text-emerald-400" : cell === "O" ? "text-rose-400" : ""
              }`}
            >
              {cell}
            </button>
          ))}
        </div>

        <p className="text-center text-lg font-bold text-slate-200 mt-6 animate-pulse">
          {statusText}
        </p>
      </div>
    </div>
  );
}
