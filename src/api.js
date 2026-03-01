const API_KEY = import.meta.env.VITE_FOOTBALL_DATA_KEY;
const BASE_URL = "/api-football/v4";

async function chiamaAPI(endpoint) {
  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    headers: {
      "X-Auth-Token": API_KEY,
    },
  });
  const data = await response.json();
  return data;
}

export const LEAGUE_IDS = {
  "Serie A": "SA",
  "Premier League": "PL",
  "Bundesliga": "BL1",
  "La Liga": "PD",
  "Ligue 1": "FL1",
  "Champions League": "CL",
  "Mondiali": "WC",
  "Europei": "EC",
};

export const STAGIONE = 2025;

export async function getPartite(competizione, giornata) {
  return getRisultati(competizione, giornata);
}

export async function getRisultati(competizione, giornata) {
  const leagueCode = LEAGUE_IDS[competizione];
  if (!leagueCode) return [];

  const data = await chiamaAPI(
    `competitions/${leagueCode}/matches?matchday=${giornata}&season=${STAGIONE}`
  );

  if (!data.matches) return [];

  return data.matches.map(m => ({
    id_esterno: m.id,
    home: m.homeTeam.name,
    away: m.awayTeam.name,
    league: competizione,
    match_date: m.utcDate,
    gol_home: m.score.fullTime.home,
    gol_away: m.score.fullTime.away,
    status: m.status,
  }));
}