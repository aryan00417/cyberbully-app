# Pulse — cyberbullying-flagging social app (MERN)

College review demo. Twitter-style feed where every comment gets checked by an
LLM moderation call before it's shown normally. Flagged comments render blurred
with a "Show anyway" toggle instead of being deleted.

## Stack
React (Vite) + Tailwind · Node/Express · MongoDB (Mongoose) · JWT auth ·
OpenRouter for moderation.

## 1. Prerequisites
- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)
- An OpenRouter API key: https://openrouter.ai/keys (free-tier models exist,
  e.g. `meta-llama/llama-3.1-8b-instruct`)

## 2. Setup

```bash
# server
cd server
cp .env.example .env
# edit .env: set MONGODB_URI, JWT_SECRET, OPENROUTER_API_KEY
npm install
npm run dev          # http://localhost:5000

# client (new terminal)
cd client
cp .env.example .env
npm install
npm run dev           # http://localhost:5173
```

If MongoDB isn't installed locally, the fastest option is a free Atlas
cluster — grab the connection string and paste it into `MONGODB_URI`.

## 3. Using it
1. Open http://localhost:5173, sign up, log in.
2. Post something, open replies on a post, add a comment.
3. Each comment shows "Checking..." for a moment (the LLM call), then either
   renders normally or shows blurred with a flagged badge + category.
4. Visit `/dashboard` for the flagged-comment breakdown and chart.

## 4. How moderation works
Every new comment hits `POST /api/comments/post/:postId`, which calls
`services/moderation.js` → `moderateText(text)` before saving. That function
sends the comment to OpenRouter with a system prompt asking for strict JSON:

```json
{ "flagged": true, "category": "gender", "confidence": 0.82 }
```

`category` is one of `religion | age | gender | ethnicity | harassment_other | none`,
matching the breakdown used in the literature review instead of a flat yes/no.
The result gets stored on the Comment document (`flagged`, `category`,
`confidence`) and is what drives both the feed badge and the dashboard stats.

**Why this matters for the review:** all moderation logic lives in one file
(`server/services/moderation.js`). Phase 2 (custom-trained model) means
replacing the inside of `moderateText()` with a call to a self-hosted model —
nothing else in the app changes, since routes only ever call that one
function.

## 5. Project structure
```
server/
  config/db.js          MongoDB connection
  models/                User, Post, Comment schemas
  middleware/auth.js     JWT verification
  services/moderation.js LLM moderation call (swap point for phase 2)
  routes/                auth, posts, comments, stats
  server.js              Express app entry

client/
  src/context/AuthContext.jsx   login/signup/logout, token in localStorage
  src/api/axios.js              axios instance, auto-attaches JWT
  src/components/               Navbar, PostComposer, PostCard, CommentThread, CommentItem
  src/pages/                    Feed, Login, Signup, Dashboard
```

## 6. Known simplifications (fine for this review)
- JWT stored in localStorage, no refresh tokens.
- No pagination — feed loads latest 50 posts.
- No image uploads.
- Moderation runs synchronously per comment (adds ~0.5–2s depending on the
  model) — that's intentional, it's what makes the "Checking..." state visible
  in the demo.
