import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

const port = Number(process.env.PORT || 8787);
const model = process.env.OPENAI_MODEL || "gpt-5-mini";
const projectRoot = path.resolve(new URL("..", import.meta.url).pathname, "..");
const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.get("/health", (_req, res) => {
  res.json({ ok: true, configured: Boolean(client), model });
});

function cleanModelJson(text) {
  const trimmed = String(text || "").trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

app.post("/api/auto-fix", async (req, res) => {
  try {
    if (!client) return res.status(503).json({ ok: false, error: "OPENAI_API_KEY chưa được cấu hình trên server." });

    const { error, source, line, column, stack, snippets = [] } = req.body || {};
    if (!error && !stack) return res.status(400).json({ ok: false, error: "Thiếu thông tin lỗi." });

    const prompt = `Bạn là kỹ sư sửa lỗi cho ứng dụng JavaScript ThuChi. Phân tích lỗi dưới đây và trả về DUY NHẤT JSON hợp lệ, không markdown.

LỖI: ${String(error || "")}
FILE: ${String(source || "")}
LINE: ${String(line || "")}
COLUMN: ${String(column || "")}
STACK: ${String(stack || "")}
SNIPPETS: ${JSON.stringify(snippets).slice(0, 12000)}

JSON schema:
{
  "fixed": boolean,
  "confidence": number,
  "reason": string,
  "file": string,
  "line": number|null,
  "patch": {"find": string, "replace": string}|null,
  "validation": [string],
  "warnings": [string]
}

Quy tắc: chỉ đề xuất patch nhỏ nhất cần thiết; không đổi API/database/logic không liên quan; nếu chưa đủ ngữ cảnh thì fixed=false và patch=null.`;

    const response = await client.responses.create({ model, input: prompt, temperature: 0.1 });
    let data;
    try { data = JSON.parse(cleanModelJson(response.output_text)); }
    catch { return res.status(502).json({ ok: false, error: "AI trả về dữ liệu không phải JSON hợp lệ.", raw: response.output_text }); }

    res.json({ ok: true, result: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.post("/api/validate", async (req, res) => {
  try {
    const { code, filename = "temp.js" } = req.body || {};
    if (typeof code !== "string") return res.status(400).json({ ok: false, error: "code phải là chuỗi." });
    const tmp = path.join(process.cwd(), `.autofix-${Date.now()}-${path.basename(filename)}`);
    await fs.writeFile(tmp, code, "utf8");
    try {
      await execFileAsync(process.execPath, ["--check", tmp]);
      res.json({ ok: true, valid: true });
    } catch (e) {
      res.json({ ok: true, valid: false, error: e.stderr || e.stdout || e.message });
    } finally {
      await fs.rm(tmp, { force: true });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.listen(port, () => console.log(`ThuChi Auto Fix: http://localhost:${port}`));
