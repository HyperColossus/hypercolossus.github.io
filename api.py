import asyncio
import logging
import os
import subprocess
import sys
from urllib.parse import quote

import uvicorn
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

logger = logging.getLogger(__name__)

app = FastAPI()

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "https://hypercoloss.us,http://localhost:5173",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class TrackRequest(BaseModel):
    query: str = Field(min_length=1, max_length=80)


tracked_mr_players = {}
tracked_ow_players = {}


def scrape_tracker_gg(url: str) -> str:
    try:
        result = subprocess.run(
            ["python", "scrape.py", url],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=20,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("Tracker request timed out") from exc

    if result.returncode != 0:
        raise RuntimeError("Tracker request failed")

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

    safe_uid = quote(uid, safe="")

    try:
        html = scrape_tracker_gg(
            f"https://tracker.gg/marvel-rivals/profile/ign/{safe_uid}/overview"
        )
        soup = BeautifulSoup(html, "html.parser")

        name_elem = soup.select_one(".trn-ign__username")
        name = name_elem.text.strip() if name_elem else uid

        tier_elem = soup.select_one(".rank-name, .tier-name, .stat-value, .title")
        tier = tier_elem.text.strip() if tier_elem else "Unranked"

        player_data = {
            "name": name,
            "last_tier": tier,
            "last_score": "---",
            "fullData": {},
            "rank": tier,
            "color": "#ac4f98",
        }
        tracked_mr_players[uid] = player_data
        return {"message": "Success", "data": player_data}
    except Exception:
        logger.exception("Marvel Rivals tracker request failed")
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve tracker data right now.",
        )


@app.post("/api/overwatch/track")
def track_ow_player(req: TrackRequest):
    battletag = req.query.strip()
    if not battletag or "#" not in battletag:
        raise HTTPException(
            status_code=400,
            detail="Invalid BattleTag format (e.g. Name#1234)",
        )

    safe_tag = quote(battletag, safe="")

    try:
        html = scrape_tracker_gg(
            f"https://tracker.gg/overwatch/profile/battlenet/{safe_tag}/overview"
        )
        soup = BeautifulSoup(html, "html.parser")

        name_elem = soup.select_one(".trn-ign__username")
        name = name_elem.text.strip() if name_elem else battletag.split("#")[0]

        ranks = {
            "tank": {"division": "unranked", "tier": ""},
            "damage": {"division": "unranked", "tier": ""},
            "support": {"division": "unranked", "tier": ""},
        }

        player_summary = {
            "name": name,
            "ranks": ranks,
            "color": "#f9cc73",
        }

        tracked_ow_players[battletag] = player_summary
        return {"message": "Success", "data": player_summary}
    except Exception:
        logger.exception("Overwatch tracker request failed")
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve tracker data right now.",
        )


if __name__ == "__main__":
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=False)
