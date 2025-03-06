const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB接続設定
const MONGO_URL = process.env.MONGODB_URI || "mongodb+srv://your_connection_string";

// Mongooseの接続オプション
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // タイムアウトを5秒に設定
  socketTimeoutMS: 45000, // ソケットタイムアウトを45秒に設定
};

// MongoDBへの接続を管理する関数
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(MONGO_URL, mongooseOptions);
    isConnected = true;
    console.log("✅ MongoDB Atlasに接続しました");
  } catch (error) {
    console.error("❌ MongoDB接続失敗:", error);
    isConnected = false;
  }
};

// CORS設定
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Body Parser
app.use(express.json());

// ルートパスへのアクセス
app.get("/", (req, res) => {
  res.json({ 
    message: "Weight Management API is running",
    endpoints: {
      health: "/api/health",
      weights: "/api/weights"
    }
  });
});

// 体重データのMongooseモデル
const weightSchema = new mongoose.Schema({
  date: String,
  weight: Number,
});

const Weight = mongoose.model("Weight", weightSchema);

// ヘルスチェックエンドポイント
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 特定の期間の体重一覧を取得するAPIエンドポイント
app.get("/api/weights", async (req, res) => {
  try {
    await connectDB();
    const { startDate, endDate } = req.query;
    
    let query = {};
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const weights = await Weight.find(query).sort({ date: -1 });
    res.json(weights);
  } catch (error) {
    console.error("データの取得に失敗しました:", error);
    res.status(500).json({ error: "データの取得に失敗しました" });
  }
});

// 体重データを追加・更新するAPIエンドポイント
app.post("/api/weights", async (req, res) => {
  try {
    await connectDB();
    const { date, weight } = req.body;

    if (!date || !weight) {
      return res.status(400).json({ error: "日付と体重は必須です" });
    }

    const existingWeight = await Weight.findOne({ date });
    
    if (existingWeight) {
      existingWeight.weight = weight;
      await existingWeight.save();
      res.json(existingWeight);
    } else {
      const newWeight = new Weight({ date, weight });
      await newWeight.save();
      res.json(newWeight);
    }
  } catch (error) {
    console.error("データの保存に失敗しました:", error);
    res.status(500).json({ error: "データの保存に失敗しました" });
  }
});

// Vercelのサーバーレス関数として実行するための設定
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`🚀 APIサーバーが http://localhost:${PORT} で起動しました`);
  });
}
  