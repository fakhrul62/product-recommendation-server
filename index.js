import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
app.use(cookieParser());

//MONGODB

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wwkoz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Send a ping to confirm a successful connection
    console.log(
      "Product Recommendation System is successfully connected to MongoDB!"
    );

    const recCollection = client.db("recDB").collection("recs");
    const userCollection = client.db("recDB").collection("users");
//create new user
app.post("/users", async (req, res) => {
    const newUser = req.body;
    //console.log("creating new user: ", newUser);
    const result = await userCollection.insertOne(newUser);
    res.send(result);
  });
  // getting users
  app.get("/users", async (req, res) => {
    const cursor = userCollection.find();
    const result = await cursor.toArray();
    res.send(result);
  });
  //get a data in the server
  app.get("/user/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await userCollection.findOne(query);
    res.send(result);
  });
  //update a data in the server
  app.put("/user/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const updateUser = req.body;
    const user = {
      $set: {
        email: updateUser.email,
        password: updateUser.password,
      },
    };
    const result = await userCollection.updateOne(filter, user, options);
    res.send(result);
  });
  //delete a data from the server
  app.delete("/user/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await userCollection.deleteOne(query);
    res.send(result);
  });
  //patch
  app.patch("/user", async (req, res) => {
    const email = req.body.email;
    const filter = { email };
    const updateDoc = {
      $set: {
        lastSignInTime: req?.body?.lastSignInTime,
      },
    };
    const result = await userCollection.updateOne(filter, updateDoc);
    res.send(result);
  });






  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Product Recommendation System IS RUNNING...");
});
app.listen(port, () => {
  console.log("Product Recommendation System is running on port: ", port);
});
