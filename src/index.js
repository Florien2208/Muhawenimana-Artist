import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import cors from "cors";
import path from "path";
import appRouter from "./routes/index.js";
import { fileURLToPath } from "url";

dotenv.config();
connectDB();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", appRouter);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/", (_, res) => {
  res.send("🚀 Mudaheranwa API is running...");
});

const PORT = process.env.PORT 
if (!PORT) {
  console.error("❌ PORT not defined in .env file");
  process.exit(1);
}
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
