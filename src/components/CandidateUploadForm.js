import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  Fade,
  LinearProgress,
  Alert,
} from "@mui/material";
import {
  Upload as UploadIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Email as EmailIcon,
  Description as DescriptionIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import { db } from "../firebase";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

export default function CandidateUploadForm() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resume, setResume] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchJobs = async () => {
      const snapshot = await getDocs(collection(db, "jobs"));
      const jobsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setJobs(jobsList);
      if (jobsList.length) setSelectedJob(jobsList[0].id);
    };
    fetchJobs();
  }, []);
  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!selectedJob || !resume || !name || !email) {
      setError("All fields are required.");
      setLoading(false);
      return;
    }

    try {
      const arrayBuffer = await readFileAsArrayBuffer(resume);
      let content = "";

      if (resume.type === "application/pdf") {
        content = await extractPdfText(arrayBuffer);
      } else if (resume.name.endsWith(".docx")) {
        content = await extractDocxText(arrayBuffer);
      } else {
        throw new Error("Unsupported file type");
      }

      console.log("Extracted resume text:", content.slice(0, 500));

      const job = jobs.find((j) => j.id === selectedJob);
      if (!job) throw new Error("Selected job not found");

      const response = await fetch("http://localhost:3003/api/scoreCandidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateText: content, job }),
      });

      if (!response.ok) {
        throw new Error("Error from scoring API");
      }

      const result = await response.json();

      if (
        typeof result.score !== "number" ||
        isNaN(result.score) ||
        !result.recommendation
      ) {
        setError("Scoring API did not return a valid score or recommendation.");
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "candidates"), {
        jobId: selectedJob,
        name,
        email,
        score: result.score,
        recommendation: result.recommendation,
        evaluatedAt: Timestamp.now(),
        resumeText: content,
      });

      setSuccess(true);
      setName("");
      setEmail("");
      setResume(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "An error occurred during upload.");
    } finally {
      setLoading(false);
    }
  };

  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const extractDocxText = (arrayBuffer) => {
    return mammoth
      .extractRawText({ arrayBuffer })
      .then((result) => result.value)
      .catch((error) => {
        console.error("Error extracting .docx text:", error);
        throw error;
      });
  };

  const extractPdfText = (arrayBuffer) => {
    return pdfjsLib
      .getDocument(arrayBuffer).promise
      .then((pdf) => {
        const numPages = pdf.numPages;
        const pagePromises = [];

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          pagePromises.push(
            pdf.getPage(pageNum).then((page) => {
              return page.getTextContent().then((textContent) => {
                return textContent.items.map((item) => item.str).join(" ");
              });
            })
          );
        }

        return Promise.all(pagePromises);
      })
      .then((pages) => pages.join(" "))
      .catch((error) => {
        console.error("Error extracting PDF text:", error);
        throw error;
      });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setResume(file);
    setError("");
  };

  const removeFile = () => {
    setResume(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  if (jobs.length === 0) {
    return (
      <Card sx={{ mt: 4, p: 4, textAlign: "center" }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="h6">Loading jobs...</Typography>
      </Card>
    );
  }

  return (
    <Fade in={true} timeout={800}>
      <Card 
        elevation={3} 
        sx={{ 
          mt: 4, 
          borderRadius: 3,
          background: 'linear-gradient(145deg, #f5f7fa 0%, #c3cfe2 100%)',
          overflow: 'visible'
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Avatar 
              sx={{ 
                bgcolor: "primary.main", 
                mx: "auto", 
                mb: 2, 
                width: 64, 
                height: 64,
                boxShadow: 3
              }}
            >
              <PersonIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              候補者登録
            </Typography>
            <Typography variant="body1" color="text.secondary">
              履歴書をアップロードしてAI評価を受けましょう
            </Typography>
          </Box>

          {success && (
            <Fade in={success}>
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                候補者が正常に登録され、評価が完了しました！
              </Alert>
            </Fade>
          )}

          <form onSubmit={handleUpload}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <PersonIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="subtitle1" fontWeight="medium">
                    基本情報
                  </Typography>
                </Box>
                <TextField
                  id="candidate-name"
                  label="応募者の氏名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                  margin="normal"
                  required
                  variant="outlined"
                  sx={{ 
                    "& .MuiOutlinedInput-root": { 
                      borderRadius: 2,
                      backgroundColor: "white" 
                    } 
                  }}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: "action.active" }} />
                  }}
                />

                <TextField
                  id="candidate-email"
                  label="メールアドレス"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  margin="normal"
                  required
                  variant="outlined"
                  sx={{ 
                    "& .MuiOutlinedInput-root": { 
                      borderRadius: 2,
                      backgroundColor: "white" 
                    } 
                  }}
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ mr: 1, color: "action.active" }} />
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <WorkIcon sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="subtitle1" fontWeight="medium">
                    応募情報
                  </Typography>
                </Box>
                <TextField
                  id="job-select"
                  select
                  label="応募先の職種"
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  fullWidth
                  margin="normal"
                  required
                  variant="outlined"
                  sx={{ 
                    "& .MuiOutlinedInput-root": { 
                      borderRadius: 2,
                      backgroundColor: "white" 
                    } 
                  }}
                  InputProps={{
                    startAdornment: <WorkIcon sx={{ mr: 1, color: "action.active" }} />
                  }}
                >
                  {jobs.map((job) => (
                    <MenuItem key={job.id} value={job.id}>
                      {job.title}（{job.category}）
                    </MenuItem>
                  ))}
                </TextField>

                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <DescriptionIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="subtitle1" fontWeight="medium">
                      履歴書アップロード
                    </Typography>
                  </Box>
                  
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      p: 3, 
                      textAlign: "center", 
                      cursor: "pointer",
                      borderRadius: 2,
                      borderStyle: "dashed",
                      borderWidth: 2,
                      backgroundColor: "white",
                      "&:hover": { 
                        backgroundColor: "action.hover",
                        borderColor: "primary.main" 
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      id="resume-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                      required
                      ref={fileInputRef}
                    />
                    
                    {resume ? (
                      <Box>
                        <DescriptionIcon sx={{ fontSize: 48, color: "success.main", mb: 1 }} />
                        <Typography variant="h6" color="success.main">
                          ファイルが選択されました
                        </Typography>
                        <Chip
                          label={resume.name}
                          onDelete={removeFile}
                          deleteIcon={<CloseIcon />}
                          color="primary"
                          variant="outlined"
                          sx={{ mt: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {Math.round(resume.size / 1024)} KB
                        </Typography>
                      </Box>
                    ) : (
                      <Box>
                        <UploadIcon sx={{ fontSize: 48, color: "action.active", mb: 1 }} />
                        <Typography variant="h6" gutterBottom>
                          履歴書をアップロード
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          PDF または DOC ファイルをクリックして選択
                        </Typography>
                      </Box>
                    )}
                  </Card>
                </Box>
              </Grid>
            </Grid>

            {loading && (
              <Box sx={{ mt: 3 }}>
                <LinearProgress sx={{ borderRadius: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
                  履歴書を分析中です...
                </Typography>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ textAlign: "center", mt: 4 }}>
              <Button 
                type="submit" 
                variant="contained" 
                size="large"
                disabled={loading || jobs.length === 0}
                sx={{ 
                  px: 6, 
                  py: 2, 
                  borderRadius: 3,
                  fontSize: "1.1rem",
                  fontWeight: "bold",
                  background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                  boxShadow: "0 3px 5px 2px rgba(33, 203, 243, .3)",
                  "&:hover": {
                    background: "linear-gradient(45deg, #1976D2 30%, #1E88E5 90%)",
                  }
                }}
                startIcon={loading ? <LinearProgress /> : <UploadIcon />}
              >
                {loading ? "評価中..." : "アップロードして評価"}
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Fade>
  );
}
