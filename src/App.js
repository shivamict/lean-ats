import React, { useState, useEffect } from "react";
import { auth, provider, db } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
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
  Container,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
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
  const [darkMode, setDarkMode] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: {
        main: "#2196f3",
      },
      secondary: {
        main: "#f50057",
      },
      background: {
        default: darkMode ? "#121212" : "#f5f7fa",
        paper: darkMode ? "#1e1e1e" : "#ffffff",
      },
    },
  });

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

  const handleSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

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
      handleSnackbar("スコアの取得に成功しました");
    } catch (error) {
      console.error("Error loading candidate scores:", error);
      handleSnackbar("スコアの取得に失敗しました", "error");
    }
    setLoadingScores((prev) => ({ ...prev, [jobId]: false }));
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
      handleSnackbar("ログインに成功しました");
    } catch (error) {
      handleSnackbar("ログインに失敗しました", "error");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      handleSnackbar("ログアウトしました");
    } catch (error) {
      handleSnackbar("ログアウトに失敗しました", "error");
    }
  };

  const saveJob = async (job) => {
    try {
      await addDoc(collection(db, "jobs"), {
        ...job,
        createdAt: new Date(),
      });
      handleSnackbar("求人を登録しました");
    } catch (error) {
      handleSnackbar("求人の登録に失敗しました", "error");
    }
  };

  const handleScoreAll = async () => {
    try {
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
      handleSnackbar("全候補者のスコアリングが完了しました");
    } catch (error) {
      handleSnackbar("スコアリングに失敗しました", "error");
    }
  };

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              textAlign: "center",
              maxWidth: 400,
              width: "90%",
              borderRadius: 2,
            }}
            className="fade-in"
          >
            <Typography variant="h4" gutterBottom>
              {t("login")}
            </Typography>
            <Button
              variant="contained"
              onClick={login}
              size="large"
              className="custom-button"
              sx={{ mt: 2 }}
            >
              {t("signin")}
            </Button>
          </Paper>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <AppBar position="sticky" elevation={0}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {t("welcome", { name: user.displayName })}
            </Typography>
            <IconButton
              color="inherit"
              onClick={() => setDarkMode(!darkMode)}
              sx={{ mr: 2 }}
            >
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            <Button
              variant="outlined"
              onClick={() => setLang(lang === "ja" ? "en" : "ja")}
              color="inherit"
              sx={{ mr: 2 }}
            >
              {lang === "ja" ? "English" : "日本語"}
            </Button>
            <Button variant="outlined" onClick={logout} color="inherit">
              {t("logout")}
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 4 }}>
          <JobForm onSave={saveJob} />

          <Typography variant="h5" sx={{ mt: 6, mb: 3 }}>
            {t("jobs")}
          </Typography>

          <List>
            {jobs.map((job) => (
              <Paper
                key={job.id}
                elevation={2}
                sx={{ mb: 4, overflow: "hidden" }}
                className="hover-card"
              >
                <ListItem
                  sx={{
                    bgcolor: "background.paper",
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="h6">
                        {job.title} ({job.category})
                      </Typography>
                    }
                    secondary={job.description}
                  />
                </ListItem>

                <Box sx={{ p: 2 }}>
                  <CandidateList jobId={job.id} />

                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => fetchCandidateScores(job.id)}
                      className="custom-button"
                      disabled={loadingScores[job.id]}
                    >
                      {loadingScores[job.id] ? (
                        <CircularProgress size={24} />
                      ) : (
                        t("scoreButton")
                      )}
                    </Button>

                    {candidateScores[job.id] && (
                      <CandidateScoreChart candidates={candidateScores[job.id]} />
                    )}
                  </Box>
                </Box>
              </Paper>
            ))}
          </List>

          <CandidateUploadForm />

          <Button
            variant="contained"
            onClick={handleScoreAll}
            sx={{ mt: 4 }}
            className="custom-button"
          >
            {t("scoreAllButton")}
          </Button>
        </Container>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={closeSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={closeSnackbar}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;