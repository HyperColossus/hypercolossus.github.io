import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import json
import uvicorn
import requests
import subprocess
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TrackRequest(BaseModel):
    query: str

# In-memory storage for tracked players
tracked_mr_players = {}
tracked_ow_players = {}

def scrape_tracker_gg(url: str):
    result = subprocess.run(["python", "scrape.py", url], capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        raise Exception(f"Scraper failed: {result.stderr}")
    return result.stdout

@app.get("/api/marvel-rivals/players")
def get_mr_players():
    return tracked_mr_players

@app.get("/api/overwatch/players")
def get_ow_players():
    return tracked_ow_players

@app.post("/api/marvel-rivals/track")
def track_mr_player(req: TrackRequest):
    uid = req.query.strip()
    if not uid:
        raise HTTPException(status_code=400, detail="UID cannot be empty")
    
    try:
        html = scrape_tracker_gg(f"https://tracker.gg/marvel-rivals/profile/ign/{uid}/overview")
        soup = BeautifulSoup(html, "html.parser")
        
        # Best effort scraping (tracker.gg DOM can change)
        name_elem = soup.select_one(".trn-ign__username")
        name = name_elem.text.strip() if name_elem else uid
        
        # Look for rank/tier - tracker usually has a class like .stat-value or .tier-name
        tier_elem = soup.select_one(".rank-name, .tier-name, .stat-value, .title")
        tier = tier_elem.text.strip() if tier_elem else "Unranked"
        
        mock_data = {
            "name": name,
            "last_tier": tier,
            "last_score": "---",
            "fullData": {},
            "rank": tier,
            "color": "#ac4f98"
        }
        tracked_mr_players[uid] = mock_data
        return {"message": "Success", "data": mock_data}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/overwatch/track")
def track_ow_player(req: TrackRequest):
    battletag = req.query.strip()
    if not battletag or "#" not in battletag:
        raise HTTPException(status_code=400, detail="Invalid BattleTag format (e.g. Name#1234)")
    
    formatted_tag = battletag.replace("#", "%23")
    
    try:
        html = scrape_tracker_gg(f"https://tracker.gg/overwatch/profile/battlenet/{formatted_tag}/overview")
        soup = BeautifulSoup(html, "html.parser")
        
        name_elem = soup.select_one(".trn-ign__username")
        name = name_elem.text.strip() if name_elem else battletag.split("#")[0]
        
        # OW Tracker has different rank elements. We will do a generic parse for now.
        # This will return generic unranked data if it fails to parse the specific Tracker.gg HTML structure.
        ranks = {
            "tank": {"division": "unranked", "tier": ""},
            "damage": {"division": "unranked", "tier": ""},
            "support": {"division": "unranked", "tier": ""}
        }

        player_summary = {
            "name": name,
            "ranks": ranks,
            "color": "#f9cc73"
        }
        
        tracked_ow_players[battletag] = player_summary
        return {"message": "Success", "data": player_summary}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
