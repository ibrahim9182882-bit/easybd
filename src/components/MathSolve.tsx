import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface MathSolveProps {
  onClose: () => void;
  onWin: () => void;
  onShowToast: (msg: string, type: "success" | "error" | "info") => void;
  rewardAmount: number;
}

export default function MathSolve({ onClose, onWin, onShowToast, rewardAmount }: MathSolveProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<number[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState(0);

  useEffect(() => {
    generateQuestion();
  }, []);

  const generateQuestion = () => {
    const n1 = Math.floor(Math.random() * 20) + 1;
    const n2 = Math.floor(Math.random() * 20) + 1;
    const ans = n1 + n2;

    setCorrectAnswer(ans);
    setQuestion(`${n1} + ${n2} = ?`);

    const incorrect1 = ans + Math.floor(Math.random() * 5) + 1;
    const incorrect2 = ans - Math.floor(Math.random() * 5) - 1;
    const incorrect3 = ans + 10;

    const opts = Array.from(new Set([ans, incorrect1, incorrect2, incorrect3]))
      .slice(0, 4)
      .sort(() => Math.random() - 0.5);

    setOptions(opts);
  };

  const handleOptionClick = (selected: number) => {
    if (selected === correctAnswer) {
      onWin();
      onClose();
    } else {
      onShowToast("Wrong! Try Again.", "error");
      generateQuestion();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Math Solve</h2>
          <button
            onClick={onClose}
            className="text-white bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-800/80 p-8 rounded-2xl border border-slate-700/50 text-center mb-6 shadow-xl">
          <p className="text-4xl font-extrabold text-white mb-2 font-mono tracking-wider">
            {question}
          </p>
          <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-semibold">
            Select correct answer to earn {rewardAmount} coins
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleOptionClick(opt)}
              className="bg-slate-800/50 hover:bg-indigo-600 active:scale-95 text-white font-extrabold py-4 rounded-xl text-xl transition-all border border-white/5 shadow-md"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
