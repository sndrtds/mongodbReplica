const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(express.json({ limit: "100kb" }));

const PORT = Number(process.env.PORT || 3000);
const DB_NAME = process.env.DB_NAME || "biodiversity";
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0";

const client = new MongoClient(MONGODB_URI);
let species;

const ALLOWED_STATUSES = [
  "Least Concern",
  "Near Threatened",
  "Vulnerable",
  "Endangered",
  "Critically Endangered",
  "Extinct in the Wild",
  "Extinct",
  "Not Evaluated"
];

function validateSpecies(body, partial = false) {
  const errors = [];
  const allowedFields = ["name", "scientificName", "habitat", "status"];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["Request body must be a JSON object."];
  }

  for (const key of Object.keys(body)) {
    if (!allowedFields.includes(key)) errors.push(`Unknown field: ${key}`);
  }

  const required = ["name", "scientificName", "habitat", "status"];
  for (const field of required) {
    if (!partial && (body[field] === undefined || body[field] === null || body[field] === "")) {
      errors.push(`${field} is required.`);
    }
  }

  for (const field of ["name", "scientificName", "habitat"]) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== "string" || body[field].trim().length < 2) {
        errors.push(`${field} must be a string with at least 2 characters.`);
      } else if (body[field].trim().length > 100) {
        errors.push(`${field} must be 100 characters or fewer.`);
      }
    }
  }

  if (body.status !== undefined && !ALLOWED_STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${ALLOWED_STATUSES.join(", ")}.`);
  }

  return errors;
}

function parseId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

app.get("/", (_req, res) => {
  res.json({
    message: "Species API is running.",
    endpoints: [
      "GET /species",
      "GET /species/:id",
      "POST /species",
      "PUT /species/:id",
      "DELETE /species/:id"
    ]
  });
});

// READ all species
app.get("/species", async (_req, res, next) => {
  try {
    const records = await species.find({}).sort({ name: 1 }).toArray();
    res.json(records);
  } catch (error) {
    next(error);
  }
});

// READ one species
app.get("/species/:id", async (req, res, next) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ error: "Invalid species ID format." });
    }
    const record = await species.findOne({ _id: new ObjectId(req.params.id) });
    if (!record) return res.status(404).json({ error: "Species not found." });
    res.json(record);
  } catch (error) {
    next(error);
  }
});

// CREATE a species
app.post("/species", async (req, res, next) => {
  try {
    const errors = validateSpecies(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const record = {
      name: req.body.name.trim(),
      scientificName: req.body.scientificName.trim(),
      habitat: req.body.habitat.trim(),
      status: req.body.status,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await species.insertOne(record);
    res.status(201).json({ _id: result.insertedId, ...record });
  } catch (error) {
    next(error);
  }
});

// UPDATE a species (partial updates are allowed)
app.put("/species/:id", async (req, res, next) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ error: "Invalid species ID format." });
    }
    const errors = validateSpecies(req.body, true);
    if (errors.length) return res.status(400).json({ errors });
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Provide at least one field to update." });
    }

    const updates = {};
    for (const field of ["name", "scientificName", "habitat"]) {
      if (req.body[field] !== undefined) updates[field] = req.body[field].trim();
    }
    if (req.body.status !== undefined) updates.status = req.body.status;
    updates.updatedAt = new Date();

    const result = await species.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updates }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Species not found." });
    }
    const updated = await species.findOne({ _id: new ObjectId(req.params.id) });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE a species
app.delete("/species/:id", async (req, res, next) => {
  try {
    if (!parseId(req.params.id)) {
      return res.status(400).json({ error: "Invalid species ID format." });
    }
    const result = await species.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Species not found." });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Malformed JSON request body." });
  }
  res.status(500).json({ error: "Internal server error." });
});

async function start() {
  await client.connect();
  const db = client.db(DB_NAME);
  species = db.collection("species");
  await species.createIndex({ name: 1 });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Species API listening on http://localhost:${PORT}`);
    console.log(`Database: ${DB_NAME}; collection: species`);
  });
}

start().catch(async (error) => {
  console.error("Failed to start application:", error);
  await client.close().catch(() => {});
  process.exit(1);
});

async function shutdown() {
  await client.close().catch(() => {});
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
