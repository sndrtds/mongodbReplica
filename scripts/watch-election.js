const { MongoClient } = require("mongodb");

const uri =
  process.env.MONGODB_URI ||
  "mongodb://mongo1:27017,mongo2:27017,mongo3:27017/?replicaSet=rs0";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 2000,
    connectTimeoutMS: 2000
  });

  await client.connect();
  const admin = client.db("admin");
  const hello = await admin.command({ hello: 1 });
  const initialPrimary = hello.primary;

  if (!initialPrimary) {
    throw new Error("No primary is currently reported. Check the replica set first.");
  }

  console.log(`Current primary: ${initialPrimary}`);
  console.log("Start the stopwatch experiment by stopping that primary in another terminal.");
  console.log("Waiting for a different primary...");

  const started = performance.now();
  const timeoutMs = 120000;

  try {
    while (performance.now() - started < timeoutMs) {
      await sleep(200);
      try {
        const state = await admin.command({ hello: 1 });
        if (state.isWritablePrimary && state.primary && state.primary !== initialPrimary) {
          console.log(`New primary: ${state.primary}`);
          console.log(`Observed election/failover time: ${((performance.now() - started) / 1000).toFixed(2)} seconds`);
          console.log("Note: this is the time observed by this polling script, not a guaranteed election duration.");
          return;
        }
      } catch (_error) {
        // During failover the client may temporarily have no selectable server.
      }
    }
    console.log("No new primary observed within 120 seconds. Check container health and replica-set status.");
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
