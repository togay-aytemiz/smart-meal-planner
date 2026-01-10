/**
 * Onboarding Data Types
 * Shared types between client and functions
 */

export interface OnboardingProfile {
  name: string;
  avatarUrl?: string;
}

export interface HouseholdMember {
  id: string;
  name: string;
  role: "self" | "spouse" | "child" | "parent" | "nanny" | "other";
  ageRange?: "infant" | "toddler" | "child" | "teen" | "adult" | "senior";
  routines?: WeeklyRoutine;
}

export interface RoutineDay {
  type: "office" | "remote" | "gym" | "school" | "off";
  gymTime?: "morning" | "afternoon" | "evening" | "none";
  officeMealToGo?: "yes" | "no";
  officeBreakfastAtHome?: "yes" | "no";
  schoolBreakfast?: "yes" | "no";
  remoteMeals?: ("breakfast" | "lunch" | "dinner")[];
  excludeFromPlan?: boolean;
}

export interface WeeklyRoutine {
  monday: RoutineDay;
  tuesday: RoutineDay;
  wednesday: RoutineDay;
  thursday: RoutineDay;
  friday: RoutineDay;
  saturday: RoutineDay;
  sunday: RoutineDay;
}

export interface DietaryInfo {
  restrictions: string[];
  allergies: string[];
}

export interface CuisinePreferences {
  selected: string[];
}

export interface CookingPreferences {
  timePreference: "quick" | "balanced" | "elaborate";
  skillLevel: "beginner" | "intermediate" | "expert";
  equipment: string[];
}

export interface OnboardingData {
  profile: OnboardingProfile;
  householdSize: number;
  members: HouseholdMember[];
  routines: WeeklyRoutine;
  dietary: DietaryInfo;
  cuisine: CuisinePreferences;
  cooking: CookingPreferences;
}
