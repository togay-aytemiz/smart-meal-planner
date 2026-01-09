# Smart Meal Planner - Onboarding Flow

## Design Philosophy
**Progressive Disclosure**: Gather minimum viable data for an impressive "sample plan" to convert users. Detailed preferences (exact gym hours, specific allergies per child) are collected in-app settings post-conversion.

---

## Flow Overview

| Phase | Screens | Purpose |
|-------|---------|---------|
| 1. Hook | Welcome | Value prop, set expectations |
| 2. Foundation | Scope → Dietary → Goals | Core branching & constraints |
| 3. Lifestyle | Activity → Cooking → Schedule | Time & routine patterns |
| 4. Family Details | Members → Quick Prefs | *Only if Family selected* |
| 5. Magic Moment | Loading → AI Reveal | Prove personalization value |
| 6. Commitment | Paywall | Convert while interest peaks |
| 7. Security | Account Creation | Save data & subscription |
| 8. Kickstart | Fridge Scan | Immediate utility |

---

## Detailed Screens

### PHASE 1: Hook & Context

#### Screen 1: Welcome & Value Prop
- **Headline**: "Meal planning on autopilot, tailored to your real life."
- **Brief**: "An AI planner that adapts to your schedule, dietary needs, and what's in your fridge."
- **Visual**: Clean food imagery with subtle calendar icons
- **CTA**: "Build My Personalized Plan"

---

### PHASE 2: The Foundation Quiz

#### Screen 2: The Scope (Who are we feeding?)
- **Headline**: "Who are we planning for?"
- **Options**:
  - 🧑 **Just Me** - "Focus on my goals and schedule"
  - 👨‍👩‍👧‍👦 **My Household** - "Plan for multiple schedules and tastes"
- **Branching**: Family → shows Phase 4 later

#### Screen 3: Dietary Requirements
- **Headline**: "Any dietary requirements we must know?"
- **Brief**: "Select all that apply to keep everyone safe."
- **Multi-select tags**:
  - Gluten-Free, Dairy-Free, Nut Allergy, Shellfish Allergy
  - Vegetarian, Vegan, Pescatarian
  - Halal, Kosher
  - Low-Carb, Keto *(added)*
  - None

#### Screen 4: Food Philosophy & Goals
- **Headline**: "What's your primary food goal?"
- **Single-select options**:
  - ⏱️ **Save Time** - Quick recipes, minimal prep, batch cooking
  - 🥗 **Eat Healthier** - Balanced macros, whole foods
  - ⚖️ **Weight Management** - Calorie-conscious planning
  - ♻️ **Reduce Waste** - Use existing ingredients first
  - 👶 **Family Friendly** - Crowd-pleasers for picky eaters *(only if Family)*

---

### PHASE 3: Routine & Lifestyle

#### Screen 5: Cooking Reality Check
- **Headline**: "Be honest—how much do you actually want to cook?"
- **Options**:
  - 🍕 **Almost Never** - Super fast assembly or takeout ideas
  - 🍳 **A Few Times a Week** - 3-4 easy dinners
  - 👨‍🍳 **Every Night** - I love cooking and have time

> **Removed**: Activity Level screen. Feels like a fitness app. Can infer from "gym in schedule" or ask in settings if needed for calorie calculations.

#### Screen 6: Schedule Disruptors
- **Headline**: "What usually throws off your meal plans?"
- **Multi-select checkboxes**:
  - 💼 Unpredictable work hours
  - 🏋️ Gym / Workout sessions
  - 🏫 Kids' activities / School pickups *(if Family)*
  - 🏠 Hybrid work (home some days, office others)
  - ✈️ Frequent travel
  - 👴 Caring for elderly parents *(added)*

---

### PHASE 4: Family Details *(Only if "Family" selected)*

> **Added Phase**: Your core differentiator is per-person personalization. We need to know WHO is in the household.

#### Screen 7: Household Members
- **Headline**: "Who's in your household?"
- **Add members with quick profiles**:
  - Name / Nickname
  - Role: Self, Partner, Child, Parent, Nanny, Other
  - Age range: Infant, Toddler, Child (4-12), Teen, Adult, Senior
- **Visual**: Simple avatar cards, "+" to add more
- **Limit**: Up to 8 members
- **Brief**: "We'll personalize meals based on everyone's needs."

#### Screen 8: Quick Member Preferences *(Optional, can skip)*
- **Headline**: "Any picky eaters or special needs?"
- **Per-member quick tags** (showing each member's avatar):
  - Picky eater
  - Big appetite
  - Light eater
  - Has own dietary restriction *(links to detailed settings)*
- **CTA**: "Continue" / "I'll set this up later"

---

### PHASE 5: The Magic Moment

#### Screen 9: Processing State
- **Visual**: Animated data points connecting—schedules, ingredients, calendars merging
- **Headline**: "Analyzing your routine..."
- **Cycling text**:
  - "Balancing work schedule..."
  - "Factoring in gym days..."
  - "Finding quick recipes for busy nights..."
  - "Optimizing for [Partner]'s preferences..." *(if Family)*
  - "Planning kid-friendly options for [Child name]..." *(if Family)*

#### Screen 10: AI Reveal (The Aha! Moment)
- **Visual**: Blurred weekly calendar background, one "Day" card highlighted
- **Headline**: "Your personalized week is ready!"
- **Brief**: "Based on your goal to [Goal] and your busy [schedule context]..."
- **Sample Day Card**:
  - 🌅 **Breakfast**: Quick Oatmeal *(Because you have an early meeting)*
  - ☀️ **Lunch**: Leftover Chicken Salad *(Utilizing last night's dinner)*
  - 🌙 **Dinner**: 20-Min Sheet Pan Fajitas *(Because Tuesday is gym day)*
  - 👶 *(If child)*: "Kid-friendly portion prepared separately"
- **CTA**: "Unlock Full Weekly Plan"

---

### PHASE 6: The Commitment

#### Screen 11: Subscription Offer
- **Headline**: "Start eating better, stress-free."
- **Brief**: "Adaptive weekly plans, automated grocery lists, and pantry tracking."
- **Pricing**:
  - 💎 **Annual** (Best Value): $X/year → $Y/month equivalent. 7-day free trial.
  - 📅 **Monthly**: $Z/month
- **CTA**: "Start My 7-Day Free Trial"
- **Fine print**: "Cancel anytime before trial ends"

---

### PHASE 7: Account Security

#### Screen 12: Create Account
- **Headline**: "Save your profile"
- **Brief**: "Sync your plan across devices."
- **Options**:
  - Continue with Apple
  - Continue with Google
  - Email + Password
- **CTA**: "Complete Registration"

---

### PHASE 8: Post-Onboarding Kickstart

#### Screen 13: Fridge Scan Intro
- **Headline**: "Let's see what you already have."
- **Brief**: "Scan your fridge or pantry. We'll suggest recipes using those items first."
- **Visual**: Fridge icon with camera overlay
- **CTA**: "Open Camera"
- **Skip**: "I'll add items manually later"

#### Screen 14: Camera View
- **Visual**: Full-screen camera with overlay bounding box
- **Brief**: "Point at shelves or ingredients. Hold steady."
- **Action**: User takes photo → scanning animation

#### Screen 15: Inventory Confirmation
- **Headline**: "Here's what we found"
- **Visual**: Editable list of detected items with quantities
- **Actions**: Remove (x), Edit, "+ Add Item Manually"
- **CTA**: "Finish & View My Meal Plan"

→ **User lands on Dashboard with populated weekly plan**

---

## Key Changes from Original

### ✅ Added
1. **Phase 4 (Family Details)** - Core differentiator for per-person personalization
2. **Member roles & ages** - Essential for appropriate meal suggestions
3. **Quick member preferences** - Picky eater flags without overwhelming
4. **Low-Carb/Keto** dietary option
5. **"Caring for elderly"** schedule disruptor
6. **Personalized cycling text** using family member names

### ❌ Removed
1. **Activity Level screen** - Feels like a fitness app, can be in settings

### 🔄 Deferred to In-App Settings
- Exact gym hours/days
- Detailed per-person dietary restrictions
- Specific work schedule times
- Meal type preferences (skip breakfast, office lunch)
- Cuisine preferences per person

---

## Conversion Optimization Notes

1. **The "Magic Moment" is critical** - The sample day card must feel eerily personalized
2. **Family member names in AI processing text** - Builds emotional connection
3. **Quick onboarding (< 3 min)** - Don't lose users before paywall
4. **Fridge scan AFTER paywall** - This is a "stickiness" feature, not a conversion feature
5. **Account creation AFTER payment intent** - Reduces friction at conversion point

---

## Screen Count Summary

| Path | Screens |
|------|---------|
| Individual | 12 screens |
| Family | 14 screens (+ 2 for family details) |

Total interaction time target: **2-3 minutes**
