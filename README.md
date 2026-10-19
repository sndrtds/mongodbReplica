<<<<<<< HEAD
# MongoDB Replica Set and Node.js Driver Integration Lab

This project creates a three-member MongoDB replica set using Docker Compose and a Node.js CRUD API for a `species` collection.

## Requirements

- Docker Engine/Desktop with the Docker Compose plugin
- Git
- `curl` (or Postman/Insomnia for API testing)

## 1. Start the replica set

From this project directory:

```bash
docker compose up -d --build
docker compose ps
docker compose logs replica-init
```

The setup uses three MongoDB containers:
- `mongo1` published on host port `27017`
- `mongo2` published on host port `27018`
- `mongo3` published on host port `27019`

Inside Docker, the replica-set members advertise `mongo1:27017`, `mongo2:27017`, and `mongo3:27017`. The Node.js app runs inside the same Compose network, so it can resolve those names.

Check the replica-set state:

```bash
docker compose exec mongo1 mongosh --quiet --eval 'rs.status().members.map(m => ({name:m.name,stateStr:m.stateStr}))'
docker compose exec mongo1 mongosh --quiet --eval 'db.hello()'
```

One member should be `PRIMARY`; the other two should be `SECONDARY`.

## 2. Test the CRUD API

The API is at `http://localhost:3000`.

Create a record:

```bash
curl -i -X POST http://localhost:3000/species \
  -H 'Content-Type: application/json' \
  -d '{"name":"Philippine Eagle","scientificName":"Pithecophaga jefferyi","habitat":"Tropical forest","status":"Endangered"}'
```

Copy the `_id` from the response for the following commands.

Read all records:

```bash
curl http://localhost:3000/species
```

Read one record (replace `PASTE_ID_HERE`):

```bash
curl http://localhost:3000/species/PASTE_ID_HERE
```

Update one or more fields:

```bash
curl -i -X PUT http://localhost:3000/species/PASTE_ID_HERE \
  -H 'Content-Type: application/json' \
  -d '{"habitat":"Lowland and montane tropical forest"}'
```

Delete the record:

```bash
curl -i -X DELETE http://localhost:3000/species/PASTE_ID_HERE
```

### Input-validation checks

Missing required field (should return HTTP 400):

```bash
curl -i -X POST http://localhost:3000/species \
  -H 'Content-Type: application/json' \
  -d '{"name":"Eagle"}'
```

Invalid conservation status (should return HTTP 400):

```bash
curl -i -X POST http://localhost:3000/species \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test bird","scientificName":"Avis testus","habitat":"Forest","status":"Super Endangered"}'
```

Invalid ID (should return HTTP 400):

```bash
curl -i http://localhost:3000/species/not-an-object-id
```

## 3. Write concern experiment

Run:

```bash
docker compose exec app npm run test:write-concern
```

The script attempts one insert with `{ w: 1 }` and one with `{ w: "majority" }`, and prints the observed duration and outcome. Repeat the experiment several times and record the actual results.

- `w: 1` acknowledges after the primary has applied the write.
- `w: "majority"` waits for the write to be acknowledged by a majority of voting members (in this three-member replica set, normally two members).
- Majority acknowledgement generally offers stronger durability against primary failure, but can take longer or time out if a majority is unavailable.
- A successful `w: 1` write can be rolled back after a failover if it had not replicated to the new primary. Do not assume every `w: 1` write will be lost.

## 4. Primary election experiment

### A. Record a baseline

```bash
docker compose exec mongo1 mongosh --quiet --eval 'db.hello()'
docker compose exec mongo1 mongosh --quiet --eval 'rs.status().members.map(m => ({name:m.name,stateStr:m.stateStr}))'
```

Identify the current `PRIMARY`.

### B. Watch the failover

In terminal 1, run:

```bash
docker compose exec app npm run watch:election
```

The script prints the current primary and waits for a different primary.

In terminal 2, stop the container that the script identified as primary. For example, if it says `mongo1:27017`:

```bash
docker compose stop mongo1
```

If it says `mongo2:27017`, stop `mongo2`; if it says `mongo3:27017`, stop `mongo3`. The script should print the new primary and observed elapsed time. Record both in your report.

Restart the stopped member after the measurement:

```bash
docker compose start mongo1
```

Replace `mongo1` with whichever member you stopped. Wait for it to rejoin, then check:

```bash
docker compose exec mongo1 mongosh --quiet --eval 'rs.status().members.map(m => ({name:m.name,stateStr:m.stateStr}))'
```

Repeat the election test a few times if your instructor expects multiple observations. Do not stop two members at once: the remaining node would not have a voting majority.

### C. Report table

Fill in with your actual measurements:

| Trial | Primary stopped | New primary | Observed time (seconds) | Notes |
|---|---|---|---:|---|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

Election timing depends on configuration, startup conditions, polling interval, and machine performance. Report what you measured rather than using a made-up value.

## 5. Suggested lab discussion

**Replica set:** A replica set maintains multiple copies of data. One member is primary and accepts writes; secondary members replicate the primary's operations. If the primary becomes unavailable and a majority can communicate, the remaining eligible members can elect a new primary.

**Write concern:** `w: 1` confirms a write on the primary. `w: "majority"` waits for acknowledgement from a majority of voting members. Majority is more resilient to a primary failing immediately after acknowledgement, though the exact durability guarantee also depends on journaling and server configuration.

**Election:** The election experiment records the primary before failure, the member that becomes primary, and the elapsed time observed by the monitoring script. A brief period of write unavailability during an election is normal.

## 6. GitHub submission

First inspect the files you will publish:

```bash
git status
```

Initialize and commit:

```bash
git init
git add .
git status
git commit -m "Complete MongoDB replica set and CRUD lab"
git branch -M main
```

Create an empty repository on GitHub, then connect it (replace the URL with your own repository URL):

```bash
git remote add origin https://github.com/YOUR-USERNAME/mongodb-replica-lab.git
git push -u origin main
```

Submit the repository URL to your instructor. Include actual experiment results in this README before your final commit.

**Secrets:** This demo does not require passwords. Never commit credentials, private connection strings, API keys, or real `.env` files. `.gitignore` excludes `.env` and `node_modules`.

## Cleanup

This deletes the containers and the stored database volumes:

```bash
docker compose down -v
```

Only use `-v` if you are okay deleting the lab's persisted MongoDB data.
=======
# mongodbReplica
study purpose
>>>>>>> f0b1acf567c35b2310fa770abcfc4576f8e83401
