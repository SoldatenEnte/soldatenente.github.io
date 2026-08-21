// Deutsche Bezeichnungen für die Messkategorien.
//
// Die Rohdaten kommen aus den Rust- und C-Runnern und tragen dort englische
// Bezeichner. Übersetzt wird erst in der Anzeige, damit die Messdateien
// zwischen den drei Engines identisch bleiben und maschinell vergleichbar sind.

/** 1.000, 10.000, 100.000, 1 Mio. */
export function anzahl(n) {
  if (n >= 1_000_000) return `${n / 1_000_000} Mio.`;
  return n.toLocaleString("de-DE");
}

const KATEGORIE = {
  A1: (n) => `1 Komponente schreiben - ${anzahl(n)}`,
  A2: (n) => `1 lesen, 1 schreiben - ${anzahl(n)}`,
  A3: (n) => `4 Komponenten - ${anzahl(n)}`,
  A4: (n) => `8 Komponenten - ${anzahl(n)}`,
  A5: (n) => `2 Komponenten, nur lesen - ${anzahl(n)}`,
  B1: (k) => `${k} ${k === 1 ? "Archetype" : "Archetypes"} - 100.000 Entities`,
  C1: () => "Leere Entity erzeugen - 200.000",
  C2: () => "Entity mit 2 Komponenten erzeugen - 200.000",
  C3: () => "Entity löschen - 200.000",
  D1: () => "Komponente hinzufügen - 100.000",
  D2: () => "Komponente entfernen - 100.000",
  D3: () => "Hinzufügen und Entfernen im Wechsel - 20.000 × 20",
  E1: () => "Wahlfreier Lesezugriff - 100.000 × 10",
  E2: () => "Wahlfreier Schreibzugriff - 100.000 × 10",
  F1: () => "Vereinzelte Änderungen - 200.000",
  G1: () => "3 Systeme - 100.000",
};

const BESCHREIBUNG = {
  A1: "20 Durchläufe, bei denen jede Entity einen Wert liest, verändert und zurückschreibt. Nur eine Spalte ist beteiligt.",
  A2: "20 Durchläufe der klassischen Schleife: Geschwindigkeit lesen, Position schreiben.",
  A3: "20 Durchläufe über vier Komponentenspalten je Entity.",
  A4: "20 Durchläufe über acht Komponentenspalten je Entity. Mehr Spalten bedeuten mehr Speicherbereiche pro Entity.",
  A5: "20 Durchläufe, die nur lesen. Die Differenz zu A2 zeigt, was die Änderungsverfolgung beim Schreiben kostet.",
  B1: "Dieselben 100.000 Entities, verteilt auf mehrere Archetypes, danach vollständig durchlaufen.",
  C1: "Nur eine Identität vergeben, ohne Komponentendaten.",
  C2: "Identität vergeben, Archetype bestimmen und die Komponentenwerte schreiben.",
  C3: "Entity entfernen, entstandene Lücke auffüllen und die Identität zur Wiederverwendung freigeben.",
  D1: "Eine Komponente hinzufügen. Jede Entity wechselt dabei den Archetype.",
  D2: "Dieselbe Bewegung in die Gegenrichtung.",
  D3: "Wiederholtes Hin und Her zwischen zwei Archetypes. Prüft, ob die Engine solche Wechsel zwischenspeichert.",
  E1: "Komponente über das Entity-Handle in zufälliger Reihenfolge lesen. Genau der Zugriff, für den Archetype-Speicher am schlechtesten geeignet ist.",
  E2: "Derselbe Zugriff, aber schreibend.",
  F1: "Ein Prozent der Zeilen wird verändert, danach fragt ein Filter ab, welche das waren.",
  G1: "Drei registrierte Systeme laufen über dieselben Daten, ausgeführt durch den Scheduler der jeweiligen Engine.",
};

const GRUPPE = {
  Iteration: "Iteration",
  Topology: "Verteilung auf Archetypes",
  Lifecycle: "Entities erzeugen und löschen",
  Structural: "Komponenten ändern",
  "Random access": "Wahlfreier Zugriff",
  "Change detection": "Änderungserkennung",
  Scheduling: "Scheduler",
};

/** Erklärt, worum es in einer Gruppe überhaupt geht. */
const GRUPPE_INTRO = {
  Iteration:
    "Der Normalfall: über alle passenden Entities laufen und ihre Komponenten verarbeiten. Hier sollte zusammenhängender Speicher seinen Vorteil ausspielen.",
  Topology:
    "Dieselbe Zahl Entities, aber auf mehr Archetypes verteilt. Je mehr Archetypes, desto häufiger muss die Iteration von einem Speicherbereich zum nächsten springen.",
  Lifecycle: "Entities entstehen und verschwinden. Kosten, die in jeder Simulation laufend anfallen.",
  Structural:
    "Eine Komponente hinzufügen oder entfernen ändert die Zusammensetzung einer Entity. Im Archetype-Modell muss sie deshalb umziehen, und das kostet.",
  "Random access":
    "Zugriff auf eine einzelne Entity über ihr Handle, in zufälliger Reihenfolge. Die bekannte Schwäche des Archetype-Modells.",
  "Change detection": "Feststellen, welche Werte sich seit dem letzten Durchlauf geändert haben.",
  Scheduling: "Mehrere Systeme nacheinander ausführen lassen.",
};

export const labelDE = (r) => (KATEGORIE[r.id] ? KATEGORIE[r.id](r.sweep_value) : r.label);
export const beschreibungDE = (r) => BESCHREIBUNG[r.id] ?? r.description ?? "";
export const gruppeDE = (g) => GRUPPE[g] ?? g;
export const gruppeIntroDE = (g) => GRUPPE_INTRO[g] ?? "";
