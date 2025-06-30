import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import nanoPkg from 'nano';

const username = process.env.COUCHDB_USER || "admin";
const password = encodeURIComponent(process.env.COUCHDB_PASSWORD || "admin");
const nano = nanoPkg(`http://${username}:${password}@34.100.254.85:5984`); // CouchDB URL with admin credentials

const app = express();
app.use(cors());
app.use(bodyParser.json());

const dbName = 'users';
let db;

(async () => {
  try {
    const dbList = await nano.db.list();
    if (!dbList.includes(dbName)) {
      await nano.db.create(dbName);
    }
    db = nano.db.use(dbName);

    // Ensure index on email for login queries
    await db.createIndex({ index: { fields: ['email'] } });

    // Start the server only after db and index are ready
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Error connecting to CouchDB:', err);
  }
})();

app.post('/users', async (req, res) => {
  console.log('POST /users called', req.body); // Log incoming request
  if (!db) {
    console.error('DB is not initialized');
    return res.status(503).json({ error: 'Database not ready. Please try again later.' });
  }
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    // Check if user already exists with the same email
    const existing = await db.find({ selector: { email } });
    if (existing.docs.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }
    const response = await db.insert({ email, password });
    res.status(201).json(response);
  } catch (err) {
    console.error('Error inserting user:', err);
    res.status(500).json({ error: err.message, details: err });
  }
});

app.get('/users', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not ready. Please try again later.' });
  }
  try {
    const result = await db.list({ include_docs: true });
    res.json(result.rows.map(row => row.doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//LOGIN
app.post('/login', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not ready. Please try again later.' });
  }
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    // Find user by email
    const result = await db.find({
      selector: { email }
    });
    if (result.docs.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const user = result.docs[0];
    // Check password (plain text, for demo only)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    // Success
    res.json({ message: 'Login successful.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a catch-all route at the very end to help debug 404s
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});