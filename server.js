/**
 * =====================================================
 * DSI – DEMO BACKEND
 * FICTIEF | EDUCATIEF
 * =====================================================
 */

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./dsi.db");
const SECRET = "DEMO_SECRET";
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

/* ================= DATABASE ================= */

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vtas (
    id INTEGER PRIMARY KEY,
    person TEXT,
    status TEXT,
    notes TEXT
  )`);

  db.run(`
    INSERT OR IGNORE INTO users (id, username, password, role)
    VALUES (
      1,
      'admin',
      '${bcrypt.hashSync("admin", 10)}',
      'admin'
    )
  `);
});

/* ================= AUTH ================= */

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.sendStatus(401);

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

/* ================= ROUTES ================= */

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (!user) return res.sendStatus(401);

      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign(
          { username: user.username, role: user.role },
          SECRET
        );
        res.json({ token });
      } else {
        res.sendStatus(401);
      }
    }
  );
});

app.get("/api/vtas", auth, (req, res) => {
  db.all("SELECT * FROM vtas", (err, rows) => res.json(rows));
});

app.post("/api/vtas", auth, (req, res) => {
  const { person, status, notes } = req.body;
  db.run(
    "INSERT INTO vtas (person, status, notes) VALUES (?,?,?)",
    [person, status, notes]
  );
  res.sendStatus(201);
});

/* ================= START ================= */

app.listen(PORT, () =>
  console.log(`DSI demo site: http://localhost:${PORT}`)
);
