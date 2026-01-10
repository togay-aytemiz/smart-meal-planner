# Smart Meal Planner - Product Requirements Document

## Overview

**Product Name:** Smart Meal Planner  
**Version:** 1.0  
**Last Updated:** January 9, 2026  
**Platform:** iOS & Android (React Native / Expo)

### Vision
An Ollie-inspired AI meal planner that learns each household member's preferences, generates weekly menus, builds grocery lists, and lets users refine plans via chat while reducing the mental load of daily food decisions.

### Problem Statement
Meal planning is a daily cognitive burden that compounds across family members with different schedules. Parents juggle gym times, office days, remote work, preschool pickups, and nanny schedules—all while trying to answer "What's for dinner?" The mental load of coordinating meals around varying routines is exhausting and time-consuming.

### Solution
An intelligent meal planner that:
- Learns each family member's routines, dislikes, and pantry constraints
- Generates weekly menus up to the upcoming Sunday
- Produces grocery lists based on menus and inventory
- Lets users modify plans via chat and remembers feedback

### Ollie-Inspired Experience
- How it works: collect preferences → generate menu + grocery list → user approves → adjustments via chat
- Core strengths to mirror: automated meal planning, smart grocery lists, and a clear approval loop

---

## User Personas

### Primary Persona: Busy Parent
- Managing household meals for 2-5 family members
- Each member has unique schedules and dietary preferences
- Values convenience and time-saving solutions
- Comfortable with mobile technology

### Secondary Persona: Individual User
- Health-conscious professional
- Variable schedule (gym days, work-from-home, office days)
- Wants meal plans aligned with fitness goals
- Prefers simple, personalized suggestions

---

## Onboarding Flow

> **Note:** Detailed onboarding questions will be defined in a separate document. The onboarding will collect:

### Household Setup
- Number of people in household
- Relationship/role for each member (self, spouse, child, nanny, etc.)
- Age range of each member

### Individual Routines (per person)
- Weekly schedule patterns:
  - Work days (office/remote/hybrid)
  - Gym/exercise times
  - School/preschool schedule
  - Special activities
- Routine variability indicators

### Dietary Preferences (per person)
- Dietary restrictions & allergies
- Food preferences (likes/dislikes)
- Cuisine preferences
- Cooking skill level
- Pantry-only preference (optional)

### Household Preferences
- Cooking time preferences (quick vs. elaborate)
- Kitchen equipment available
- Grocery shopping habits
- Budget considerations

---

## Core Features

### Tab Navigation
- **My Menu:** Today, tomorrow, and the rest of the week (up to Sunday)
- **Groceries:** Weekly shopping list (menu + pantry)
- **Cookbook:** Saved AI recipes (favorites)
- **Settings/Profile:** Preferences, household, and AI memory

### 1. My Menu (Menu Feed)

#### Weekly Menu View
- **Range:** Today through Sunday (max 7 days)
- **Cards:** Daily menu cards with hero image
- **Actions:** Replace, approve (chat modifications post-MVP)
- **Courses:** Minimum 3-course menu per day (ex: soup/main/salad or equivalent)

#### Schedule Context Bar
- Visual indicators showing each family member's status for the day
- Icons for: gym, office, remote, school, home
- Helps understand meal requirements at a glance

### 2. AI Meal Recommendation Engine (MVP)

#### Core Capabilities
- **Routine-Aware Planning:** 
  - Light meals before gym sessions
  - Quick meals on busy office days
  - Elaborate cooking on remote/weekend days
  - Kid-friendly options when children are home

- **Smart Suggestions:**
  - Learns family preferences over time
  - Balances nutrition across the week
  - Considers leftovers and ingredient reuse
  - Seasonal and regional recipe awareness

- **Personalization Layers:**
  - Global household preferences
  - Individual dietary needs
  - Ingredient dislikes/avoid list (per user)
  - Pantry-only mode (when enabled, Post-MVP)
  - Time-based constraints
  - Energy/nutrition goals

### 3. Weekly Meal Plan Generator (MVP)

#### Auto-Planning Flow
1. AI analyzes upcoming week's schedules
2. Generates balanced meal suggestions
3. Optimizes for:
   - Schedule constraints
   - Dietary requirements
   - Ingredient efficiency
   - Variety and nutrition

#### Override & Customization
- **Swap Meals:** One-tap replacement or chat-based changes
- **Lock Favorites:** Pin preferred meals to specific days
- **Regenerate:** Request new suggestions for any meal
- **Manual Entry:** Add custom meals or recipes

### 4. Family Member Management

#### Per-Person Profiles
- Individual routine calendars
- Personal dietary preferences
- Allergy/restriction flags
- Meal preference history

#### Routine Flexibility
- Support for changing schedules:
  - Gym time variations
  - Work schedule changes
  - School holidays
  - Special events
- Easy temporary overrides
- Recurring pattern learning

### 5. Recipe Discovery & Management

#### Recipe Features
- AI-generated recipes tailored to family (MVP)
- AI-generated hero image per recipe (Post-MVP)
- Step-by-step cooking instructions
- Serving size adjustments
- Nutritional information
- Prep/cook time estimates
- Dedicated recipe detail page (Ingredients / Instructions / Nutrition)
- Favorite/save to Cookbook

#### Customization
- Save favorite recipes
- Add personal recipes
- Rate and review meals
- Share within family

### 6. Smart Grocery List

#### Auto-Generated Lists
- Aggregated from weekly meal plan
- Organized by store sections
- Quantity calculations based on servings
- Ingredient consolidation
- Pantry-aware subtraction
- Manual add/edit items

#### Integration Options
- Export to shopping apps
- Share with family members
- Mark items as available at home
- Price estimation (future feature)

#### Delivery Integration (Future)
- Instacart integration
- Amazon Fresh integration
- Local grocery delivery

### 7. Inventory Management (New)

#### Photo Scanning
- Capture photos of fridge or pantry shelves
- AI extraction of ingredients (Image Processing)
- Auto-population of digital pantry

#### Digital Pantry
- Track available ingredients
- Prioritize recipes using existing stock (Waste Reduction)
- Manual add/edit capabilities

### 8. Chat Assistant (Recipe + Planning) (Post-MVP)
- Contextual chat attached to recipe and menu cards
- Accepts modifications (replace ingredient, avoid ingredient, adjust servings)
- Updates user memory and future prompt parameters

### 9. Notifications & Reminders

#### Meal Planning
- Weekly planning reminder (Sunday evening default)
- Daily meal overview (morning notification)
- Prep reminders for complex meals

#### Schedule-Based
- Contextual reminders based on routine
- "Gym day tomorrow - light dinner planned"
- "Kids home for lunch today"

---

## Technical Architecture

### Frontend
- **Framework:** React Native with Expo
- **State Management:** Context API + useReducer (native React)
- **Navigation:** Expo Router
- **Styling:** StyleSheet.create() (no NativeWind)
- **UI Library:** Custom components with design system

### Backend
- **Platform:** Firebase
- **Database:** Cloud Firestore
- **Authentication:** Firebase Auth (Email, Google, Apple)
- **Storage:** Firebase Storage (recipe images, user avatars)
- **Functions:** Firebase Cloud Functions (AI API calls)
- **AI Engine:** OpenAI / Claude API via Cloud Functions

### Recipe & AI Memory Storage
- **Recipes:** Store AI-generated recipes in Firestore for reuse and cost savings
- **Images:** Generate and store recipe images in Firebase Storage (Post-MVP)
- **User Memory:** Persist dislikes, swaps, and pantry-only preference to condition prompts (Post-MVP)

### Data Storage
- **Local:** AsyncStorage for offline access
- **Cloud:** Firestore for user profiles, preferences, meal history
- **Sync:** Firestore real-time listeners for family member sync

---

## Design System

### Visual Identity
Inspired by Ollie.ai's calm, modern aesthetic:

- **Style:** Clean, minimal, calming
- **Colors:** 
  - Warm neutrals (cream, soft whites)
  - Accent: Warm orange/coral
  - Supporting: Soft sand and muted browns
- **Typography:** Modern, readable, friendly
- **Imagery:** Appetizing food photography, illustrated icons

### UX Principles
1. **Reduce Mental Load:** Minimize decisions required
2. **Contextual Intelligence:** Show relevant info based on time/schedule
3. **Quick Actions:** One-tap for common operations
4. **Flexibility:** Easy to override AI suggestions
5. **Family-First:** Design for multi-person households

---

## MVP Scope

### Phase 1: Foundation
- [ ] Tab navigation shell (My Menu, Groceries, Cookbook, Settings)
- [ ] My Menu weekly view (today → Sunday)
- [ ] Manual meal assignment + basic swap
- [ ] Recipe detail page (ingredients/instructions)
- [ ] Grocery list from manual menus + manual add
- [ ] AI meal planning based on onboarding + weekly habits
- [ ] AI recipe generation tied to planned meals

### Phase 2: AI Integration
- [ ] AI chat modifications for menus/recipes
- [ ] Recipe image generation
- [ ] Pantry-only option in prompts

### Phase 3: Family Features
- [ ] Multi-member household support
- [ ] Per-person preferences
- [ ] Routine conflict resolution
- [ ] Family sharing

### Phase 4: Enhancement
- [ ] Smart grocery lists
- [ ] Notification system
- [ ] Recipe library
- [ ] Advanced AI learning

---

## Success Metrics

### Engagement
- Daily active users
- Weekly meal plans generated
- Meal swap rate (lower = better AI accuracy)
- Session duration

### User Satisfaction
- Onboarding completion rate
- Meal rating average
- NPS score
- Retention rate (7-day, 30-day)

### AI Performance
- Suggestion acceptance rate
- Schedule adherence accuracy
- Preference learning improvement

---

## Competitive Analysis

### Ollie.ai
**Strengths:**
- Beautiful, calming UI
- Family-focused approach
- Grocery delivery integration
- AI recipe generation

**Our Differentiation:**
- Deeper routine understanding
- Per-person schedule awareness
- More granular personalization
- Real-time schedule adaptation

### Other Competitors
- Mealime, Paprika, Whisk
- Generally lack routine-aware planning
- Limited family member individualization

---

## Future Roadmap

### Short-term
- Third-party calendar integration (Google, Apple)
- Pantry tracking
- Batch cooking suggestions
- Leftover management

### Medium-term
- Grocery delivery integrations
- Budget tracking and optimization
- Nutritional goal tracking
- Social features (meal sharing)

### Long-term
- Smart home integration (refrigerator cameras)
- Voice assistant support
- Restaurant recommendation for busy days
- Cooking equipment automation

---

## Open Questions

1. **Onboarding Depth:** How detailed should initial routine questions be vs. learning over time?
2. **AI Provider:** OpenAI, Claude, or custom model for meal planning?
3. **Monetization:** Subscription model, freemium, or one-time purchase?
4. **Localization:** Which regions/cuisines to support initially?
5. **Data Privacy:** How to handle family member data, especially for children?

---

## Appendix

### Glossary
- **Routine:** A recurring schedule pattern (e.g., "gym on Monday mornings")
- **Meal Slot:** A time-based meal opportunity (breakfast, lunch, dinner, snacks)
- **Schedule Context:** The combined routines of all family members for a given day
- **Override:** A manual change to an AI-generated suggestion

### References
- [Ollie.ai](https://ollie.ai) - Inspiration for UI/UX
- User research findings (to be added)
- Market analysis data (to be added)
