require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data.sqlite');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(DATABASE_PATH);

// Initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    service_id INTEGER,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year TEXT,
    phone TEXT,
    date TEXT,
    time TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(service_id) REFERENCES services(id)
  )`);

  // seed services
  db.get('SELECT COUNT(*) as cnt FROM services', (err, row) => {
    if (!err && row.cnt === 0) {
      const stmt = db.prepare('INSERT INTO services (name, description) VALUES (?,?)');
      const items = [
        ['Oil Service', 'Full oil change and filter replacement'],
        ['Engine Service', 'Engine diagnostics and tune-up'],
        ['Brake Service', 'Brake inspection and pad replacement'],
        ['Transmission Service', 'Transmission fluid and inspection'],
        ['Tire Service', 'Tire rotation, balancing and replacement'],
        ['Battery Service', 'Battery test and replacement'],
        ['AC Service', 'Air conditioning check and recharge'],
        ['Wheel Alignment', 'Front and rear wheel alignment'],
        ['Detailing', 'Full interior and exterior detailing'],
        ['Coolant Flush', 'Radiator and coolant system service']
      ];
      items.forEach(it => stmt.run(it[0], it[1]));
      stmt.finalize();
    }
  });

  // seed admin if none
  db.get('SELECT COUNT(*) as cnt FROM admins', (err, row) => {
    if (!err && row.cnt === 0) {
      const pw = bcrypt.hashSync('admin123', 10);
      db.run('INSERT INTO admins (username, password) VALUES (?,?)', ['admin', pw]);
      console.log('Seeded admin: username=admin password=admin123');
    }
  });
});

function generateToken(payload, expiresIn='7d'){
  return jwt.sign(payload, SECRET, { expiresIn });
}

function authMiddleware(req, res, next){
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid token' });
  const token = parts[1];
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
}

// Customer signup
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const hash = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (name, email, password) VALUES (?,?,?)', [name||'', email, hash], function(err){
    if (err) return res.status(400).json({ error: 'Email already registered' });
    const user = { id: this.lastID, name: name||'', email };
    const token = generateToken({ id: user.id, email: user.email, role:'customer' });
    res.json({ user, token });
  });
});

// Customer login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
    if (err || !row) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, row.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const user = { id: row.id, name: row.name, email: row.email };
    const token = generateToken({ id: user.id, email: user.email, role:'customer' });
    res.json({ user, token });
  });
});

// Get services
app.get('/api/services', (req, res) => {
  db.all('SELECT * FROM services', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

// Customer creates booking
app.post('/api/bookings', authMiddleware, (req, res) => {
  if (!req.user || req.user.role !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  const userId = req.user.id;
  const { service_id, vehicle_make, vehicle_model, vehicle_year, phone, date, time } = req.body;
  db.run(
    `INSERT INTO bookings (user_id, service_id, vehicle_make, vehicle_model, vehicle_year, phone, date, time) VALUES (?,?,?,?,?,?,?,?)`,
    [userId, service_id, vehicle_make, vehicle_model, vehicle_year, phone, date, time],
    function(err){
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ id: this.lastID, status: 'pending' });
    }
  );
});

// Get customer's bookings
app.get('/api/bookings', authMiddleware, (req, res) => {
  if (!req.user || req.user.role !== 'customer') return res.status(403).json({ error: 'Forbidden' });
  const userId = req.user.id;
  db.all(
    `SELECT b.*, s.name as service_name FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.user_id = ? ORDER BY b.created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json(rows);
    }
  );
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });
  db.get('SELECT * FROM admins WHERE username = ?', [username], async (err, row) => {
    if (err || !row) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, row.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = generateToken({ id: row.id, username: row.username, role:'admin' });
    res.json({ admin: { id: row.id, username: row.username }, token });
  });
});

// Admin: list bookings
app.get('/api/admin/bookings', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid token' });
  const token = parts[1];
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err || decoded.role !== 'admin') return res.status(401).json({ error: 'Invalid token or not admin' });
    db.all(`SELECT b.*, s.name as service_name, u.name as user_name, u.email as user_email FROM bookings b
            LEFT JOIN services s ON s.id = b.service_id
            LEFT JOIN users u ON u.id = b.user_id
            ORDER BY b.created_at DESC`,
      [],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB error' });
        res.json(rows);
      }
    );
  });
});

// Admin decision on booking
app.post('/api/admin/bookings/:id/decision', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'Invalid token' });
  const token = parts[1];
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err || decoded.role !== 'admin') return res.status(401).json({ error: 'Invalid token or not admin' });
    const id = req.params.id;
    const { decision } = req.body; // 'accepted' or 'rejected'
    if (!['accepted','rejected'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });
    db.run('UPDATE bookings SET status = ? WHERE id = ?', [decision, id], function(err){
      if (err) return res.status(500).json({ error: 'DB error' });
      res.json({ id, status: decision });
    });
  });
});

// Fallback to index
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[${NODE_ENV.toUpperCase()}] Server running on port ${PORT}`);
});
