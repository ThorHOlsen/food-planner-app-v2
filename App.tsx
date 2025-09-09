import React, { useState, useEffect } from 'react';
import { generateMealPlan } from './services/geminiService.ts';
import { getDocuments, saveDocuments } from './services/googleDriveService.ts';
import { MealPlannerForm } from './components/MealPlannerForm.tsx';
import { LoadingView } from './components/LoadingView.tsx';
import { MealPlanDisplay } from './components/MealPlanDisplay.tsx';
import { type WeeklyData, type DocumentData } from './types.ts';
import { CogIcon } from './components/icons.tsx';

// --- Default Data ---
const defaultDocuments: DocumentData = {
  requirements: `
**Ingredienser:**
- Der må ikke indgå stærkt forarbejdede fødevarer.
- Råvarer skal være hele og uprocesserede.
- Der skal kun bruges ekstra jomfru olivenolie, hvis der skal bruges olier.
- Ingen light produkter
- Intet raffineret sukker
- Retterne må ikke indeholde oksekød eller lammekød.

**Næringsværdier:**
- Kulhydratindtaget skal skal være lavt.
- Kulhydrater fra brød, pasta og ris skal minimeres. Og hvis det er med er det kun fuldkorn.
- Prioriter sunde fedtstoffer (eksempelvis olivenolie, avocado, nødder, fede fisk og smør)
- Prioriter protein af høj kvalitet (æg, fisk, kød, fjerkræ, evt mejeriprodukter af god kvalitet)
- Vælg primært grøntsager med lavt glykæmisk indhold
- Alle familiemedlemmer skal have tilstrækkeligt af Vitamin A, vitamin B, vitamin C, vitamin D og vitamin E set over hele ugen.
- Ost må maks. udgøre 10% af kalorierne og bruges maks. 2 gange pr. uge.

**Smag og måltidssammensætning**
- Det skal være varierede retter fra mange forskellige køkkener.
- Der må gerne være masser af smag i retterne - dvs ikke nødvendigvis børnevenligt.
- Der skal være stor variation i de forskellige retter.
- Mindst 1 ret hver uge skal komme fra enten det indiske, mellemøstlige eller sydøstasiatiske køkken.
- Hvert måltid skal helst bestå af minimum 3 dele: et hovedelement (ofte noget kød eller fisk) og noget tilbehør (ofte lidt grovere grøntsager, det kunne være kartofler, rodfrugter, ris, pasta eller lignende) og en salat eller anden sidedish. Derunder kan de enkelte måltider også indeholde dressinger eller andet tilbehør.
- Hovedelementet af retten, må ikke være en del af madplanen for de seneste 2 måneder.

**Praktik:**
- Råvarer skal i videst muligt omfang være tilgængelige i almindelige supermarkeder.
- Hvis jeg har mindre end 10 minutter til at lave mad en dag, så skal denne dags ret være rester fra en af de foregående dage. Hvis dette ikke er muligt, lav da en ret som kan laves på maks 10 minutter.
- Følgende råvarer er basisvarer og skal ikke skrives på indkøbslisten: Olie, eddike, salt, peber, tørrede krydderier, mayonnaise, bouillon, sennep, ketchup, remoulade.

**Andet:**
- Det skal være klimavenligt.
- Råvarer skal være sæsonbestemte.
  `.trim(),
  nutritionInfo: `
| Medlem | Alder/Årgang | Køn    | Kropsvægt (kg) | Kalorier  | Protein (g) | Fibre (g) | Grøntsager (g) | Sunde fedtstoffer (g) | Omega-3 (g) | Vitamin A (µg) | Vitamin C (mg) | Vitamin D (µg) | Vitamin E (mg) | Calcium (mg) | Jern (mg) | Magnesium (mg) | Kalium (mg)  | B-12 vitamin |
| :----- | :----------- | :----- | :------------- | :-------- | :---------- | :-------- | :------------- | :-------------------- | :---------- | :------------- | :------------- | :------------- | :------------- | :----------- | :-------- | :------------- | :----------- | :----------- |
| Thor   | 1982         | Mand   | 80             | 700-900   | 50-55       | 12        | 250-300        | 15-20                 | 1.5-2       | 350-500        | 40-60          | 5-7            | 4-6            | 300-400      | 4-6       | 120-150        | 1500-2000    | 1.5-2        |
| Line   | 1982         | Kvinde | 55             | 500-700   | 35-40       | 12        | 250-300        | 15-20                 | 1.5-2       | 350-500        | 40-60          | 5-7            | 4-6            | 300-400      | 4-6       | 120-150        | 1500-2000    | 1.5-2        |
| Vigga  | 2009         | Pige   | 55             | 500-700   | 35-40       | 10        | 200-250        | 12-15                 | 1.2-1.5     | 300-400        | 30-50          | 5-7            | 4-6            | 300-400      | 3-5       | 100-130        | 1300-1700    | 1.5-2        |
| Harry  | 2013         | Dreng  | 35             | 400-600   | 20-25       | 8         | 200-250        | 10-15                 | 1-1.5       | 300-400        | 30-50          | 5-7            | 3-5            | 300-400      | 3-5       | 100-130        | 1300-1700    | 1-1.5        |
| Yrsa   | 2016         | Pige   | 30             | 300-500   | 18-22       | 6         | 150-200        | 8-12                  | 0.8-1.2     | 250-350        | 25-40          | 5-7            | 3-4            | 250-350      | 2.5-4     | 80-110         | 1100-1500    | 1-1.5        |
  `.trim(),
  history: `
- Uge 34: Kylling i karry, Lasagne med spinat
- Uge 33: Fiskefrikadeller med rugbrød, Boller i karry
- Uge 32: Wok med kylling og grøntsager, Hjemmelavet pizza
- Uge 31: Tortillas med hakket svinekød, Mørbradbøffer med bløde løg
  `.trim()
};


// --- Settings Modal Component ---
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentData;
  setDocuments: React.Dispatch<React.SetStateAction<DocumentData>>;
}

type TabKey = 'requirements' | 'nutritionInfo' | 'history';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, documents, setDocuments }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('requirements');

  if (!isOpen) return null;

  const handleDocChange = (field: keyof DocumentData, value: string) => {
    setDocuments(prev => ({ ...prev, [field]: value }));
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'requirements', label: 'Krav til madplan' },
    { key: 'nutritionInfo', label: 'Næringsindhold' },
    { key: 'history', label: 'Historik' },
  ];

  const TabButton: React.FC<{ tabKey: TabKey; label: string }> = ({ tabKey, label }) => (
    <button
      onClick={() => setActiveTab(tabKey)}
      className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
        activeTab === tabKey
          ? 'bg-emerald-500 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800">Indstillinger</h2>
            <p className="text-slate-500 text-sm mt-1">Rediger de dokumenter, AI'en bruger til at generere din madplan.</p>
        </div>
        
        <div className="p-6 flex-grow overflow-y-auto">
          <div className="flex space-x-2 border-b border-slate-200 mb-6 pb-4">
            {tabs.map(tab => <TabButton key={tab.key} tabKey={tab.key} label={tab.label} />)}
          </div>
          
          <div className="space-y-6">
            {activeTab === 'requirements' && (
              <div>
                <label htmlFor="requirements" className="block text-lg font-medium text-slate-700 mb-2">Krav til madplan</label>
                <textarea
                  id="requirements"
                  rows={12}
                  value={documents.requirements}
                  onChange={e => handleDocChange('requirements', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
            )}
            {activeTab === 'nutritionInfo' && (
              <div>
                <label htmlFor="nutrition" className="block text-lg font-medium text-slate-700 mb-2">Næringsindhold og vitaminer</label>
                <textarea
                  id="nutrition"
                  rows={12}
                  value={documents.nutritionInfo}
                  onChange={e => handleDocChange('nutritionInfo', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
            )}
             {activeTab === 'history' && (
              <div>
                <label htmlFor="history" className="block text-lg font-medium text-slate-700 mb-2">Historik for madplaner</label>
                 <p className="text-sm text-slate-500 mb-3">Tilføj tidligere retter her for at undgå gentagelser. AI'en vil ikke foreslå retter fra denne liste.</p>
                <textarea
                  id="history"
                  rows={12}
                  value={documents.history}
                  onChange={e => handleDocChange('history', e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 transition"
                  placeholder="Eksempel:&#10;- Uge 34: Kylling i karry, Lasagne med spinat&#10;- Uge 33: Fiskefrikadeller med rugbrød, Boller i karry"
                />
              </div>
            )}
          </div>
        </div>

        <div className="text-right p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 shadow transition"
          >
            Luk
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Main App Component ---
const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mealPlan, setMealPlan] = useState<string | null>(null);
  const [lastSubmittedData, setLastSubmittedData] = useState<WeeklyData | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentData>(defaultDocuments);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load documents from our service on initial mount
  useEffect(() => {
    getDocuments(defaultDocuments).then(docs => {
      setDocuments(docs);
      setIsInitialized(true);
    });
  }, []);

  // Save documents back to the service whenever they change
  useEffect(() => {
    if (isInitialized) {
      saveDocuments(documents);
    }
  }, [documents, isInitialized]);


  const handleFormSubmit = async (data: WeeklyData) => {
    setIsLoading(true);
    setError(null);
    setMealPlan(null);
    setLastSubmittedData(data);
    
    try {
      const result = await generateMealPlan(data, documents);
      if (result.startsWith('An error occurred')) {
         setError(result);
      } else {
         setMealPlan(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanUpdate = async (newFeedback: string) => {
    if (!lastSubmittedData) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await generateMealPlan(lastSubmittedData, documents, newFeedback);
      if (result.startsWith('An error occurred')) {
        setError(result);
      } else {
        setMealPlan(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setIsLoading(false);
    setError(null);
    setMealPlan(null);
    setLastSubmittedData(null);
  };

  const handleFinalizePlan = (plan: string) => {
    // 1. Extract week title
    const weekMatch = plan.match(/^# (Uge \d+)/m);
    if (!weekMatch) return;
    const weekTitle = weekMatch[1]; // e.g., "Uge 35"

    // 2. Extract dishes from the meal plan section
    const planSectionMatch = plan.match(/## \d+\. Måltidsplan for ugen\n([\s\S]*?)(?=\n##|$)/m);
    if (!planSectionMatch) return;
    
    const planLines = planSectionMatch[1].split('\n');
    const dishes = planLines
        .map(line => {
            const dishMatch = line.match(/:\s*(.*)/);
            return dishMatch ? dishMatch[1].trim() : null;
        })
        .filter((dish): dish is string => !!dish && !/rester/i.test(dish) && !/ingen madplan/i.test(dish));

    if (dishes.length === 0) return;

    // 3. Create new history line
    const newHistoryLine = `- ${weekTitle}: ${dishes.join(', ')}`;
    
    // 4. Update documents state
    setDocuments(prevDocs => {
        const existingHistoryLines = prevDocs.history.split('\n').filter(line => line.trim() !== '');
        
        // Filter out any existing entry for the current week to ensure the latest one is used
        const otherWeeksHistory = existingHistoryLines.filter(line => !line.startsWith(`- ${weekTitle}:`));

        const updatedHistory = [newHistoryLine, ...otherWeeksHistory];
        
        // Keep history to a reasonable length (e.g., 10 weeks, covers >2 months)
        const trimmedHistory = updatedHistory.slice(0, 10);
        
        return {
            ...prevDocs,
            history: trimmedHistory.join('\n')
        };
    });
  };
  
  const renderContent = () => {
    if (isLoading && !mealPlan) {
      return <LoadingView />;
    }
    if (error) {
      return (
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-red-200">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Der opstod en fejl</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"
            >
              Prøv igen
            </button>
        </div>
      );
    }
    if (mealPlan) {
      return (
        <MealPlanDisplay 
          plan={mealPlan} 
          onReset={handleReset} 
          onUpdate={handlePlanUpdate}
          isLoading={isLoading}
          onFinalize={handleFinalizePlan}
        />
      );
    }
    return <MealPlannerForm onSubmit={handleFormSubmit} isLoading={isLoading} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        documents={documents}
        setDocuments={setDocuments}
      />
      <header className="w-full max-w-4xl text-center mb-10 relative">
         <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">
          AI <span className="text-emerald-500">Madplanlægger</span>
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Få en personlig madplan, opskrifter og indkøbsliste på få minutter.
        </p>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-0 right-0 p-2 text-slate-400 hover:text-emerald-500 transition-colors"
          aria-label="Åbn indstillinger"
        >
          <CogIcon className="w-7 h-7" />
        </button>
      </header>
      <main className="w-full flex items-center justify-center">
        {renderContent()}
      </main>
      <footer className="text-center mt-10 text-slate-400 text-sm">
        <p>Powered by Gemini API</p>
      </footer>
    </div>
  );
};

export default App;
