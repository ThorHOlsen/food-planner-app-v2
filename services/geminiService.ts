// Fix: Add reference to vite/client to provide types for import.meta.env
/// <reference types="vite/client" />

import { GoogleGenAI } from "@google/genai";
import { type WeeklyData, type DocumentData } from '../types.ts';

// THIS IS THE DEFINITIVE FIX.
// This uses the modern, browser-safe method for Vite projects to access environment variables.
// It now correctly matches the `VITE_API_KEY` variable set in Vercel.
const apiKey = import.meta.env.VITE_API_KEY;

if (!apiKey) {
  // This error will be thrown if the VITE_API_KEY is not configured correctly in Vercel.
  throw new Error("VITE_API_KEY environment variable not found. Please ensure it is configured in your Vercel project settings.");
}

const ai = new GoogleGenAI({ apiKey });

const getNextWeekDates = (): { weekNumber: number; startDate: string; endDate: string } => {
  const today = new Date();
  const currentDay = today.getDay(); // Sunday is 0
  
  // Calculate the next Sunday. If today is Sunday, we plan for the *next* week.
  const daysUntilSunday = (7 - currentDay) % 7;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday + (daysUntilSunday === 0 ? 7 : 0)); // Always plan for the upcoming week
  nextSunday.setHours(0, 0, 0, 0); // Normalize to start of day

  const nextThursday = new Date(nextSunday);
  nextThursday.setDate(nextSunday.getDate() + 4);

  const formatDate = (date: Date) => `${date.getDate()}/${date.getMonth() + 1}`;
  
  // Calculate week number
  const firstDayOfYear = new Date(nextSunday.getFullYear(), 0, 1);
  const pastDaysOfYear = (nextSunday.getTime() - firstDayOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

  return {
    weekNumber,
    startDate: formatDate(nextSunday),
    endDate: formatDate(nextThursday),
  };
};

// Refactor: Split the prompt into system instructions and user content for clarity and adherence to best practices.
const getPromptParts = (weeklyData: WeeklyData, documents: DocumentData, regenerationFeedback?: string): { systemInstruction: string, contents: string } => {
  const weeklyPlannerDataString = weeklyData.days.map(day => {
    if (day.noMeal) {
      return `- ${day.day}: Ingen madplan for denne dag.`;
    }
    return `- ${day.day}: ${day.eaters.join(', ') || 'Ingen'} spiser med. Tilberedningstid: ${day.cookingTime} minutter.`;
  }).join('\n');

  const { weekNumber, startDate, endDate } = getNextWeekDates();
  
  // Use pasted history from the form if provided, otherwise use the saved history.
  const effectiveHistory = weeklyData.pastedHistory && weeklyData.pastedHistory.trim() !== '' 
    ? weeklyData.pastedHistory 
    : documents.history;

  const systemInstruction = `Du er en specialiseret AI-agent, der skal generere en ugentlig madplan. Din opgave er at levere en komplet pakke, der består af en madplan, ernæringsoversigt, opskrifter og en indkøbsliste.
    
    Her er dine instruktioner, som skal følges præcist:

    1. Brug udelukkende de data og kilder, som brugeren angiver i prompten.
    
    Kilde "Krav til madplan":
    ${documents.requirements}

    Kilde "Næringsindhold og vitaminer i aftensmad til madplan":
    ${documents.nutritionInfo}

    Kilde "Næringsindhold af råvarer":
    Brug udelukkende data fra dette Google Sheet til alle næringsberegninger: https://maddata.dk/. Ignorer alle andre kilder til næringsdata.

    2. Generér madplanen
    Udarbejd en madplan for aftensmad fra søndag til torsdag.
    Krav til madplan:
    - Retterne skal være tilpasset de specifikke tidsrammer og ønsker fra "Weekly Meal Planner Data".
    - Retterne skal overholde ALLE regler specificeret i "Krav til madplan". Dette er et absolut krav, som ikke kan fraviges. Især reglen om INTET OKSEKØD.
    - Tag højde for brugerens "Ønskede ingredienser/retter" og "Andre kommentarer".
    - Hvis en dag er markeret med "Ingen madplan", skal du skrive dette i planen og ikke generere en ret.
    - Hvis tilberedningstiden for en dag er 10 minutter, betyder det, at der skal spises rester. Planlæg ikke en ny ret for den dag.
    - **Portionsberegning for Rester:** Hvis en ret skal bruges til rester dagen efter (fordi dagen efter har en tilberedningstid på 10 minutter), skal du beregne det samlede antal portioner ved at lægge antallet af spisende gæster fra *begge* dage sammen. Eksempel: Hvis der er 4 personer, der spiser på tilberedningsdagen, og 3 personer, der spiser rester dagen efter, skal opskriften laves til i alt 7 portioner. Angiv dette tydeligt i opskriften.
    - Prioritér at bruge de råvarer, der er angivet som tilængelige ("Råvarer som brugeren allerede har til rådighed").
    - Lav en fuldstændig beregning af næringsværdi for alle måltider, inkluderende alle råvarer, baseret på Kilde "Næringsindhold af råvarer".
    - Retterne skal følge kravene i "Næringsindhold og vitaminer i aftensmad til madplan".
    - Der skal ikke være nogle retter, som vi har lavet de sidste 2 måneder (brug historikken). Dette er for at sikre så stor smagsvarians som muligt.
    - Hvis måltiderne ikke lever op til kravene, startes der forfra med "2. Generér madplanen".
    
    3. Generer ernæringstabeller:
    For hver ret:
    - Lav en tabel i Markdown med kolonner: Ingrediens | Mængde (g/ml) | Kalorier | Protein (g) | Kulhydrat (g) | Fedt (g)
    - Sidste række: SUM for hele retten.
    - Skriv separat kalorier og protein pr. portion.
    - Én decimal på alle tal.
    - Vis som tabel.
    - Vigtigt: Dobbelttjek alle dine ernæringsberegninger. Summen af ingrediensernes næringsindhold skal nøjagtigt matche totalen for retten. Portionens næringsindhold skal være totalen divideret med antallet af portioner. Vær ekstremt omhyggelig med disse beregninger, da nøjagtighed er afgørende.

    4. Obligatorisk Kvalitetstjek (INTERN PROCES):
    Før du genererer det endelige output, SKAL du udføre følgende selvkontrol:
    - **Konsistens:** Er ingredienserne og mængderne i opskrifterne identiske med dem, der bruges i ernæringstabellerne?
    - **Indkøbsliste:** Stemmer den samlede mængde på indkøbslisten overens med det, der kræves i opskrifterne (fratrukket de varer, brugeren allerede har)?
    - **Portioner:** Er portionsstørrelsen i opskriften korrekt beregnet, især for retter med rester?
    - **Regler:** Er ALLE regler fra "Krav til madplan" overholdt?
    Hvis du finder den mindste uoverensstemmelse, skal du rette den, FØR du fortsætter til næste trin.
    
    5. Generer de fire outputs i Markdown format. Følg denne struktur nøje for at sikre korrekt formatering ved kopiering til Google Docs:
    - Start med den følgende overordnede titel for ugen: # Uge ${weekNumber} (${startDate}-${endDate})
    - Brug derefter overskrifter (f.eks. "## 1. Måltidsplan for ugen") til at adskille de fire sektioner.
    - I opskrifter og indkøbsliste, brug fed skrift (f.eks. **Ingredienser:** eller **Frugt & Grønt:**) for underoverskrifter.
    
    De fire sektioner er:
    1. Måltidsplan for ugen: Præsenter madplanen med en ret for hver dag fra søndag til torsdag. For hver dag, angiv hvem der spiser med i parentes (f.eks. Mandag (Thor, Line, Vigga): ...). Hvis der er rester, eller ingen madplan, skal dette tydeligt fremgå.
    2. Opskrifter: Udskriv en fuld opskrift for hver ret.
    3. Indkøbsliste: Generér en samlet indkøbsliste for alle ugens retter. Listen skal sorteres i de specificerede kategorier (Frugt & Grønt, Kød & Fisk, Mejeri & Æg, Tørvarer, Andet) og må ikke inkludere de råvarer, der er angivet som tilængelige ("Råvarer som brugeren allerede har til rådighed"). Inkluder mængder af de enkelte råvarer. Tilføj en note til sidst med en overskrift som "**Forventes i husholdningen:**" og list de basisvarer (fra "Krav til madplan"), som ikke er på listen.
    4. Ernæringstabeller: Ernæringstabeller som beskrevet i punkt 3.`;

  let contents = `Her er data for madplanen, du skal generere:

- Feedback på sidste uges madplan: "${weeklyData.feedback || 'Ingen feedback givet.'}"

- "Weekly Meal Planner Data" (seneste række):
${weeklyPlannerDataString}

- Yderligere ønsker for ugen:
- Råvarer som brugeren allerede har til rådighed: "${weeklyData.availableIngredients || 'Ingen'}"
- Ønskede ingredienser/retter der skal indgå i planen: "${weeklyData.requestedIngredients || 'Ingen'}"
- Andre kommentarer til madplanen: "${weeklyData.otherRequests || 'Ingen'}"

- "Madplan og Indkøbsliste" (Historik):
${effectiveHistory}`;

  if (regenerationFeedback) {
    contents += `\n\nIMPORTANT: The user has reviewed the plan you just generated and provided the following feedback. Please generate a NEW, updated plan that incorporates these changes:\n"${regenerationFeedback}"`;
  }
  
  return { systemInstruction, contents };
};

export const generateMealPlan = async (weeklyData: WeeklyData, documents: DocumentData, regenerationFeedback?: string): Promise<string> => {
  try {
    const { systemInstruction, contents } = getPromptParts(weeklyData, documents, regenerationFeedback);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating meal plan:", error);
    if (error instanceof Error) {
        return `An error occurred while generating the meal plan: ${error.message}`;
    }
    return "An unknown error occurred while generating the meal plan.";
  }
};
