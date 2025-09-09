export interface DayPlan {
  day: string;
  eaters: string[];
  cookingTime: number;
  noMeal: boolean;
}

export interface WeeklyData {
  feedback: string;
  days: DayPlan[];
  availableIngredients: string;
  requestedIngredients: string;
  otherRequests: string;
  pastedHistory: string;
}

export interface DocumentData {
  requirements: string;
  nutritionInfo: string;
  history: string;
}