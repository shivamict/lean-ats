import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Paper, Typography } from "@mui/material";

export default function CandidateScoreChart({ candidates }) {
  // candidates: [{ name: "Tanaka", score: 85 }, { name: "Saito", score: 73 }, ...]

  if (!candidates || candidates.length === 0) {
    return <Typography>スコア付き候補者がまだいません。</Typography>;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        mt: 2,
        mb: 4,
        backgroundColor: "#f9f9f9",
        borderRadius: 2,
      }}
    >
      <Typography variant="subtitle1" gutterBottom>
        候補者スコア比較
      </Typography>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={candidates}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-35}
            textAnchor="end"
            interval={0}
            height={60}
            tick={{ fontSize: 12 }}
          />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Bar dataKey="score" fill="#1976d2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
