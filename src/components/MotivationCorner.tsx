import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

const QUOTES = [
  { quote: "The beautiful thing about learning is that no one can take it away from you.", source: "B.B. King" },
  { quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", source: "Mahatma Gandhi" },
  { quote: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", source: "Malcolm X" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", source: "Winston Churchill" },
  { quote: "Believe you can and you're halfway there.", source: "Theodore Roosevelt" },
  { quote: "There are no shortcuts to any place worth going.", source: "Beverly Sills" },
  { quote: "It always seems impossible until it's done.", source: "Nelson Mandela" },
  { quote: "Focus on being productive instead of busy.", source: "Tim Ferriss" },
  { quote: "Do the best you can until you know better. Then when you know better, do better.", source: "Maya Angelou" },
  { quote: "The mind is not a vessel to be filled, but a fire to be kindled.", source: "Plutarch" }
];

export default function MotivationCorner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Select quote of the day based on today's calendar day
    const day = new Date().getDate();
    setIndex(day % QUOTES.length);
  }, []);

  const rotateQuote = () => {
    setIndex((prev) => (prev + 1) % QUOTES.length);
  };

  const item = QUOTES[index];

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 glass-card border border-blue-500/20 shadow-glow mb-6 transition-all duration-300 hover:shadow-lg hover:border-blue-500/35">
      {/* Accent Glow Ring */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block leading-none">
              Daily Motivation
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Fuel your study session
            </span>
          </div>
        </div>

        <button
          onClick={rotateQuote}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Get another quote"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-sm sm:text-base font-semibold italic text-gray-900 dark:text-white leading-relaxed text-center py-2">
        "{item.quote}"
      </p>

      <p className="text-[11px] font-bold text-right text-blue-500 dark:text-blue-400 mt-1">
        — {item.source}
      </p>
    </div>
  );
}