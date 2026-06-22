from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import csv
import os
import json
import random
from datetime import datetime

app = Flask(__name__)
CORS(app)

DATA_FILE = "data/submissions.csv"
LEADERBOARD_FILE = "data/leaderboard.json"
HALL_OF_SHAME_FILE = "data/hall_of_shame.json"
AVG_AMERICAN_YEARLY = 900

POPULAR_SUBSCRIPTIONS = [
    {"name": "Netflix", "avg_price": 15.49, "category": "Entertainment"},
    {"name": "Spotify", "avg_price": 9.99, "category": "Music"},
    {"name": "Hulu", "avg_price": 17.99, "category": "Entertainment"},
    {"name": "Disney+", "avg_price": 13.99, "category": "Entertainment"},
    {"name": "Amazon Prime", "avg_price": 14.99, "category": "Shopping/Entertainment"},
    {"name": "Apple TV+", "avg_price": 9.99, "category": "Entertainment"},
    {"name": "HBO Max", "avg_price": 15.99, "category": "Entertainment"},
    {"name": "YouTube Premium", "avg_price": 13.99, "category": "Entertainment"},
    {"name": "Adobe Creative Cloud", "avg_price": 54.99, "category": "Productivity"},
    {"name": "Microsoft 365", "avg_price": 9.99, "category": "Productivity"},
    {"name": "Dropbox", "avg_price": 11.99, "category": "Storage"},
    {"name": "Google One", "avg_price": 2.99, "category": "Storage"},
    {"name": "iCloud+", "avg_price": 2.99, "category": "Storage"},
    {"name": "Duolingo Plus", "avg_price": 6.99, "category": "Education"},
    {"name": "Audible", "avg_price": 14.95, "category": "Education"},
    {"name": "LinkedIn Premium", "avg_price": 39.99, "category": "Professional"},
    {"name": "ChatGPT Plus", "avg_price": 20.00, "category": "AI/Productivity"},
    {"name": "Gym Membership", "avg_price": 40.00, "category": "Health"},
    {"name": "Peloton", "avg_price": 44.00, "category": "Health"},
    {"name": "Calm / Headspace", "avg_price": 12.99, "category": "Health"},
]

SAVAGE_ROASTS = {
    "Adobe Creative Cloud": [
        "You paid ${price} for Adobe and opened it {usage} times. You're basically sponsoring artists you'll never be.",
        "${price}/month for Adobe. {usage} uses. Picasso is rolling in his grave.",
        "Adobe Creative Cloud at ${price}. {usage} opens. That's ${cost_per_use} per moment of creative delusion."
    ],
    "Gym Membership": [
        "${price}/month to feel guilty about NOT going. Efficient.",
        "Gym membership: ${price}. Visits: {usage}. You're paying for the IDEA of fitness.",
        "${price} a month to own workout clothes. Respect the commitment to doing nothing."
    ],
    "LinkedIn Premium": [
        "${price} for LinkedIn Premium. {usage} uses. Those recruiters still aren't calling.",
        "You spent ${price} to be a 'featured applicant' that nobody clicks. Bold.",
        "${price}/month to feel professional while applying to jobs in your pajamas. {usage} times."
    ],
    "Peloton": [
        "${price}/month for a very expensive clothes hanger. {usage} rides.",
        "Peloton at ${price}. Used {usage} times. That's a ${cost_per_use} guilt trip per session.",
        "You own a Peloton. You use it {usage} times a month. The bike is judging you."
    ],
    "Duolingo Plus": [
        "Duo the owl is CRYING. ${price}/month. {usage} lessons. You're never learning Spanish.",
        "${price} to ignore a cartoon owl {usage} times a month. Hoo are you kidding.",
        "Duolingo Plus: ${price}. Sessions: {usage}. You will die monolingual."
    ],
    "Audible": [
        "${price}/month for audiobooks you bookmark and never finish. Very intellectual.",
        "Audible at ${price}. {usage} listens. Your unfinished book collection is impressive.",
        "You're paying ${price} to feel like a reader. {usage} books consumed. Keep telling yourself."
    ],
    "Calm / Headspace": [
        "You pay ${price} for a meditation app and you're too stressed to open it. {usage} times.",
        "${price}/month to NOT calm down. {usage} sessions. Ironic.",
        "Calm app. ${price}. {usage} uses. The chaos wins again."
    ],
    "default_zero": [
        "You paid ${price} for {name} and used it ZERO times. Incredible. Truly.",
        "${price}/month for {name}. Zero opens. You're just giving them money at this point.",
        "{name}: ${price}. Uses this month: 0. A masterclass in financial self-destruction.",
        "Not once. Not a single time did you open {name}. Yet here you are, ${price} lighter."
    ],
    "default_low": [
        "${price} for {name}, used {usage} times. That's ${cost_per_use} per use. Questionable life choices.",
        "{name} costs you ${cost_per_use} every single time you use it. Worth it?",
        "You use {name} {usage} times a month. At ${price}, that's ${cost_per_use} per session. Frank is concerned."
    ],
    "default_good": [
        "{name} at ${price}? Used {usage} times? Okay fine. You win this one.",
        "Frank grudgingly admits {name} is pulling its weight. ${cost_per_use}/use. Don't let it go to your head.",
        "{name}: actually decent ROI. ${cost_per_use}/use. Frank is shocked."
    ]
}

FRANK_INTROS = [
    "Alright, I looked at your finances. I need a drink.",
    "Frank here. I've seen bad. This is... something.",
    "I've been a financial advisor for 20 years. You've humbled me.",
    "Hi. I'm Frank. I used to have hope for people. Then I saw your subscriptions.",
    "Frank speaking. I reviewed your spending. I'm not angry. I'm just disappointed.",
    "Your results are in. Frank has left the building. Frank came back. Frank wishes he hadn't."
]

FRANK_OUTROS = {
    "high": [
        "Cancel everything. Start over. Call your mother.",
        "I'm sending your bank account my thoughts and prayers.",
        "You don't have a subscription problem. You have a memory problem.",
        "If you cancel the dead weight today, you'll save ${waste}/year. That's a flight. Or therapy. You need both."
    ],
    "medium": [
        "You're not the worst I've seen. But you're in the conversation.",
        "Some work needed. Frank believes in you. Barely.",
        "Cut the dead weight. Keep the rest. Drink water. Go outside."
    ],
    "low": [
        "You're... actually fine? Frank is confused. Frank expected worse.",
        "Genuinely impressed. You actually use what you pay for. Weird.",
        "Frank gives you a reluctant thumbs up. Don't make it weird."
    ]
}

def get_savage_roast(name, price, usage, cost_per_use):
    template_list = SAVAGE_ROASTS.get(name)
    if not template_list:
        if usage == 0:
            template_list = SAVAGE_ROASTS["default_zero"]
        elif cost_per_use >= 5:
            template_list = SAVAGE_ROASTS["default_low"]
        else:
            template_list = SAVAGE_ROASTS["default_good"]
    
    template = random.choice(template_list)
    return template.replace("{name}", name)\
                   .replace("{price}", str(price))\
                   .replace("{usage}", str(usage))\
                   .replace("{cost_per_use}", str(cost_per_use))

def calculate_guilt_score(price, usage):
    if usage == 0:
        return 100
    cost_per_use = price / usage
    if cost_per_use >= 20: return 95
    elif cost_per_use >= 10: return 80
    elif cost_per_use >= 5: return 60
    elif cost_per_use >= 2: return 35
    elif cost_per_use >= 1: return 15
    else: return 5

def get_guilt_label(score):
    if score >= 85: return "DEAD WEIGHT"
    elif score >= 65: return "BARELY USED"
    elif score >= 40: return "QUESTIONABLE"
    elif score >= 20: return "DECENT USE"
    else: return "WORTH IT"

def get_guilt_grade(score):
    if score >= 90: return "F"
    elif score >= 75: return "D"
    elif score >= 55: return "C"
    elif score >= 35: return "B"
    else: return "A"

def save_anonymous_data(subscriptions, total_monthly, total_yearly, waste_amount, overall_guilt, nickname):
    os.makedirs("data", exist_ok=True)
    file_exists = os.path.isfile(DATA_FILE)
    with open(DATA_FILE, "a", newline="") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["timestamp", "nickname", "num_subscriptions", "total_monthly",
                             "total_yearly", "waste_amount", "overall_guilt", "categories"])
        categories = list(set([s.get("category", "Other") for s in subscriptions]))
        writer.writerow([
            datetime.now().isoformat(), nickname, len(subscriptions),
            round(total_monthly, 2), round(total_yearly, 2),
            round(waste_amount, 2), overall_guilt, "|".join(categories)
        ])

def update_leaderboard(nickname, overall_guilt, waste_yearly, total_yearly):
    os.makedirs("data", exist_ok=True)
    try:
        with open(LEADERBOARD_FILE, "r") as f:
            board = json.load(f)
    except:
        board = {"top_wasters": [], "top_savers": []}

    entry = {
        "nickname": nickname,
        "guilt_score": overall_guilt,
        "waste_yearly": round(waste_yearly, 2),
        "total_yearly": round(total_yearly, 2),
        "date": datetime.now().strftime("%b %d")
    }

    board["top_wasters"].append(entry)
    board["top_wasters"] = sorted(board["top_wasters"], key=lambda x: x["guilt_score"], reverse=True)[:10]

    board["top_savers"].append(entry)
    board["top_savers"] = sorted(board["top_savers"], key=lambda x: x["guilt_score"])[:10]

    with open(LEADERBOARD_FILE, "w") as f:
        json.dump(board, f)

def update_hall_of_shame(results):
    os.makedirs("data", exist_ok=True)
    try:
        with open(HALL_OF_SHAME_FILE, "r") as f:
            shame = json.load(f)
    except:
        shame = {}

    for r in results:
        if r["usage"] == 0:
            name = r["name"]
            shame[name] = shame.get(name, 0) + 1

    with open(HALL_OF_SHAME_FILE, "w") as f:
        json.dump(shame, f)

def get_percentile(overall_guilt):
    # Simulated percentile — replace with real DB query later
    if overall_guilt >= 90: return 95
    elif overall_guilt >= 75: return 80
    elif overall_guilt >= 55: return 60
    elif overall_guilt >= 35: return 35
    else: return 15

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/calculate", methods=["POST"])
def calculate():
    data = request.get_json()
    subscriptions = data.get("subscriptions", [])
    nickname = data.get("nickname", "Anonymous")[:20]

    if not subscriptions:
        return jsonify({"error": "No subscriptions provided"}), 400

    results = []
    total_monthly = 0
    waste_monthly = 0

    for sub in subscriptions:
        name = sub.get("name", "Unknown")
        price = float(sub.get("price", 0))
        usage = int(sub.get("usage", 0))
        category = sub.get("category", "Other")
        billing = sub.get("billing", "monthly")

        if billing == "yearly": monthly_price = price / 12
        elif billing == "weekly": monthly_price = price * 4
        else: monthly_price = price

        monthly_price = round(monthly_price, 2)
        score = calculate_guilt_score(monthly_price, usage)
        label = get_guilt_label(score)
        grade = get_guilt_grade(score)
        cost_per_use = round(monthly_price / usage, 2) if usage > 0 else monthly_price
        roast = get_savage_roast(name, monthly_price, usage, cost_per_use)
        is_waste = score >= 65
        if is_waste: waste_monthly += monthly_price
        total_monthly += monthly_price

        results.append({
            "name": name, "monthly_price": monthly_price, "usage": usage,
            "category": category, "guilt_score": score, "guilt_label": label,
            "guilt_grade": grade, "roast": roast,
            "cost_per_use": cost_per_use, "is_waste": is_waste
        })

    results.sort(key=lambda x: x["guilt_score"], reverse=True)
    total_yearly = total_monthly * 12
    waste_yearly = waste_monthly * 12
    vs_average = round(total_yearly - AVG_AMERICAN_YEARLY, 2)
    overall_guilt = round(sum(r["guilt_score"] for r in results) / len(results))
    grade = get_guilt_grade(overall_guilt)
    percentile = get_percentile(overall_guilt)

    frank_intro = random.choice(FRANK_INTROS)
    if overall_guilt >= 70:
        frank_outro = random.choice(FRANK_OUTROS["high"]).replace("${waste}", str(round(waste_yearly)))
    elif overall_guilt >= 40:
        frank_outro = random.choice(FRANK_OUTROS["medium"])
    else:
        frank_outro = random.choice(FRANK_OUTROS["low"])

    save_anonymous_data(subscriptions, total_monthly, total_yearly, waste_monthly * 12, overall_guilt, nickname)
    update_leaderboard(nickname, overall_guilt, waste_yearly, total_yearly)
    update_hall_of_shame(results)

    return jsonify({
        "results": results,
        "summary": {
            "total_monthly": round(total_monthly, 2),
            "total_yearly": round(total_yearly, 2),
            "waste_monthly": round(waste_monthly, 2),
            "waste_yearly": round(waste_yearly, 2),
            "vs_average": vs_average,
            "overall_guilt": overall_guilt,
            "grade": grade,
            "percentile": percentile,
            "avg_american_yearly": AVG_AMERICAN_YEARLY,
            "num_subscriptions": len(results),
            "frank_intro": frank_intro,
            "frank_outro": frank_outro
        }
    })

@app.route("/api/popular", methods=["GET"])
def popular():
    return jsonify(POPULAR_SUBSCRIPTIONS)

@app.route("/api/leaderboard", methods=["GET"])
def leaderboard():
    try:
        with open(LEADERBOARD_FILE, "r") as f:
            return jsonify(json.load(f))
    except:
        return jsonify({"top_wasters": [], "top_savers": []})

@app.route("/api/hall-of-shame", methods=["GET"])
def hall_of_shame():
    try:
        with open(HALL_OF_SHAME_FILE, "r") as f:
            shame = json.load(f)
        sorted_shame = sorted(shame.items(), key=lambda x: x[1], reverse=True)[:5]
        return jsonify([{"name": k, "count": v} for k, v in sorted_shame])
    except:
        return jsonify([])

if __name__ == "__main__":
    app.run(debug=True, port=5000)
