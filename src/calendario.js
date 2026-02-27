// Genera il calendario gironi (tutti contro tutti)
// Con N partecipanti, ogni girone ha N-1 giornate
// Se N è dispari, un giocatore riposa ogni giornata

export function generaCalendario(partecipanti, giornateDisponibili) {
  const n = partecipanti.length;
  if (n < 2) return [];

  // Se dispari, aggiungi "riposo" come giocatore fantasma
  const giocatori = n % 2 === 0 ? [...partecipanti] : [...partecipanti, { user_id: "riposo", username: "Riposo" }];
  const N = giocatori.length;
  const giornatePerGirone = N - 1;

  const calendario = [];
  let giornataAssoluta = 1;
  let girone = 1;

  while (giornataAssoluta <= giornateDisponibili) {
    // Genera tutte le giornate di un girone
    for (let g = 0; g < giornatePerGirone && giornataAssoluta <= giornateDisponibili; g++) {
      const partite = [];

      for (let i = 0; i < N / 2; i++) {
        const home = giocatori[i];
        const away = giocatori[N - 1 - i];

        // Salta le partite con "riposo"
        if (home.user_id !== "riposo" && away.user_id !== "riposo") {
          partite.push({
            giornata: giornataAssoluta,
            girone,
            player1_id: home.user_id,
            player2_id: away.user_id,
            player1_username: home.username,
            player2_username: away.username,
          });
        }
      }

      if (partite.length > 0) {
        calendario.push(...partite);
      }

      // Ruota i giocatori (il primo rimane fisso)
      const fisso = giocatori[0];
      const rotanti = giocatori.slice(1);
      rotanti.unshift(rotanti.pop());
      giocatori.splice(1, rotanti.length, ...rotanti);

      giornataAssoluta++;
    }

    girone++;
  }

  return calendario;
}

export function calcolaGol(punti) {
  if (punti < 40) return 0;
  return Math.floor((punti - 36) / 4);
}

export function calcolaClassificaCampionato(partiteCalendario) {
  const classifica = {};

  partiteCalendario.forEach(p => {
    if (!p.gol_player1 && !p.gol_player2) return; // partita non ancora giocata

    [p.player1_id, p.player2_id].forEach(id => {
      if (!classifica[id]) {
        classifica[id] = { user_id: id, v: 0, p: 0, s: 0, gf: 0, gs: 0, punti: 0 };
      }
    });

    const g1 = p.gol_player1;
    const g2 = p.gol_player2;

    classifica[p.player1_id].gf += g1;
    classifica[p.player1_id].gs += g2;
    classifica[p.player2_id].gf += g2;
    classifica[p.player2_id].gs += g1;

    if (g1 > g2) {
      classifica[p.player1_id].v++;
      classifica[p.player1_id].punti += 3;
      classifica[p.player2_id].s++;
    } else if (g1 < g2) {
      classifica[p.player2_id].v++;
      classifica[p.player2_id].punti += 3;
      classifica[p.player1_id].s++;
    } else {
      classifica[p.player1_id].p++;
      classifica[p.player1_id].punti++;
      classifica[p.player2_id].p++;
      classifica[p.player2_id].punti++;
    }
  });

  return Object.values(classifica).sort((a, b) => {
    if (b.punti !== a.punti) return b.punti - a.punti;
    const diffA = a.gf - a.gs;
    const diffB = b.gf - b.gs;
    if (diffB !== diffA) return diffB - diffA;
    return b.gf - a.gf;
  });
}