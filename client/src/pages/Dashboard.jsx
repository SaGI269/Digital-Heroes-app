import { useEffect, useState } from "react";
import supabase from "../supabase";

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [score, setScore] = useState("");
  const [date, setDate] = useState("");
  const [scores, setScores] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [winners, setWinners] = useState([]);

  // ✅ FETCH USER + DATA
  const getUser = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user.id;

    // safer fetch
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    setUserData(user);

    const { data: scoreData } = await supabase
      .from("scores")
      .select("*")
      .eq("userId", userId)
      .order("date", { ascending: false });

    setScores(scoreData || []);

    const { data: winnerData } = await supabase
      .from("winners")
      .select("*")
      .eq("userId", userId)
      .order("id", { ascending: false });

    setWinners(winnerData || []);
  };

  useEffect(() => {
    getUser();
  }, []);

  // ✅ ADD / UPDATE SCORE
  const addOrUpdateScore = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user.id;

    if (!score || !date) return alert("Fill all fields");

    if (score < 1 || score > 45) {
      return alert("Score must be between 1–45");
    }

    if (!editingId) {
      const { data: existing } = await supabase
        .from("scores")
        .select("*")
        .eq("userId", userId)
        .eq("date", date);

      if (existing.length > 0) {
        return alert("Score already exists for this date");
      }
    }

    if (editingId) {
      await supabase
        .from("scores")
        .update({ score: parseInt(score), date })
        .eq("id", editingId);

      setEditingId(null);
    } else {
      const { data: currentScores } = await supabase
        .from("scores")
        .select("*")
        .eq("userId", userId)
        .order("date", { ascending: true });

      if (currentScores.length >= 5) {
        await supabase
          .from("scores")
          .delete()
          .eq("id", currentScores[0].id);
      }

      await supabase.from("scores").insert([
        {
          userId,
          score: parseInt(score),
          date,
        },
      ]);
    }

    setScore("");
    setDate("");
    getUser();
  };

  // ✅ DELETE
  const deleteScore = async (id) => {
    await supabase.from("scores").delete().eq("id", id);
    getUser();
  };

  // ✅ EDIT
  const editScore = (s) => {
    setScore(s.score);
    setDate(s.date);
    setEditingId(s.id);
  };

  // ✅ FINAL DRAW LOGIC (PRODUCTION)
  const runDraw = async () => {
    let numbers = new Set();
    while (numbers.size < 5) {
      numbers.add(Math.floor(Math.random() * 45) + 1);
    }

    const drawNumbers = Array.from(numbers);

    const { data: drawData, error } = await supabase
      .from("draws")
      .insert([{ numbers: drawNumbers, date: new Date() }])
      .select();

    if (error || !drawData) {
      console.log(error);
      alert("Draw failed");
      return;
    }

    const drawId = drawData[0].id;

    const { data: users } = await supabase.from("users").select("*");

    for (let user of users) {
      const { data: userScores } = await supabase
        .from("scores")
        .select("*")
        .eq("userId", user.id);

      if (!userScores || userScores.length === 0) continue;

      const scoreValues = userScores.map((s) => s.score);

      const matchCount = scoreValues.filter((s) =>
        drawNumbers.includes(s)
      ).length;

      // ✅ REAL CONDITION (as per PRD)
      if (matchCount >= 1) {
        await supabase.from("winners").insert([
          {
            userId: user.id,
            drawId,
            matchCount,
            status: "pending",
          },
        ]);
      }
    }

    alert("Draw completed!");
    getUser();
  };

     return (
  <div className="app">
    <div className="glass-card">

      <h1 className="title">🎯 Lucky Draw Dashboard</h1>

      {userData && (
        <div className="user-box">
          <p>{userData.email}</p>
          <span className={userData.isSubscribed ? "badge green" : "badge red"}>
            {userData.isSubscribed ? "Subscribed" : "Not Subscribed"}
          </span>
        </div>
      )}

      {/* ADD SCORE */}
      <div className="section">
        <h2>✨ Add Score</h2>

        <div className="input-group">
          <input
            type="number"
            placeholder="Enter score (1–45)"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <button className="btn primary" onClick={addOrUpdateScore}>
          {editingId ? "Update Score" : "Add Score"}
        </button>
      </div>

      {/* SCORES */}
      <div className="section">
        <h2>📊 Your Scores</h2>

        {scores.length === 0 ? (
          <p className="empty">No scores yet</p>
        ) : (
          scores.map((s) => (
            <div key={s.id} className="score-card">
              <span>🎯 {s.score}</span>
              <span>{s.date}</span>

              <div>
                <button className="btn small edit" onClick={() => editScore(s)}>✏️</button>
                <button className="btn small delete" onClick={() => deleteScore(s.id)}>🗑</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DRAW */}
      <div className="section">
        <h2>🎲 Lucky Draw</h2>
        <button className="btn draw" onClick={runDraw}>
          🚀 Run Draw
        </button>
      </div>

      {/* WINNERS */}
      <div className="section">
        <h2>🏆 Your Wins</h2>

        {winners.length === 0 ? (
          <p className="empty">No wins yet</p>
        ) : (
          winners.map((w) => (
            <div key={w.id} className="win-card">
              🎉 Match: {w.matchCount} | {w.status}
            </div>
          ))
        )}
      </div>

    </div>
  </div>
  );
}
