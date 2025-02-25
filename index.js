const express=require('express');
const app=express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port=process.env.PORT || 5000;

// midleware

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n6usyvo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
     const menuCollection= client.db("nourishRDBUser").collection("menu");
     const reviewCollection = client.db("nourishRDBUser").collection("reviews");
     const cartCollection = client.db("nourishRDBUser").collection("carts");

// for all menu data api
     app.get('/menu',async(req,res)=>{
      const result=await menuCollection.find().toArray();
      res.send(result)

     });
    //  for all reviews data api
    app.get('/reviews',async(req,res)=>{
      const result=await reviewCollection.find().toArray();
      res.send(result)

     });

    //  carts collection api for post or add item
    app.post('/carts',async(req,res)=>{
      const cartItem=req.body;
      const result=await cartCollection.insertOne(cartItem);
      res.send(result);

    });

    // cart collection get data and show api 

    app.get('/carts',async(req,res)=>{
      const email=req.query.email;
      const query={email:email}
      const result=await cartCollection.find(query).toArray();
      res.send(result)

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


app.get('/',(req,res)=>{
    res.send('Nourish Running')
});

app.listen(port,()=>{
    console.log(`server running on port ${port}`);
})
