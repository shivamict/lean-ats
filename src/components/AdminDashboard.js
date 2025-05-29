import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { db } from "../firebase";
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
  Fab,
  Tooltip,
} from "@mui/material";
import PeopleIcon from "@mui/icons-material/People";
import JobForm from "./JobForm";
import CandidateUploadForm from "./CandidateUploadForm";
import CandidateList from "./CandidateList";
import CandidateScoreChart from "./CandidateScoreChart";
import { scoreCandidate } from "../utils/scoreCandidateWithChatGPT";

export default function AdminDashboard({ 
  user, 
  t, 
  snackbar, 
  showSnackbar, 
  closeSnackbar 
}) {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [candidateScores, setCandidateScores] = useState({});
  const [loadingScores, setLoadingScores] = useState({});

  useEffect(() => {
    const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setJobs(jobsData);
    });

    return () => unsubscribe();
  }, []);

  const saveJob = async (jobData) => {
    try {
      await addDoc(collection(db, "jobs"), {
        ...jobData,
        createdAt: new Date(),
      });
      showSnackbar("Job saved successfully", "success");
    } catch (error) {
      console.error("Error saving job:", error);
      showSnackbar("Error saving job", "error");
    }
  };

  const fetchCandidateScores = async (jobId) => {
    setLoadingScores(prev => ({ ...prev, [jobId]: true }));
    try {
      const q = query(collection(db, "candidates"), where("jobId", "==", jobId));
      const snapshot = await getDocs(q);
      const candidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCandidateScores(prev => ({ ...prev, [jobId]: candidates }));
    } catch (error) {
      console.error("Error fetching candidate scores:", error);
      showSnackbar("Error fetching candidate scores", "error");
    }
    setLoadingScores(prev => ({ ...prev, [jobId]: false }));
  };

  const handleScoreAll = async () => {
    try {
      const candidatesQuery = query(collection(db, "candidates"));
      const candidatesSnapshot = await getDocs(candidatesQuery);
      
      const jobsQuery = query(collection(db, "jobs"));
      const jobsSnapshot = await getDocs(jobsQuery);
      const jobsMap = {};
      jobsSnapshot.docs.forEach(doc => {
        jobsMap[doc.id] = doc.data();
      });

      for (const candidateDoc of candidatesSnapshot.docs) {
        const candidate = candidateDoc.data();
        const job = jobsMap[candidate.jobId];
        
        if (job && candidate.resumeText) {
          try {
            const result = await scoreCandidate(candidate.resumeText, job);
            await updateDoc(doc(db, "candidates", candidateDoc.id), {
              score: result.score,
              recommendation: result.recommendation,
              scoredAt: new Date(),
            });
          } catch (error) {
            console.error(`Error scoring candidate ${candidateDoc.id}:`, error);
          }
        }
      }
      
      showSnackbar("All candidates scored successfully", "success");
    } catch (error) {
      console.error("Error scoring all candidates:", error);
      showSnackbar("Error scoring candidates", "error");
    }
  };

  return (
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
      </Button>      {/* Floating Action Button to navigate to candidates list */}
      <Tooltip title="候補者一覧を見る">
        <Fab
          color="primary"
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
          onClick={() => navigate("/candidates")}
        >
          <PeopleIcon />
        </Fab>
      </Tooltip>
    </Container>
  );
}
