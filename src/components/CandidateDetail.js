import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Avatar,
  Button,
  Grid,
  Divider,
  Paper,
  CircularProgress,
  Fade,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  Assessment as AssessmentIcon,
  Star as StarIcon,
  CalendarToday as CalendarIcon,
} from "@mui/icons-material";

export default function CandidateDetail() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [candidate, setCandidate] = useState(location.state?.candidate || null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(!candidate);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // If candidate data isn't in state, fetch it
        if (!candidate) {
          const candidateDoc = await getDoc(doc(db, "candidates", candidateId));
          if (candidateDoc.exists()) {
            setCandidate({ id: candidateDoc.id, ...candidateDoc.data() });
          }
        }

        // Fetch job data if candidate exists
        if (candidate?.jobId || (candidate && candidate.jobId)) {
          const jobId = candidate?.jobId || candidate.jobId;
          const jobDoc = await getDoc(doc(db, "jobs", jobId));
          if (jobDoc.exists()) {
            setJob({ id: jobDoc.id, ...jobDoc.data() });
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [candidateId, candidate]);

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
  const formatDate = (timestamp) => {
    if (!timestamp) return "日付不明";
    
    let date;
    try {
      // Handle Firestore Timestamp
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      }
      // Handle timestamp in seconds (Firestore format)
      else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      }
      // Handle regular timestamp
      else {
        date = new Date(timestamp);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "日付不明";
      }
      
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "日付不明";
    }
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

  if (!candidate) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <Typography variant="h5" color="error">
          候補者が見つかりません
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
          sx={{ mt: 2 }}
        >
          ホームに戻る
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Fade in={true} timeout={600}>
        <Box>
          {/* Header with back button */}
          <Box sx={{ mb: 4 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/")}
              sx={{ mb: 2 }}
            >
              候補者一覧に戻る
            </Button>
          </Box>

          {/* Main candidate info card */}
          <Card elevation={4} sx={{ mb: 4, borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={4} sx={{ textAlign: "center" }}>
                  <Avatar
                    sx={{
                      bgcolor: getScoreColor(candidate.score) + ".main",
                      mx: "auto",
                      mb: 2,
                      width: 100,
                      height: 100,
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 50 }} />
                  </Avatar>
                  <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                    {candidate.name}
                  </Typography>
                  <Chip
                    icon={<StarIcon />}
                    label={`${candidate.score}点 - ${getScoreLabel(candidate.score)}`}
                    color={getScoreColor(candidate.score)}
                    size="large"
                    sx={{ fontWeight: "bold", fontSize: "1rem" }}
                  />
                </Grid>

                <Grid item xs={12} md={8}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <EmailIcon sx={{ mr: 1, color: "primary.main" }} />
                          <Typography variant="subtitle2" color="text.secondary">
                            メールアドレス
                          </Typography>
                        </Box>
                        <Typography variant="body1" fontWeight="medium">
                          {candidate.email}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <WorkIcon sx={{ mr: 1, color: "primary.main" }} />
                          <Typography variant="subtitle2" color="text.secondary">
                            応募職種
                          </Typography>
                        </Box>
                        <Typography variant="body1" fontWeight="medium">
                          {job?.title || "読み込み中..."}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {job?.category}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12}>
                      <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <CalendarIcon sx={{ mr: 1, color: "primary.main" }} />
                          <Typography variant="subtitle2" color="text.secondary">
                            評価日時
                          </Typography>
                        </Box>
                        <Typography variant="body1" fontWeight="medium">
                          {formatDate(candidate.evaluatedAt)}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* AI Evaluation Details */}
          <Card elevation={4} sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <AssessmentIcon sx={{ mr: 2, color: "primary.main", fontSize: 32 }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  AI評価レポート
                </Typography>
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  background: "linear-gradient(145deg, #f5f7fa 0%, #c3cfe2 100%)"
                }}
              >
                <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
                  総合評価コメント
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    fontSize: "1.1rem"
                  }}
                >
                  {candidate.recommendation || "評価コメントがありません"}
                </Typography>
              </Paper>

              {job && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    応募職種の詳細
                  </Typography>
                  <Paper elevation={1} sx={{ p: 3, borderRadius: 2 }}>
                    <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                      {job.description}
                    </Typography>
                    {job.requirements && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          必要スキル・要件:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {job.requirements}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Fade>
    </Container>
  );
}
