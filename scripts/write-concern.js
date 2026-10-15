const { MongoClient } = require("mongodb");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0";
const dbName = process.env.DB_NAME || "biodiversity";

async function measureInsert(collection, writeConcern) {
  const document = {
    name: `Write concern test ${writeConcern.w} ${new Date().toISOString()}`,
    scientificName: "Testus replicationis",
    habitat: "Laboratory",
    status: "Not Evaluated",
    testType: "write-concern",
    requestedWriteConcern: writeConcern.w,
    createdAt: new Date()
  };

  const started = performance.now();
  try {
    const result = await collection.insertOne(document, { writeConcern });
    const elapsed = performance.now() - started;
    console.log(
      `${JSON.stringify(writeConcern)}: SUCCESS in ${elapsed.toFixed(2)} ms; insertedId=${result.insertedId}`
    );
  } catch (error) {
    const elapsed = performance.now() - started;
    console.log(
      `${JSON.stringify(writeConcern)}: FAILED after ${elapsed.toFixed(2)} ms; ${error.name}: ${error.message}`
    );
  }
}

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const collection = client.db(dbName).collection("species");
    console.log("Testing write concern w: 1");
    await measureInsert(collection, { w: 1 });
    console.log("Testing write concern w: 'majority'");
    await measureInsert(collection, { w: "majority" });
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
