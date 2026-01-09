/**
 * =====================================================
 * DSI – Dienst Speciale Interventies
 * FICTIEVE DEMO WEBAPPLICATIE
 * -----------------------------------------------------
 * ⚠️ Niet voor echt gebruik
 * =====================================================
 */

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const db = new sqlite3.Database("./dsi.db");
const PORT = 3000;
const SECRET = "DEMO_SECRET";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= DATABASE ================= */

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY,
    name TEXT,
    alias TEXT,
    status TEXT,
    risk TEXT
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
  const token = req.headers.authorization || req.query.token;
  if (!token) return res.redirect("/login");

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.redirect("/login");
  }
}

/* ================= WEBSITE ================= */

app.get("/login", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>DSI Login</title>
    <style>
      body { font-family: Arial; background:#111; color:#fff; }
      .box { width:300px; margin:100px auto; }
      input, button { width:100%; padding:8px; margin:5px 0; }
    </style>
  </head>
  <body>
    <div class="box">
      <h2>DSI – Interne Login</h2>
      <form method="POST" action="/login">
        <input name="username" placeholder="Gebruikersnaam" />
        <input type="password" name="password" placeholder="Wachtwoord" />
        <button>Login</button>
      </form>
    </div>
  </body>
  </html>
  `);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (!user) return res.redirect("/login");

      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign(
          { username: user.username, role: user.role },
          SECRET
        );
        res.redirect(`/dashboard?token=${token}`);
      } else {
        res.redirect("/login");
      }
    }
  );
});

/* ================= DASHBOARD ================= */

app.get("/dashboard", auth, (req, res) => {
  db.all("SELECT * FROM vtas", (err, vtas) => {
    res.send(`
    <html>
    <head>
      <title>DSI Dashboard</title>
      <style>
        body { font-family: Arial; background:#f4f4f4; }
        header { background:#222; color:#fff; padding:10px; }
        section { padding:20px; }
        table { width:100%; background:#fff; border-collapse:collapse; }
        td, th { border:1px solid #ccc; padding:8px; }
      </style>
    </head>
    <body>
      <header>
        <h2>DSI Dashboard</h2>
        <small>Gebruiker: ${req.user.username}</small>
      </header>

      <section>
        <h3>Nieuwe VTA</h3>
        <form method="POST" action="/vta?token=${req.query.token}">
          <input name="person" placeholder="Persoon" />
          <input name="status" placeholder="Status" />
          <textarea name="notes" placeholder="Notities"></textarea>
          <button>Aanmaken</button>
        </form>

        <h3>Openstaande VTA's</h3>
        <table>
          <tr><th>ID</th><th>Persoon</th><th>Status</th></tr>
          ${vtas.map(v =>
            `<tr><td>${v.id}</td><td>${v.person}</td><td>${v.status}</td></tr>`
          ).join("")}
        </table>
      </section>
    </body>
    </html>
    `);
  });
});

/* ================= VTA ================= */

app.post("/vta", auth, (req, res) => {
  const { person, status, notes } = req.body;
  db.run(
    "INSERT INTO vtas (person, status, notes) VALUES (?,?,?)",
    [person, status, notes]
  );
  res.redirect(`/dashboard?token=${req.query.token}`);
});

/* ================= START ================= */

app.listen(PORT, () =>
  console.log(`DSI demo site actief op http://localhost:${PORT}`)
);
