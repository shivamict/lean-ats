import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Grid,
  Avatar,
  Fade,
  CircularProgress,
  Container,
  Fab,
  Tooltip,
} from "@mui/material";
import {
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

export default function CandidatesList() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch jobs first
    const jobsQuery = query(collection(db, "jobs"));
    const unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData = {};
      snapshot.docs.forEach((doc) => {
        jobsData[doc.id] = doc.data();
      });
      setJobs(jobsData);
    });

    // Fetch candidates
    const candidatesQuery = query(
      collection(db, "candidates"),
      orderBy("score", "desc")
    );
    const unsubscribeCandidates = onSnapshot(candidatesQuery, (snapshot) => {
      const candidatesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCandidates(candidatesData);
      setLoading(false);
    });

    return () => {
      unsubscribeJobs();
      unsubscribeCandidates();
    };
  }, []);

  const handleCandidateClick = (candidate) => {
    navigate(`/candidate/${candidate.id}`, { state: { candidate } });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "error";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "優秀";
    if (score >= 60) return "良好";
    return "要検討";
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          候補者データを読み込み中...
        </Typography>
      </Container>
    );
  }

  if (candidates.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <Box sx={{ py: 8 }}>
          <PersonIcon sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            候補者がまだ登録されていません
          </Typography>
          <Typography variant="body1" color="text.secondary">
            新しい候補者を登録して評価を開始しましょう
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          候補者一覧
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {candidates.length} 名の候補者が登録されています
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {candidates.map((candidate, index) => (
          <Grid item xs={12} sm={6} md={4} key={candidate.id}>
            <Fade in={true} timeout={300 + index * 100}>
              <Card
                elevation={3}
                sx={{
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  borderRadius: 3,
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: 6,
                    "& .score-chip": {
                      transform: "scale(1.1)",
                    },
                  },
                }}
                onClick={() => handleCandidateClick(candidate)}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ textAlign: "center", mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: getScoreColor(candidate.score) + ".main",
                        mx: "auto",
                        mb: 2,
                        width: 56,
                        height: 56,
                      }}
                    >
                      <PersonIcon sx={{ fontSize: 28 }} />
                    </Avatar>
                    
                    <Typography variant="h6" component="h2" gutterBottom fontWeight="bold">
                      {candidate.name}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {jobs[candidate.jobId]?.title || "職種不明"}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                    <Chip
                      className="score-chip"
                      icon={<StarIcon />}
                      label={`${candidate.score}点 - ${getScoreLabel(candidate.score)}`}
                      color={getScoreColor(candidate.score)}
                      size="medium"
                      sx={{
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                        transition: "transform 0.3s ease",
                      }}
                    />
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <TrendingUpIcon sx={{ fontSize: 16, mr: 1, color: "text.secondary" }} />
                    <Typography variant="caption" color="text.secondary">
                      詳細を見る
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        ))}      </Grid>

      {/* Floating Action Button to navigate to admin */}
      <Tooltip title="管理画面へ">
        <Fab
          color="secondary"
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
          onClick={() => navigate("/admin")}
        >
          <SettingsIcon />
        </Fab>
      </Tooltip>
    </Container>
  );
}
