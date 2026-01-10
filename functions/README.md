# Firebase Cloud Functions - Smart Meal Planner

## Setup Instructions

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Secrets

#### Local Development

1. Copy the example secret file:
```bash
cp .secret.local.example .secret.local
```

2. Edit `.secret.local` and add your API keys:
```bash
# OpenAI API Key (for image generation)
OPENAI_API_KEY=sk-your-actual-openai-key-here

# Gemini API Key (for recipe generation)
# Get from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your-actual-gemini-key-here
```

3. `.secret.local` is gitignored - never commit it!

#### Production (Firebase Functions Secrets)

1. Set secrets using Firebase CLI:
```bash
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
```

2. When prompted, paste your API keys

3. Deploy functions (secrets will be automatically included):
```bash
npm run deploy
```

### 3. Get Gemini API Key

1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to `.secret.local` (development) or set it as a secret (production)

**Model Used:** `gemini-3-flash-preview`

### 4. Build Functions

```bash
npm run build
```

### 5. Run Locally (Emulator)

```bash
npm run serve
```

### 6. Deploy to Production

```bash
npm run deploy
```

## Environment Variables

The functions will automatically use:
- **Development**: `.secret.local` file or `process.env`
- **Production**: Firebase Functions Secrets Manager

## API Keys Required

- **Gemini API Key**: For recipe generation (required)
- **OpenAI API Key**: For image generation (optional, only if generating images)

## Model Configuration

- **Recipe Generation**: Gemini `gemini-3-flash-preview`
- **Image Generation**: OpenAI DALL-E 3 (if enabled)
