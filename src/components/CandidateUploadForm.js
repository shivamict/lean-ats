/* global mammoth, pdfjsLib */
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  InputLabel,
} from "@mui/material";
import { db } from "../firebase";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function CandidateUploadForm() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [resume, setResume] = useState(null);
  const [error, setError] = useState("");

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

    if (!selectedJob || !resume || !name || !email) {
      return setError("All fields are required.");
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

      alert("Candidate evaluated and saved successfully!");

      setName("");
      setEmail("");
      setResume(null);
      fileInputRef.current.value = null; // Reset file input
    } catch (err) {
      console.error(err);
      setError("Failed to process or evaluate the resume.");
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

  if (jobs.length === 0) {
    return <Typography>Loading jobs...</Typography>;
  }

  return (
    <Box sx={{ mt: 6 }}>
      <Typography variant="h6" gutterBottom>
        応募者の履歴書をアップロード（評価のみ）
      </Typography>

      <form onSubmit={handleUpload}>
        <TextField
          id="candidate-name"
          label="応募者の氏名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="normal"
          required
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
        />

        <TextField
          id="job-select"
          select
          label="応募先の職種"
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          fullWidth
          margin="normal"
          required
        >
          {jobs.map((job) => (
            <MenuItem key={job.id} value={job.id}>
              {job.title}（{job.category}）
            </MenuItem>
          ))}
        </TextField>

        <InputLabel htmlFor="resume-upload" sx={{ mt: 2, mb: 1 }}>
          履歴書（PDF または DOC）
        </InputLabel>
        <input
          id="resume-upload"
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => setResume(e.target.files[0])}
          style={{ marginTop: "8px" }}
          required
          ref={fileInputRef}
        />

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        <Button type="submit" variant="contained" sx={{ mt: 3 }}>
          アップロードして評価
        </Button>
      </form>
    </Box>
  );
}
