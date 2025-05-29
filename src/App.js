import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { auth, provider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  Button,
  Typography,
  Box,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import AdminDashboard from "./components/AdminDashboard";
import CandidatesList from "./components/CandidatesList";
import CandidateDetail from "./components/CandidateDetail";

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
    jobs: "Registered Jobs",
    candidates: "Candidates",
    scoreButton: "Show Candidate Scores",
    scoreAllButton: "Run AI Scoring for All Candidates",
    noCandidates: "No candidates registered yet.",
  },
};

function App() {
  const [user, setUser] = useState(null);
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

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
      showSnackbar("Login failed", "error");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
      showSnackbar("Logout failed", "error");
    }
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <Container
          component="main"
          maxWidth="sm"
          sx={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            {t("login")}
          </Typography>
          <Button variant="contained" onClick={login} size="large">
            {t("signin")}
          </Button>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Box sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "background.default" }}>
          <AppBar position="static" elevation={2}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
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

          <Routes>
            <Route 
              path="/admin" 
              element={
                <AdminDashboard 
                  user={user} 
                  t={t} 
                  snackbar={snackbar}
                  showSnackbar={showSnackbar}
                  closeSnackbar={closeSnackbar}
                />
              } 
            />
            <Route path="/candidates" element={<CandidatesList />} />
            <Route path="/candidate/:candidateId" element={<CandidateDetail />} />
            <Route 
              path="/" 
              element={<CandidatesList />} 
            />
          </Routes>

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
      </Router>
    </ThemeProvider>
  );
}

export default App;
