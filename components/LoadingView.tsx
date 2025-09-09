
import React, { useState, useEffect } from 'react';

const messages = [
  "Finder de bedste opskrifter...",
  "Beregner næringsindhold...",
  "Tjekker dit køleskab for ingredienser...",
  "Sikrer variation fra tidligere uger...",
  "Skriver din indkøbsliste...",
  "Lægger sidste hånd på værket...",
];

export const LoadingView: React.FC = () => {
  const [message, setMessage] = useState(messages[0]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setMessage(prevMessage => {
        const currentIndex = messages.indexOf(prevMessage);
        const nextIndex = (currentIndex + 1) % messages.length;
        return messages[nextIndex];
      });
    }, 2500);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <div className="loader ease-linear rounded-full border-8 border-t-8 border-slate-200 h-32 w-32 mb-6"></div>
      <style>{`
        .loader {
          border-top-color: #10b981; /* emerald-500 */
          -webkit-animation: spinner 1.5s linear infinite;
          animation: spinner 1.5s linear infinite;
        }
        @-webkit-keyframes spinner {
          0% { -webkit-transform: rotate(0deg); }
          100% { -webkit-transform: rotate(360deg); }
        }
        @keyframes spinner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <h2 className="text-2xl font-bold text-slate-700 mb-2">Din personlige madplan er på vej!</h2>
      <p className="text-slate-500 transition-opacity duration-500">{message}</p>
    </div>
  );
};