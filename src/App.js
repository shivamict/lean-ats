import React, { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import JobForm from "./components/JobForm";
import CandidateUploadForm from "./components/CandidateUploadForm";
import CandidateList from "./components/CandidateList";
import CandidateScoreChart from "./components/CandidateScoreChart";
import { scoreCandidate } from "./utils/scoreCandidateWithChatGPT";

const translations = {
  ja: {
    welcome: "ようこそ、{name} さん",
    logout: "ログアウト",
    login: "Lean ATS ログイン",
    signin: "Googleでサインイン",
    jobs: "登録された求人一覧",
    candidates: "候補者",
    scoreButton: "候補者スコアを表示",
    scoreAllButton: "全候補者のAIスコアリングを実行",
    noCandidates: "候補者がまだ登録されていません。",
  },
  en: {
    welcome: "Welcome, {name}",
    logout: "Logout",
    login: "Lean ATS Login",
    signin: "Sign in with Google",
    jobs: "Posted Jobs",
    candidates: "Candidates",
    scoreButton: "Show Candidate Scores",
    scoreAllButton: "Run AI Scoring for All Candidates",
    noCandidates: "No candidates registered yet.",
  },
};

function App() {
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [candidateScores, setCandidateScores] = useState({});
  const [loadingScores, setLoadingScores] = useState({});
  const [lang, setLang] = useState("ja");

  // Translation helper
  const t = (key, vars) => {
    let str = translations[lang][key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v);
      });
    }
    return str;
  };

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const jobsData = [];
      querySnapshot.forEach((doc) =>
        jobsData.push({ id: doc.id, ...doc.data() })
      );
      setJobs(jobsData);
    });
    return () => unsubscribe();
  }, [user]);

  const fetchCandidateScores = async (jobId) => {
    setLoadingScores((prev) => ({ ...prev, [jobId]: true }));
    try {
      const q = query(collection(db, "candidates"), where("jobId", "==", jobId));
      const querySnapshot = await getDocs(q);
      const candidates = querySnapshot.docs
        .map((doc) => doc.data())
        .filter((c) => c.score !== undefined && c.name)
        .map((c) => ({ name: c.name, score: c.score }));
      setCandidateScores((prev) => ({ ...prev, [jobId]: candidates }));
    } catch (error) {
      console.error("Error loading candidate scores:", error);
    }
    setLoadingScores((prev) => ({ ...prev, [jobId]: false }));
  };

  const login = async () => {
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const saveJob = async (job) => {
    await addDoc(collection(db, "jobs"), {
      ...job,
      createdAt: new Date(),
    });
  };

  const handleScoreAll = async () => {
    for (const job of jobs) {
      const candidateSnapshot = await getDocs(
        query(collection(db, "candidates"), where("jobId", "==", job.id))
      );

      for (const candidateDoc of candidateSnapshot.docs) {
        const candidate = candidateDoc.data();
        const result = await scoreCandidate(candidate, job);

        await updateDoc(doc(db, "candidates", candidateDoc.id), {
          score: result.score,
          recommendation: result.recommendation,
        });
      }

      await fetchCandidateScores(job.id);
    }
    alert(t("scoreAllButton") + " 完了!");
  };

  if (!user) {
    return (
      <Box sx={{ mt: 8, textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          {t("login")}
        </Typography>
        <Button variant="contained" onClick={login}>
          {t("signin")}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with logout and language switch */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">{t("welcome", { name: user.displayName })}</Typography>

        <Box>
          <Button variant="outlined" onClick={logout} sx={{ mr: 2 }}>
            {t("logout")}
          </Button>
          <Button variant="text" onClick={() => setLang(lang === "ja" ? "en" : "ja")}>
            {lang === "ja" ? "English" : "日本語"}
          </Button>
        </Box>
      </Box>

      {/* Job Posting Form */}
      <JobForm onSave={saveJob} />

      {/* Job List */}
      <Typography variant="h6" mt={5} mb={2}>
        {t("jobs")}
      </Typography>
      <List>
        {jobs.map((job) => (
          <React.Fragment key={job.id}>
            <ListItem
              divider
              sx={{ backgroundColor: "#f5f5f5", borderRadius: 1, mb: 2 }}
            >
              <ListItemText
                primary={
                  <Typography variant="subtitle1" fontWeight="bold">
                    {job.title} ({job.category})
                  </Typography>
                }
                secondary={job.description}
              />
            </ListItem>

            {/* Candidates List */}
            <CandidateList jobId={job.id} />

            {/* Load and show candidate score chart */}
            <Box sx={{ mt: 2, mb: 5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => fetchCandidateScores(job.id)}
              >
                {t("scoreButton")}
              </Button>

              {loadingScores[job.id] ? (
                <Box sx={{ mt: 2, textAlign: "center" }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                candidateScores[job.id] && (
                  <CandidateScoreChart candidates={candidateScores[job.id]} />
                )
              )}
            </Box>
          </React.Fragment>
        ))}
      </List>

      {/* Candidate Upload Form */}
      <CandidateUploadForm />

      {/* Score All Button */}
      <Button variant="contained" onClick={handleScoreAll} sx={{ mt: 4 }}>
        {t("scoreAllButton")}
      </Button>
    </Box>
  );
}

export default App;
