import json
import math
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE_URL = "https://api.mfapi.in/mf"
WEIGHTS = {"oneYear": 0.2, "threeYear": 0.3, "fiveYear": 0.5}
TOP_FUNDS = [
    {"category": "Flexi Cap", "name": "Parag Parikh Flexi Cap Fund Direct Growth", "thesis": "Diversified equity allocation with an established long-term record.", "horizon": "5+ years"},
    {"category": "International", "name": "Kotak Quality Overseas Equity Active FOF Direct Growth", "schemeCode": "154287", "thesis": "International equity fund-of-funds exposure for a diversified satellite allocation.", "horizon": "7+ years"},
    {"category": "Mid Cap", "name": "HDFC Mid-Cap Opportunities Fund Direct Growth", "schemeCode": "118989", "thesis": "Higher-growth equity exposure for investors who can tolerate volatility.", "horizon": "7+ years"},
    {"category": "Small Cap", "name": "Nippon India Small Cap Fund Direct Growth", "thesis": "High-risk satellite allocation focused on smaller Indian companies.", "horizon": "7+ years"},
    {"category": "ELSS", "name": "Mirae Asset ELSS Tax Saver Fund Direct Growth", "thesis": "Equity-linked tax saver with the statutory three-year lock-in.", "horizon": "3+ years"},
    {"category": "Hybrid", "name": "ICICI Prudential Equity & Debt Fund Direct Growth", "thesis": "Equity and debt mix for a smoother path than pure equity.", "horizon": "5+ years"},
    {"category": "Index", "name": "UTI Nifty 50 Index Fund Direct Growth", "thesis": "Low-cost access to India's large-cap benchmark.", "horizon": "5+ years"},
]


def request_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "FundLens-DailyUpdater/1.0"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.load(response)


def parse_date(value):
    return datetime.strptime(value, "%d-%m-%Y").replace(tzinfo=timezone.utc)


def select_scheme(matches, requested_name):
    usable = [match for match in matches if not any(word in match["schemeName"].lower() for word in ("idcw", "dividend", "bonus"))]
    candidates = usable or matches
    growth = [match for match in candidates if "direct plan" in match["schemeName"].lower() and "growth" in match["schemeName"].lower()]
    pool = growth or candidates
    requested_words = [word for word in requested_name.lower().split() if len(word) > 2]
    return sorted(pool, key=lambda match: (-sum(word in match["schemeName"].lower() for word in requested_words), match["schemeName"]))[0]


def annualized_return(history, latest_date, latest_nav, years):
    try:
        target_date = latest_date.replace(year=latest_date.year - years)
    except ValueError:
        target_date = latest_date.replace(year=latest_date.year - years, day=28)
    previous = next((entry for entry in history if entry["date"] <= target_date), None)
    if not previous or previous["nav"] <= 0 or latest_nav <= 0:
        return None
    actual_years = (latest_date - previous["date"]).days / 365.25
    return (math.pow(latest_nav / previous["nav"], 1 / actual_years) - 1) * 100


def load_fund(fund):
    scheme_code = fund.get("schemeCode")
    scheme_name = fund["name"]
    if not scheme_code:
        matches = request_json(f"{BASE_URL}/search?q={urllib.parse.quote(fund['name'])}")
        if not matches:
            requested_words = [word for word in fund["name"].lower().split() if len(word) > 2]
            all_schemes = request_json(BASE_URL)
            matches = [
                match for match in all_schemes
                if sum(word in match["schemeName"].lower() for word in requested_words[:4]) >= 3
            ]
        if not matches:
            raise RuntimeError(f"No scheme matched {fund['name']}")
        scheme = select_scheme(matches, fund["name"])
        scheme_code = scheme["schemeCode"]
        scheme_name = scheme["schemeName"]

    payload = request_json(f"{BASE_URL}/{scheme_code}")
    history = sorted(
        [
            {"date": parse_date(entry["date"]), "nav": float(entry["nav"])}
            for entry in payload.get("data", [])
            if float(entry["nav"]) > 0
        ],
        key=lambda entry: entry["date"],
        reverse=True,
    )
    if not history:
        raise RuntimeError(f"No NAV history available for {scheme_name}")

    latest = history[0]
    result = {
        **fund,
        "name": scheme_name,
        "schemeCode": str(scheme_code),
        "category": payload.get("meta", {}).get("scheme_category", fund["category"]),
        "oneYear": annualized_return(history, latest["date"], latest["nav"], 1),
        "threeYear": annualized_return(history, latest["date"], latest["nav"], 3),
        "fiveYear": annualized_return(history, latest["date"], latest["nav"], 5),
        "navDate": latest["date"].date().isoformat(),
    }
    available = [(key, WEIGHTS[key]) for key in WEIGHTS if result[key] is not None]
    total_weight = sum(weight for _, weight in available)
    result["score"] = sum(result[key] * weight for key, weight in available) / total_weight if available else None
    return result


def add_ratings(funds):
    scores = sorted((fund["score"] for fund in funds if fund["score"] is not None), reverse=True)
    for fund in funds:
        if fund["score"] is None:
            fund["rating"] = 0
            continue
        rank = scores.index(fund["score"])
        percentile = 1 if len(scores) == 1 else 1 - rank / (len(scores) - 1)
        fund["rating"] = max(1, min(5, math.ceil(percentile * 5)))


output = Path(__file__).resolve().parents[2] / "top-funds.json"
funds = [load_fund(fund) for fund in TOP_FUNDS]
add_ratings(funds)
output.write_text(
    json.dumps({"generatedAt": datetime.now(timezone.utc).isoformat(), "funds": funds}, indent=2) + "\n",
    encoding="utf-8",
)
print(f"Wrote {len(funds)} funds to {output}")
