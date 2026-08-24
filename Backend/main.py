import os
from fastapi import FastAPI, HTTPException  # pyright: ignore[reportMissingImports]
from fastapi.middleware.cors import CORSMiddleware  # pyright: ignore[reportMissingImports]
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
def get_weather_and_packing(place: str, activity: str = "casual"):
    if not place:
        raise HTTPException(status_code=400, detail="Missing required 'place' parameter.")
    if not API_KEY or API_KEY == "your_actual_api_key_here":
        raise HTTPException(status_code=500, detail="Backend configuration error: Missing API Key.")

    weather_url = f"https://api.openweathermap.org/data/2.5/weather?q={place}&units=metric&appid={API_KEY}"

    try:
        response = requests.get(weather_url)
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
            "place": f"{city_name}, {country_code}",
            "temperature": round(temp, 1),
            "condition": weather_desc,
            "main_condition": weather_main,
            "packing_list": packing_suggestions
        }
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Failed to communicate with Weather API: {str(e)}")
