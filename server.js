require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const allowedOrigins = require("./config/cors");
const userRoutes = require("./routes/user.routes");
const adminRoutes = require("./routes/admin.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const app = express();

// Allows express-rate-limit to correctly identify users by their real client IP
// instead of the proxy's IP, resolving the ERR_ERL_UNEXPECTED_X_FORWARDED_FOR error.
app.set("trust proxy", 1);

connectDB();

app.use(helmet());

app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : {}));

// app.use(cors());

app.use(express.json({ limit: "10kb" }));
// Strips any request key starting with "$" or containing "." (e.g. {"mobile":{"$gt":""}})
// so user-controlled input can never be interpreted as a Mongo query operator.
app.use(mongoSanitize());

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
});
app.use("/api/users", (req, res, next) =>
  req.method === "GET" ? next() : writeLimiter(req, res, next),
);

app.use("/api/users", userRoutes);

// Narrow brute-force window on login specifically, on top of the general write limiter.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts, please try again later" },
});
app.use("/api/admins/login", loginLimiter);
app.use("/api/admins", (req, res, next) =>
  req.method === "GET" ? next() : writeLimiter(req, res, next),
);

app.use("/api/admins", adminRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.get("/", (req, res) => {
  res.send("CPM backend API is running");
});

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({ message: "Request body too large" });
  }
  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({ message: "Malformed JSON body" });
  }
  console.error(err);
  res
    .status(err.status || err.statusCode || 500)
    .json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
