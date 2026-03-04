import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const API_KEY = process.env.FOOTBALL_DATA_KEY;

const LEAGUE_IDS = {
  "Serie A": "SA",
  "Premier League": "PL",
  "Bundesliga": "BL1",
  "La Liga": "PD",
  "Ligue 1": "FL1",
  "Champions League": "CL",
};

const STAGIONE = 2025;

async function getPartiteGiornata(leagueCode, giornata) {
  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${leagueCode}/matches?matchday=${giornata}&season=${STAGIONE}`,
    { headers: { "X-Auth-Token": API_KEY } }
  );
  const data = await res.json();
  return data.matches || [];
}

async function getGiornataCorrente(leagueCode) {
  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${leagueCode}?season=${STAGIONE}`,
    { headers: { "X-Auth-Token": API_KEY } }
  );
  const data = await res.json();
  return data.currentSeason?.currentMatchday || 1;
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Non autorizzato" });
  }

  const risultati = [];

  for (const [competizione, leagueCode] of Object.entries(LEAGUE_IDS)) {
    try {
      const giornata = await getGiornataCorrente(leagueCode);
      const partite = await getPartiteGiornata(leagueCode, giornata);

      for (const m of partite) {
        const { error } = await supabase.from("partite").upsert({
          id_esterno: m.id,
          home: m.homeTeam.name,
          away: m.awayTeam.name,
          league: competizione,
          match_date: m.utcDate,
          gol_home: m.score.fullTime.home,
          gol_away: m.score.fullTime.away,
        }, { onConflict: "id_esterno" });

        if (!error) risultati.push(`✓ ${m.homeTeam.name} vs ${m.awayTeam.name}`);
        else risultati.push(`✗ Errore: ${error.message}`);
      }
    } catch (e) {
      risultati.push(`✗ ${competizione}: ${e.message}`);
    }
  }

  res.status(200).json({ aggiornate: risultati.length, dettagli: risultati });
}