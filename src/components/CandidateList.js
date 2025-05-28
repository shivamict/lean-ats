import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  List,
  ListItem,
  Typography,
  Box,
  Chip,
  Divider,
} from "@mui/material";

export default function CandidateList({ jobId }) {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    if (!jobId) return;

    const q = query(collection(db, "candidates"), where("jobId", "==", jobId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCandidates(data);
    });

    return () => unsubscribe();
  }, [jobId]);

  if (candidates.length === 0) {
    return <Typography sx={{ mt: 1 }}>候補者がまだ登録されていません。</Typography>;
  }

  return (
    <List dense sx={{ bgcolor: "#fafafa", borderRadius: 1, mb: 2 }}>
      {candidates.map(({ id, name, score, recommendation }) => (
        <React.Fragment key={id}>
          <ListItem
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              p: 2,
              bgcolor: "#fff",
              borderRadius: 1,
              mb: 1,
              boxShadow: 1,
            }}
          >
            <Box sx={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {name}
              </Typography>

              {/* Show Score if exists */}
              {score !== undefined && (
                <Chip
                  label={`スコア: ${score}`}
                  color={score >= 70 ? "success" : score >= 40 ? "warning" : "error"}
                  size="small"
                />
              )}
            </Box>

            {/* Recommendation Text */}
            {recommendation && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                推薦コメント: {recommendation}
              </Typography>
            )}
          </ListItem>
          <Divider />
        </React.Fragment>
      ))}
    </List>
  );
}
