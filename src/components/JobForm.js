import React, { useState } from "react";
import { Box, TextField, Button, MenuItem, Typography } from "@mui/material";
import { JOB_CATEGORIES } from "../constants";

export default function JobForm({ onSave }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(JOB_CATEGORIES[0]);
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ title, category, description });
    setTitle("");
    setCategory(JOB_CATEGORIES[0]);
    setDescription("");
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
      <Typography variant="h6" mb={2}>求人情報を追加</Typography>

      <TextField
        label="職種名"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
        margin="normal"
        required
      />

      <TextField
        select
        label="カテゴリー"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        fullWidth
        margin="normal"
        required
      >
        {JOB_CATEGORIES.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="仕事内容"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        fullWidth
        margin="normal"
        multiline
        minRows={4}
        required
      />

      <Button type="submit" variant="contained" sx={{ mt: 3 }}>
        登録
      </Button>
    </Box>
  );
}
