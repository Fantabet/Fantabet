const API_KEY = import.meta.env.VITE_FOOTBALL_DATA_KEY;
const BASE_URL = "/api-football/v4";

// Normalizza i nomi delle squadre
const NOMI_SQUADRE = {
  "FC Internazionale Milano": "Inter",
  "AC Milan": "Milan",
  "Juventus FC": "Juventus",
  "SSC Napoli": "Napoli",
  "AS Roma": "Roma",
  "SS Lazio": "Lazio",
  "ACF Fiorentina": "Fiorentina",
  "Atalanta BC": "Atalanta",
  "Torino FC": "Torino",
  "Bologna FC 1909": "Bologna",
  "Udinese Calcio": "Udinese",
  "Genoa CFC": "Genoa",
  "US Lecce": "Lecce",
  "Cagliari Calcio": "Cagliari",
  "Parma Calcio 1913": "Parma",
  "Como 1907": "Como",
  "Hellas Verona FC": "Verona",
  "US Cremonese": "Cremonese",
  "US Sassuolo Calcio": "Sassuolo",
  "AC Pisa 1909": "Pisa",
  "Manchester City FC": "Man City",
  "Manchester United FC": "Man United",
  "Liverpool FC": "Liverpool",
  "Arsenal FC": "Arsenal",
  "Chelsea FC": "Chelsea",
  "Tottenham Hotspur FC": "Tottenham",
  "Newcastle United FC": "Newcastle",
  "Aston Villa FC": "Aston Villa",
  "FC Bayern München": "Bayern",
  "Borussia Dortmund": "Dortmund",
  "Bayer 04 Leverkusen": "Leverkusen",
  "RB Leipzig": "Lipsia",
  "Club Atlético de Madrid": "Atletico",
  "Sevilla FC": "Siviglia",
  "Real Madrid CF": "Real Madrid",
  "FC Barcelona": "Barcellona",
  "Paris Saint-Germain FC": "PSG",
  "Olympique de Marseille": "Marsiglia",
  "AS Monaco FC": "Monaco",
  "Olympique Lyonnais": "Lione",
};

function normalizzaNome(nome) {
  return NOMI_SQUADRE[nome] || nome;
}

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
    home: normalizzaNome(m.homeTeam.name),
    away: normalizzaNome(m.awayTeam.name),
    league: competizione,
    match_date: m.utcDate,
    gol_home: m.score.fullTime.home,
    gol_away: m.score.fullTime.away,
    status: m.status,
  }));
}