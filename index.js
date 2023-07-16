const express = require('express')
const app = express();
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json());


// mongodb
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wbbftwk.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // collection build
    const usersCollection = client.db('musicDB').collection('users');
    const classCollection = client.db('musicDB').collection('class');

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

      res.send({ token })
    })

    // users related apis
    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;

      const result = await usersCollection.findOne({ email: email });
      res.send({ data: result });
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await usersCollection.insertOne({ ...user, role: "student" });
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    app.get('/users/instructor', async(req, res) => {
      const result = await usersCollection.find({role:"instructor"}).toArray();
      res.send(result);
    })
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // class - instructor related apis 
    app.post('/addclass', async (req, res) => {
      const newItem = req.body;
      const result = await classCollection.insertOne({ ...newItem, status: "pending", instructor: new ObjectId(newItem.instructor), enrolledStudents: 0, feedback: '' })
      res.send(result);
    })
    app.get('/classes', async (req, res) => {
      let query = {};
      console.log(req.query);
      if (req.query.status) {
        query.status = req.query.status;
      }
      const result = await classCollection.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "instructor",
            foreignField: "_id",
            as: "instructor"
          }
        },
        {
          $unwind: "$instructor",
        },
        {
          $match: {
            ...query
          }
        }
      ]).toArray();
      console.log(result);
      res.send(result);
    });
    app.get('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await classCollection.findOne(query);
      res.send(result);
    });
    app.patch('/updateclass/:id', async (req, res) => {
      const id = req.params.id;
      const updateClass = req.body;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updateClass,
      };
      console.log(updateDoc);
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Music is playing')
})

app.listen(port, () => {
  console.log(`Music Melody is running on Port ${port}`);
})