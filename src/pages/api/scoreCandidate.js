import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { candidateText, job } = req.body;

  if (!candidateText || !job) {
    return res.status(400).json({ error: "Missing candidateText or job" });
  }

  try {
    const prompt = `
職種の説明:
${job.title}（${job.category}）
${job.description}

応募者の履歴書内容:
${candidateText}

この職種に対してこの応募者のマッチ度を1〜100点で評価してください。

次のJSON形式で出力してください:

{
  "score": <数値のスコア>,
  "recommendation": "<以下の内容を含む日本語の詳細な推薦コメントを1つの文字列でまとめてください:
  - 応募者のスキルと職務要件の一致度（10点満点）
  - 業務経験の関連性（10点満点）
  - 教育・資格の適合性（10点満点）
  - 職務記述の明瞭さ・説得力（10点満点）
  - 書類全体の構成・コミュニケーション力（10点満点）
  - 強み（良い点）
  - 弱み（改善点）
  - 総合的な推薦コメント）"
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const rawResult = response.choices[0].message.content;

    // Parse JSON
    let result = { score: null, recommendation: "" };
    try {
      const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(rawResult);
      }
    } catch (e) {
      result.recommendation = rawResult;
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("OpenAI API error:", error);
    return res.status(500).json({ error: "OpenAI API error" });
  }
}
