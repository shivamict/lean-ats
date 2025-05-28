import { getDownloadURL, ref } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { storage, db } from "../firebase";
import * as pdfjsLib from "pdfjs-dist";

export async function extractTextFromPDF(fileUrl) {
  const loadingTask = pdfjsLib.getDocument(fileUrl);
  const pdf = await loadingTask.promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    text += pageText + "\n";
  }

  return text;
}

export async function scoreCandidate(candidate, job) {
  // Get resume text from Firebase Storage
  const resumeRef = ref(storage, candidate.fileURL);
  const resumeURL = await getDownloadURL(resumeRef);
  const resumeText = await extractTextFromPDF(resumeURL);

  // Call backend API route to score candidate
  const response = await fetch("http://localhost:3003/api/scoreCandidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidateText: resumeText, job }),
  });

  if (!response.ok) {
    throw new Error("Failed to score candidate");
  }

  const result = await response.json();

  // Save score & recommendation to Firestore
  const candidateRef = doc(db, "candidates", candidate.id);
  await updateDoc(candidateRef, {
    score: result.score,
    recommendation: result.recommendation,
    scoredAt: new Date(),
  });

  return result; // { score, recommendation }
}
