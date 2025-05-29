import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { logoMap, fixtureList, teamNamesA, teamNamesB, fallbackLogo } from "./data";

const initialFixtures = fixtureList.map(([home, away]) => ({ home, away, score: "", winner: null }));

const withStats = teams => teams.map(name => ({
  name,
  logo: logoMap[name] || fallbackLogo,
  G: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, P: 0
}));

export default function FixtureTracker() {
  const [fixtures, setFixtures] = useState(initialFixtures);
  const [localScores, setLocalScores] = useState(initialFixtures.map(f => f.score));
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    const loadFixtures = async () => {
      try {
        const snap = await getDocs(collection(db, "fixtures"));
        const latestDoc = snap.docs.find(d => d.id === "latest");
        if (latestDoc && latestDoc.exists()) {
          const data = latestDoc.data();
          if (data?.fixtures) {
            const cloned = data.fixtures.map(f => ({ ...f }));
            setFixtures(cloned);
            setLocalScores(cloned.map(f => f.score));
          }
          if (data?.timestamp?.toDate) {
            setLastSaved(data.timestamp.toDate().toLocaleString());
          }
        }
      } catch (err) {
        console.error("Error loading fixtures:", err);
      }
    };
    loadFixtures();
  }, []);

  const updateScore = (index, value) => {
    let score = value.trim();
    if (/^\d$/.test(score)) score += ":";

    const updated = [...fixtures];
    updated[index] = { ...updated[index], score, winner: null };

    const isValid = /^\d{1,2}:\d{1,2}$/.test(score);
    if (isValid) {
      const [h, a] = score.split(":" ).map(Number);
      updated[index].winner = h > a ? 1 : h < a ? 2 : 0;
    }

    setFixtures(updated);
    const newScores = [...localScores];
    newScores[index] = score;
    setLocalScores(newScores);
  };

  const computeTable = (teamNames) => {
    const table = withStats(teamNames);
    fixtures.forEach(f => {
      if (!/^\d{1,2}:\d{1,2}$/.test(f.score)) return;
      const [hg, ag] = f.score.split(":" ).map(Number);
      const home = table.find(t => t.name === f.home);
      const away = table.find(t => t.name === f.away);
      if (!home || !away) return;
      home.G++; away.G++;
      home.GF += hg; home.GA += ag;
      away.GF += ag; away.GA += hg;
      if (hg > ag) { home.W++; home.P += 3; away.L++; }
      else if (hg < ag) { away.W++; away.P += 3; home.L++; }
      else { home.D++; away.D++; home.P++; away.P++; }
    });
    return table.sort((a, b) => b.P - a.P);
  };

  const tableA = useMemo(() => computeTable(teamNamesA), [fixtures]);
  const tableB = useMemo(() => computeTable(teamNamesB), [fixtures]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(collection(db, "fixtures"), "latest"), {
        fixtures,
        timestamp: serverTimestamp()
      });
      setLastSaved(new Date().toLocaleString());
    } catch (error) {
      console.error("Error saving fixtures:", error);
    } finally {
      setSaving(false);
    }
  };

  const Table = ({ teams }) => (
    <table className="w-full border border-gray-300 text-sm table-fixed">
      <thead className="bg-gray-100">
        <tr className="h-[42px]">
          <th className="border p-1 text-left">Club</th>
          {"G W D L GF GA P".split(" ").map(col => (
            <th key={col} className="border p-1 w-[42px] text-center">{col}</th>
          ))}
        </tr>
      </thead>
      <AnimatePresence>
        <tbody>
          {teams.map((team, idx) => (
            <motion.tr
              key={team.name}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center h-[42px]"
            >
              <td className="border p-1 h-[42px]">
                <div className="flex items-center gap-2 h-full">
                  <img src={team.logo} onError={e => e.currentTarget.src = fallbackLogo} width={24} />
                  <span className={idx < 2 ? "font-bold" : ""}>{team.name}</span>
                </div>
              </td>
              {[team.G, team.W, team.D, team.L, team.GF, team.GA, team.P].map((val, i) => (
                <td key={i} className="border p-1 w-[42px] h-[42px]">{val}</td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </AnimatePresence>
    </table>
  );

  return (
    <div className="p-4 space-y-6 max-w-screen-xl mx-auto font-poppins">
      <div className="flex flex-col sm:items-center lg:flex-row lg:justify-between lg:items-center">
        <h1 className="text-2xl font-bold text-center sm:text-center lg:text-left">Kinder Mbueno Tournament</h1>
        <div className="flex flex-col-reverse sm:flex-col-reverse lg:flex-row sm:items-center sm:justify-center lg:items-center lg:gap-4 mt-2 lg:mt-0">
          <span className="text-sm text-gray-600 text-center lg:text-left mt-2 lg:mt-0">Last saved: {lastSaved || "never"}</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2 rounded text-white ${saving ? "bg-blue-600 opacity-50" : "bg-blue-600"}`}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:space-x-6 space-y-6 lg:space-y-0">
        <div className="flex-1 space-y-4">
          <h2 className="text-xl font-bold">Group A</h2>
          <Table teams={tableA} />
        </div>
        <div className="flex-1 space-y-4">
          <h2 className="text-xl font-bold">Group B</h2>
          <Table teams={tableB} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Fixtures</h2>
        <table className="w-full border border-gray-300 text-sm table-fixed">
          <thead className="bg-gray-100">
            <tr className="h-[42px]">
              {["Home", "Away", "Score", "Winner"].map(h => (
                <th key={h} className="border p-1">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fixtures.map((f, i) => (
              <tr
                key={i}
                className={`text-center h-[42px] ${((i + 1) % 5 === 0 && i !== fixtures.length - 1) ? "border-b-2 border-gray-300" : ""}`}
              >
                <td className="border p-1 h-[42px]">{f.home}</td>
                <td className="border p-1 h-[42px]">{f.away}</td>
                <td className="border p-1 h-[42px]">
                  <input
                    value={localScores[i]}
                    onChange={e => updateScore(i, e.target.value)}
                    className="w-full text-center border p-1"
                  />
                </td>
                <td className="border p-1 h-[42px]">
                  {f.winner === 1 ? <strong>{f.home}</strong> :
                   f.winner === 2 ? <strong>{f.away}</strong> :
                   f.winner === 0 ? "Draw" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}