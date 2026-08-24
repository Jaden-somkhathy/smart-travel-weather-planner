import os
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("WEATHER_API_KEY")

app = FastAPI(title="WeatherPack Backend Server Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_api_key():
    if not API_KEY or API_KEY == "your_actual_api_key_here":
        raise HTTPException(status_code=500, detail="Backend configuration error: Missing API Key.")


def location_query_params(place: str | None, lat: float | None, lon: float | None):
    if lat is not None and lon is not None:
        return {"lat": lat, "lon": lon}
    if place:
        return {"q": place}
    raise HTTPException(status_code=400, detail="Provide either 'place' or both 'lat' and 'lon'.")


def generate_packing_list(temp_celsius: float, condition: str, activity: str) -> list:
    items = ["Passport / ID", "Phone Charger", "Toothbrush & Toiletries", "Wallet / Cash"]

    if temp_celsius < 12:
        items.extend(["Heavy Winter Jacket", "Thermal Underwear", "Beanie & Gloves", "Scarf"])
    elif 12 <= temp_celsius <= 22:
        items.extend(["Light Sweater or Cardigan", "Jeans / Long Pants", "Sneakers"])
    else:
        items.extend(["T-Shirts & Shorts", "Sunglasses", "Sunscreen", "Cap"])

    condition_lower = condition.lower()
    if "rain" in condition_lower or "drizzle" in condition_lower or "thunderstorm" in condition_lower:
        items.extend(["Umbrella", "Waterproof Raincoat", "Water-resistant Shoes"])

    if activity == "business":
        items.extend(["Formal Suit / Blazer", "Dress Shoes", "Ironed Shirts", "Notebook / Laptop"])
    elif activity == "outdoor":
        items.extend(["Hiking Boots", "Reusable Water Bottle", "Backpack", "Insect Repellent"])
    elif activity == "casual":
        items.extend(["Comfortable Walking Shoes", "Casual Camera", "Crossbody Bag"])

    return items


@app.get("/api/weather")
def get_weather_and_packing(
    place: str | None = None,
    activity: str = "casual",
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None),
):
    require_api_key()
    params = location_query_params(place, lat, lon)
    params.update({"units": "metric", "appid": API_KEY})

    try:
        response = requests.get("https://api.openweathermap.org/data/2.5/weather", params=params)
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Location not found. Please verify spelling.")
        response.raise_for_status()
        data = response.json()

        temp = data["main"]["temp"]
        weather_desc = data["weather"][0]["description"]
        weather_main = data["weather"][0]["main"].lower()
        city_name = data["name"]
        country_code = data["sys"]["country"]

        packing_suggestions = generate_packing_list(temp, weather_desc, activity)
        return {
            "success": True,
            "place": f"{city_name}, {country_code}" if city_name else place,
            "temperature": round(temp, 1),
            "condition": weather_desc,
            "main_condition": weather_main,
            "wind_speed": round(data.get("wind", {}).get("speed", 0) * 3.6, 1),
            "humidity": data["main"].get("humidity"),
            "feels_like": round(data["main"].get("feels_like", temp), 1),
            "packing_list": packing_suggestions,
        }
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to communicate with Weather API: {str(e)}")


@app.get("/api/forecast")
def get_forecast(
    place: str | None = None,
    activity: str = "casual",
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None),
):
    require_api_key()
    params = location_query_params(place, lat, lon)
    params.update({"units": "metric", "appid": API_KEY})

    try:
        response = requests.get("https://api.openweathermap.org/data/2.5/forecast", params=params)
        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Location not found. Please verify spelling.")
        response.raise_for_status()
        data = response.json()

        by_date = {}
        for entry in data.get("list", []):
            date_str = entry["dt_txt"].split(" ")[0]
            hour = entry["dt_txt"].split(" ")[1]
            existing = by_date.get(date_str)
            if existing is None or hour == "12:00:00":
                by_date[date_str] = entry

        sorted_dates = sorted(by_date.keys())[:5]
        forecast = []
        for date_str in sorted_dates:
            entry = by_date[date_str]
            temp = entry["main"]["temp"]
            forecast.append({
                "date": date_str,
                "day_label": datetime.strptime(date_str, "%Y-%m-%d").strftime("%a"),
                "temperature": round(temp, 1),
                "condition": entry["weather"][0]["description"],
                "main_condition": entry["weather"][0]["main"].lower(),
            })

        city_name = data.get("city", {}).get("name")
        country_code = data.get("city", {}).get("country")

        return {
            "success": True,
            "place": f"{city_name}, {country_code}" if city_name else place,
            "forecast": forecast,
        }
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to communicate with Weather API: {str(e)}")