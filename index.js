import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import express from "express";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 5000;
app.use(
  cors({
    origin: ["http://localhost:5173",
      "https://product-recommendation-s-c2392.web.app",
      "https://product-recommendation-s-c2392.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// const verifyToken = (req, res, next) => {
//   const token = req?.cookies?.token;
//   if (!token) {
//     return res.status(401).send({ message: "Unauthorized Brother" });
//   }
//   jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//     if (err) {
//       return res.status(401).send({ message: "Unauthorized Access Brother" });
//     }
//     req.user = decoded;
//     next();
//   });
// };

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token; // Try to get the token

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Handles cases where the token is missing or invalid
      return res.status(401).send({ message: "Unauthorized Access Brother" });
    }
    req.user = decoded; // Assign decoded token to req.user
    next(); // Proceed to the next middleware or route handler
  });
};

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

    const queryCollection = client.db("recDB").collection("recs");
    const userCollection = client.db("recDB").collection("users");
    const recommendCollection = client.db("recDB").collection("recommend");

    //========================================= JWT =========================================//
    // *Auth related api // JWT
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    app.post("/jwt/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out: ", user);
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    //========================================= Queries =========================================//
    //getting data from the server
    app.get("/queries", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { user_email: email };
      }
      
      const cursor = queryCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/queries-email", verifyToken, async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { user_email: email };
      }
      
      const cursor = queryCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    //home queries
    app.get("/queries-home", async (req, res) => {
      const result = await queryCollection
        .find()
        .sort({ _id: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });
    // posting it to the server
    app.post("/queries", async (req, res) => {
      const newQuery = req.body;
      console.log(newQuery);
      const result = await queryCollection.insertOne(newQuery);
      res.send(result);
    });
    app.get("/queries/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queryCollection.findOne(query);
      res.send(result);
    });
    //delete a data from the server
    app.delete("/queries/:id",verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await queryCollection.deleteOne(query);
      res.send(result);
    });
    // Increment recommendationCount
    app.patch("/queries/:id",verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: { recommendationCount: 1 },
      };
      const result = await queryCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    //update a data in the server
    app.put("/queries/:id",verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateQuery = req.body;
      const newQuery = {
        $set: {
          productName: updateQuery.productName,
          productBrand: updateQuery.productBrand,
          productImageUrl: updateQuery.productImageUrl,
          queryTitle: updateQuery.queryTitle,
          reasonDetails: updateQuery.reasonDetails,
        },
      };
      const result = await queryCollection.updateOne(filter, newQuery, options);
      res.send(result);
    });

    //========================================= RECOMMENDATIONS =========================================//
    app.get("/recommendations", async (req, res) => {
      const email = req.query.email;
      const excludeEmail = req.query.excludeEmail;
      let query = {};
      if (email) {
        query = { current_user_email: email };
      }
      if (excludeEmail) {
        query = { current_user_email: { $ne: excludeEmail } }; // Exclude the provided email
      }
      const cursor = recommendCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/recommendations/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await recommendCollection.findOne(query);
      res.send(result);
    });
    // Add a new recommendation
    app.post("/recommendations", async (req, res) => {
      const newRecommendation = req.body;
      const result = await recommendCollection.insertOne(newRecommendation);
      res.send(result);
    });
    //delete a data from the server
    app.delete("/recommendations/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: { recommendationCount: -1 },
      };
      await queryCollection.updateOne(query, updateDoc);
      const result = await recommendCollection.deleteOne(query);
      res.send(result);
    });

    //========================================= USERS =========================================//
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

    //=====================================

    //=====================================
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
