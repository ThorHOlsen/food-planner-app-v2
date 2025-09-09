import React, { useState } from 'react';
import { type WeeklyData, type DayPlan } from '../types.ts';
import { UserGroupIcon, ClockIcon, CubeIcon, ChatBubbleIcon } from './icons.tsx';

interface MealPlannerFormProps {
  onSubmit: (data: WeeklyData) => void;
  isLoading: boolean;
}

const DAYS = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag"];
const EATERS = ["Thor", "Line", "Vigga", "Harry", "Yrsa"];

const initialDays: DayPlan[] = DAYS.map(day => ({
  day,
  eaters: EATERS,
  cookingTime: 30,
  noMeal: false,
}));

export const MealPlannerForm: React.FC<MealPlannerFormProps> = ({ onSubmit, isLoading }) => {
  const [step, setStep] = useState(0);
  const [pastedHistory, setPastedHistory] = useState('');
  const [feedback, setFeedback] = useState('');
  const [days, setDays] = useState<DayPlan[]>(initialDays);
  const [availableIngredients, setAvailableIngredients] = useState('');
  const [requestedIngredients, setRequestedIngredients] = useState('');
  const [otherRequests, setOtherRequests] = useState('');

  const handleEaterChange = (dayIndex: number, eater: string) => {
    const newDays = [...days];
    const currentEaters = newDays[dayIndex].eaters;
    if (currentEaters.includes(eater)) {
      newDays[dayIndex].eaters = currentEaters.filter(e => e !== eater);
    } else {
      newDays[dayIndex].eaters.push(eater);
    }
    setDays(newDays);
  };

  const handleTimeChange = (dayIndex: number, time: number) => {
    const newDays = [...days];
    newDays[dayIndex].cookingTime = time;
    setDays(newDays);
  };

  const handleNoMealToggle = (dayIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].noMeal = !newDays[dayIndex].noMeal;
    setDays(newDays);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ pastedHistory, feedback, days, availableIngredients, requestedIngredients, otherRequests });
  };
  
  const totalSteps = DAYS.length + 5; // History + Feedback + Days + 3 Final steps
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
      <h2 className="text-3xl font-bold text-slate-800 text-center mb-2">Planlæg din uge</h2>
      <p className="text-center text-slate-500 mb-8">Fortæl os dine præferencer for den kommende uge.</p>

      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-8">
        <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
      </div>
      
      <form onSubmit={handleSubmit}>
        {/* Step 0: Pasted History */}
        <div className={step === 0 ? 'block' : 'hidden'}>
            <h3 className="text-2xl font-semibold text-slate-700 mb-6 text-center">Indsæt tidligere madplaner</h3>
             <div>
                <label htmlFor="pasted-history" className="flex items-center text-lg font-medium text-slate-600 mb-3">
                    <CubeIcon className="w-5 h-5 mr-2 text-slate-400" />
                    Indsæt de sidste 2 måneders madplaner for at undgå gentagelser
                </label>
                <textarea
                    id="pasted-history"
                    rows={12}
                    placeholder="Eksempel:&#10;- Uge 34: Kylling i karry, Lasagne med spinat&#10;- Uge 33: Fiskefrikadeller med rugbrød, Boller i karry"
                    value={pastedHistory}
                    onChange={(e) => setPastedHistory(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
            </div>
        </div>
        
        {/* Step 1: Feedback */}
        <div className={step === 1 ? 'block' : 'hidden'}>
            <h3 className="text-2xl font-semibold text-slate-700 mb-6 text-center">Feedback på sidste uges plan</h3>
             <div>
                <label htmlFor="feedback" className="flex items-center text-lg font-medium text-slate-600 mb-3">
                    <ChatBubbleIcon className="w-5 h-5 mr-2 text-slate-400" />
                    Var der noget, du var særligt glad for eller utilfreds med?
                </label>
                <textarea
                    id="feedback"
                    rows={8}
                    placeholder="F.eks. 'Kylling i karry var fantastisk, men lasagnen var for tør. Undgå gerne retter med spinat denne uge.'"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
            </div>
        </div>

        {/* Steps for each day */}
        {days.map((day, index) => (
          <div key={day.day} className={step === index + 2 ? 'block' : 'hidden'}>
            <h3 className="text-2xl font-semibold text-slate-700 mb-2 text-center">{day.day}</h3>
            
            <div className="flex items-center justify-center mb-6">
              <input
                type="checkbox"
                id={`no-meal-${day.day}`}
                checked={day.noMeal}
                onChange={() => handleNoMealToggle(index)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor={`no-meal-${day.day}`} className="ml-2 text-sm text-slate-600 cursor-pointer">
                Ingen madplan for denne dag
              </label>
            </div>

            <div className={day.noMeal ? 'opacity-40 pointer-events-none transition-opacity' : 'transition-opacity'}>
              <div className="mb-6">
                <label className="flex items-center text-lg font-medium text-slate-600 mb-3">
                  <UserGroupIcon className="w-5 h-5 mr-2 text-slate-400" />
                  Hvem spiser med?
                </label>
                <div className="flex flex-wrap gap-3">
                  {EATERS.map(eater => (
                    <button
                      type="button"
                      key={eater}
                      onClick={() => handleEaterChange(index, eater)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                        day.eaters.includes(eater)
                          ? 'bg-emerald-500 text-white shadow'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 line-through'
                      }`}
                    >
                      {eater}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor={`time-${day.day}`} className="flex items-center text-lg font-medium text-slate-600 mb-3">
                  <ClockIcon className="w-5 h-5 mr-2 text-slate-400" />
                  Maksimal tilberedningstid
                </label>
                <div className="flex items-center gap-4">
                  <input
                    id={`time-${day.day}`}
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={day.cookingTime}
                    onChange={(e) => handleTimeChange(index, parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <span className="font-semibold text-emerald-600 w-24 text-center bg-emerald-50 px-3 py-1 rounded-md">{day.cookingTime} min</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Step: Available Ingredients */}
        <div className={step === DAYS.length + 2 ? 'block' : 'hidden'}>
            <h3 className="text-2xl font-semibold text-slate-700 mb-6 text-center">Ingredienser du har</h3>
            <div>
                <label htmlFor="available-ingredients" className="flex items-center text-lg font-medium text-slate-600 mb-3">
                    <CubeIcon className="w-5 h-5 mr-2 text-slate-400" />
                    Hvilke relevante råvarer har du allerede?
                </label>
                <textarea
                    id="available-ingredients"
                    rows={10}
                    placeholder="F.eks. 500g hakket svinekød, 1 dåse flåede tomater, 2 løg... Disse vil ikke blive tilføjet indkøbslisten."
                    value={availableIngredients}
                    onChange={(e) => setAvailableIngredients(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
            </div>
        </div>

        {/* Step: Requested Ingredients */}
        <div className={step === DAYS.length + 3 ? 'block' : 'hidden'}>
            <h3 className="text-2xl font-semibold text-slate-700 mb-6 text-center">Ønsker til madplanen</h3>
            <div>
                <label htmlFor="requested-ingredients" className="flex items-center text-lg font-medium text-slate-600 mb-3">
                    <ChatBubbleIcon className="w-5 h-5 mr-2 text-slate-400" />
                    Ingredienser som skal være en del af den kommende uges madplan
                </label>
                <textarea
                    id="requested-ingredients"
                    rows={10}
                    placeholder="F.eks. 'Jeg vil gerne have en ret med laks' eller 'Brug gerne den broccoli jeg har liggende'."
                    value={requestedIngredients}
                    onChange={(e) => setRequestedIngredients(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
            </div>
        </div>
        
        {/* Step: Other Comments */}
        <div className={step === DAYS.length + 4 ? 'block' : 'hidden'}>
            <h3 className="text-2xl font-semibold text-slate-700 mb-6 text-center">Andre kommentarer</h3>
             <div>
                <label htmlFor="other-requests" className="flex items-center text-lg font-medium text-slate-600 mb-3">
                    <ChatBubbleIcon className="w-5 h-5 mr-2 text-slate-400" />
                    Har du andre kommentarer eller ønsker til madplanen?
                </label>
                <textarea
                    id="other-requests"
                    rows={10}
                    placeholder="F.eks. 'Gerne noget asiatisk', 'undgå pasta denne uge', 'lav en ret der er fryseegnet'."
                    value={otherRequests}
                    onChange={(e) => setOtherRequests(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
            </div>
        </div>


        <div className="flex justify-between mt-10">
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0 || isLoading}
            className="px-6 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Tilbage
          </button>
          
          {step < totalSteps - 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="px-6 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 shadow transition"
            >
              Næste
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 disabled:bg-emerald-300 shadow transition flex items-center"
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isLoading ? 'Genererer...' : 'Generér Madplan'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
