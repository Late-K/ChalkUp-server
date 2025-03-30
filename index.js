const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: true,
  },
});

// test
pool
  .getConnection()
  .then(() => console.log("Connected to Azure MySQL Database"))
  .catch((err) => console.error("Database connection error:", err));

// default route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// fetch all users
app.get("/user", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// fetch all climbs
app.get("/climbs", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM climbs");
    res.json(rows);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// fetch all turtorials
app.get("/tutorials", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tutorials");
    res.json(rows);
  } catch (err) {
    console.error("Database query error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// fetch climbs by UserID
app.get("/climbs/:UserID", async (req, res) => {
  const userId = req.params.UserID;
  try {
    const [rows] = await pool.query("SELECT * FROM climbs WHERE UserID = ?", [
      userId,
    ]);
    res.json(rows);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).send("Database error");
  }
});

// fetch user by ID
app.get("/user/:ID", async (req, res) => {
  const userId = req.params.ID;
  try {
    const [row] = await pool.query("SELECT * FROM users WHERE ID = ?", [
      userId,
    ]);
    res.json(row[0]);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).send("Database error");
  }
});

// save climb data
app.post("/climbs", async (req, res) => {
  const { difficulty, description, flash, completed, userID } = req.body;
  const query = `
    INSERT INTO climbs (Difficulty, Description, Flashed, Completed, UserID, UploadDateTime)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;
  const params = [difficulty, description, flash, completed, userID];

  try {
    const [result] = await pool.query(query, params);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error("Insert error:", err);
    res.status(500).send("Database error");
  }
});

//delete climb
app.delete("/climbs/:UserID/:ClimbID", async (req, res) => {
  const { UserID, ClimbID } = req.params;
  try {
    const [result] = await pool.query(
      "DELETE FROM climbs WHERE UserID = ? AND ID = ?",
      [UserID, ClimbID]
    );
    if (result.affectedRows > 0) {
      res.status(200).send("Climb deleted successfully");
    } else {
      res.status(404).send("Climb not found");
    }
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).send("Database error");
  }
});

// save user data
app.post("/user", async (req, res) => {
  const { googleId, name, email, photo } = req.body;

  const query = `
    INSERT INTO users (GoogleID, Name, Email, Photo)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE Name = VALUES(Name), Email = VALUES(Email), Photo = VALUES(Photo)
  `;
  const params = [googleId, name, email, photo];

  try {
    await pool.query(query, params);
    const [rows] = await pool.query("SELECT ID FROM users WHERE GoogleID = ?", [
      googleId,
    ]);
    const userId = rows[0]?.ID;
    res.status(201).json({ id: userId });
  } catch (err) {
    console.error("Insert error:", err);
    res.status(500).send("Database error");
  }
});

// global error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({ error: "Something went wrong!" });
});

// start the server
app.listen(port, () => {
  console.log(`App running on http://localhost:${port}`);
});

// get average difficulty by month
app.get("/climbs/average/:UserID", async (req, res) => {
  const UserId = req.params.UserID;

  const query = `
    SELECT 
      strftime('%Y-%m', UploadDateTime) AS month, 
      AVG (Difficulty) AS average
    FROM climbs
    WHERE UserID = ?
    GROUP BY month
  `;

  try {
    const [rows] = await pool.query(query, [userId]);
    res.json(rows);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
