# Pulse

A Twitter-style social platform with built-in cyberbullying screening. Every post and reply is screened by fine-tuned transformer models. Flagged content is blurred behind a "Show anyway" toggle, repeat offenders get warnings and then a ban, and an admin dashboard shows what the system is catching.

## Features

- Feed with posts, replies, likes, image upload and pagination
- Automatic screening of every post and reply
- Flagged content is blurred and carries a category badge with confidence
- Strike system: warning after each strike, ban at 3 strikes
- Admin dashboard with totals, flag rate, category chart and user table (ban / unban)
- "Try the moderator" panel to test any text without saving it or adding a strike
- JWT authentication, bcrypt password hashing, rate limiting

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Recharts |
| Server | Node.js, Express, JWT, bcrypt |
| Database | MongoDB with Mongoose |
| ML service | Python, PyTorch, Hugging Face Transformers, FastAPI, Uvicorn |
| Models | DistilBERT (English), MuRIL (Hindi), fine-tuned in house |

## Architecture

```
Browser (React)  ->  Express server (5000)  ->  MongoDB
                          |
                          v
                 ML service (FastAPI, 8001)
                 language detection -> DistilBERT / MuRIL
```

All moderation logic lives in `server/services/`. The routes and the frontend never know which model made a decision, so models can be retrained or replaced without touching them.

```
cyberbully-app/
  client/       React + Vite + Tailwind
  server/       Express API (routes, middleware, services, models)
  ml-service/   Training scripts, evaluation scripts and the inference service
```

## Moderation models

| | English model | Indic model |
|---|---|---|
| Base model | distilbert-base-uncased | google/muril-base-cased |
| Task | 6 classes: age, ethnicity, gender, religion, other_cyberbullying, not_cyberbullying | 2 classes: hate, not hate |
| Dataset | Kaggle "Cyberbullying Classification" (47,692 tweets) | India Hate Speech Superset |
| Split | 85/15 stratified, seed 42 | 85/15 stratified, seed 42 |

Both are trained with AdamW, learning rate 2e-5, weight decay 0.01, batch size 16, 3 epochs and a maximum sequence length of 128 tokens.

Language routing is done in `ml-service/serve.py`: text with 30 percent or more Devanagari letters goes to the MuRIL model, everything else goes to DistilBERT. Romanized Hinglish is detected by a word list.

A strike is added when content is flagged with a confidence of at least 0.60 and the author is not an admin.

## Results

English model on the validation set (7,154 tweets):

| Class | Precision | Recall | F1 |
|---|---|---|---|
| age | 0.994 | 0.982 | 0.988 |
| ethnicity | 0.984 | 0.975 | 0.979 |
| gender | 0.898 | 0.907 | 0.903 |
| religion | 0.944 | 0.977 | 0.960 |
| other_cyberbullying | 0.701 | 0.782 | 0.739 |
| not_cyberbullying | 0.728 | 0.628 | 0.674 |

Overall accuracy 0.876, macro F1 0.874.

Indic model, hate class, at several confidence thresholds:

| Threshold | Precision | Recall |
|---|---|---|
| 0.3 | 0.42 | 0.46 |
| 0.4 | 0.45 | 0.41 |
| 0.5 | 0.49 | 0.36 |
| 0.6 | 0.49 | 0.25 |

Hindi hate detection is a hard task and this model should be treated as a screening aid, not a final judge.

## Getting started

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB (local) or a MongoDB Atlas connection string

### 1. Clone

```bash
git clone https://github.com/aryan00417/cyberbully-app.git
cd cyberbully-app
```

### 2. Train or add the models

The trained model folders are large and are not stored in this repository. Create them by training:

```bash
cd ml-service
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
```

English model: download the Kaggle dataset "Cyberbullying Classification" (by andrewmvd), place the CSV at `ml-service/data/cyberbullying_tweets.csv`, then run:

```bash
python train.py
```

Indic model: the dataset is downloaded from Hugging Face, so log in first with `huggingface-cli login` if required, then run:

```bash
python train_hinglish.py
```

This creates `ml-service/model/` and `ml-service/model_hinglish/`.

### 3. Start the ML service

```bash
cd ml-service
venv\Scripts\activate
uvicorn serve:app --host 0.0.0.0 --port 8001
```

Check that both models loaded: `http://localhost:8001/health`

### 4. Configure and start the server

Create `server/.env`:

```
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/pulse
JWT_SECRET=change-this-to-a-long-random-string
ADMIN_EMAILS=admin@example.com
CUSTOM_MODEL_URL=http://localhost:8001/predict
```

```bash
cd server
npm install
npm run dev
```

### 5. Start the client

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. Sign up with an email listed in `ADMIN_EMAILS` to get the admin role.

## API overview

| Method and path | Access | Purpose |
|---|---|---|
| POST /v1/auth/signup, /login | public | create an account, log in |
| GET /v1/auth/me | user | fresh role and strike count |
| GET /v1/posts | public | feed (filters: all, flagged, media) |
| POST /v1/posts | user | create a post, moderated |
| DELETE /v1/posts/:id | author or admin | delete a post and its replies |
| POST /v1/posts/:id/like | user | like or unlike |
| GET /v1/comments/post/:postId | public | replies on a post |
| POST /v1/comments/post/:postId | user | add a reply, moderated |
| DELETE /v1/comments/:id | author or admin | delete a reply |
| POST /v1/moderate/preview | user | dry run, saves nothing, adds no strike |
| GET /v1/stats/public | user | community totals and category counts |
| GET /v1/stats | admin | dashboard numbers |
| GET /v1/admin/users | admin | all users with strikes and status |
| POST /v1/admin/users/:id/ban, /unban | admin | ban, or unban and reset strikes |

## Security notes

- Passwords are stored as bcrypt hashes.
- A ban is enforced by reading the user from the database on every request, so an existing token stops working as soon as the account is banned.
- Secrets live in environment variables. Never commit `.env`.

## References

- Sanh et al., "DistilBERT, a distilled version of BERT", 2019
- Khanuja et al., "MuRIL: Multilingual Representations for Indian Languages", 2021
- Kaggle, "Cyberbullying Classification" dataset by andrewmvd
- Tonneau et al., "HateDay: Insights from a Global Hate Speech Dataset Representative of a Day on Twitter", 2024
- Mandl et al., "Overview of the HASOC track at FIRE 2019"