require('dotenv').config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

// Import the real scoring logic as a function
const scoreCandidateHandler = require("./src/pages/api/scoreCandidate.cjs");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Use the real scoring logic for the API endpoint
app.post("/api/scoreCandidate", async (req, res) => {
  const { candidateText, job } = req.body;
  if (!candidateText || !job) {
    return res.status(400).json({ error: "Missing data" });
  }
  try {
    // Call the real scoring function
    const result = await scoreCandidateHandler(candidateText, job);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scoring failed" });
  }
});

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});