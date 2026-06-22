# Subscription Guilt Calculator

A bold, fun web app that shows people exactly how much money they're wasting on unused subscriptions.

## Project Structure

```
subscription-guilt/
├── app.py                  # Flask backend + scoring algorithm
├── requirements.txt        # Python dependencies
├── Procfile                # Render deployment
├── templates/
│   └── index.html          # Frontend HTML
├── static/
│   ├── css/style.css       # Bold dark styling
│   └── js/app.js           # Frontend logic + Chart.js
└── data/
    └── submissions.csv     # Auto-created, anonymous data for Power BI
```

## Run Locally

1. Install dependencies:
   pip install -r requirements.txt

2. Run the app:
   py app.py

3. Open browser at: http://localhost:5000

## Deploy to Render (Free)

1. Push this folder to a GitHub repo

2. Go to https://render.com and sign up free

3. Click "New" → "Web Service"

4. Connect your GitHub repo

5. Settings:
   - Build Command: pip install -r requirements.txt
   - Start Command: gunicorn app:app
   - Instance Type: Free

6. Click Deploy. Your site goes live in ~3 minutes.

## How the Guilt Score Works

- Score 0-100 based on cost per use
- Cost per use = monthly price / times used per month
- $20+ per use = 95 score (DEAD WEIGHT)
- $10-20 per use = 80 score (BARELY USED)
- $5-10 per use = 60 score (QUESTIONABLE)
- $2-5 per use = 35 score (DECENT USE)
- Under $1 per use = 5 score (WORTH IT)

## Power BI Dashboard

The app auto-saves anonymous data to data/submissions.csv.
Columns: timestamp, num_subscriptions, total_monthly, total_yearly, waste_amount, categories

Use this CSV to build Power BI dashboards showing:
- Average waste amount over time
- Most common subscription categories
- Average monthly spend by number of subscriptions
- Guilt score distribution across users
