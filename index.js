const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

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
    const menuCollection = client.db("nourishRDBUser").collection("menu");
    const reviewCollection = client.db("nourishRDBUser").collection("reviews");
    const cartCollection = client.db("nourishRDBUser").collection("carts");
    const userCollection = client.db("nourishRDBUser").collection("users");
    const paymentCollection = client.db("nourishRDBUser").collection("payments");


    //  jwt related api

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    });

    // midleware for verify token for jwt 

    const verifyToken = (req, res, next) => {
      // console.log('inside veryfi token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })

        }
        req.decoded = decoded;
        next();
      })
      

    }




    // verify admin after verify token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query={email:email};
      const user=await userCollection.findOne(query);
      const isAdmin=user?.role==='admin';
      if(!isAdmin){
        return res.status(403).send({message:'forbidden access'})
      }
      next();

    }

    // for all menu data api
    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result)

    });
    // for menu post api

    app.post('/menu',verifyToken,verifyAdmin, async(req,res)=>{
      const item=req.body;
      const result=await menuCollection.insertOne(item)
      res.send(result)
    });

    // for specik menu item ........use for update item api

    app.get('/menu/:id', async(req,res)=>{
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
      const result=await menuCollection.findOne(query);
      res.send(result);

    });
    // for menu update api
    app.patch('/menu/:id',async(req,res)=>{
      const item=req.body;
      const id=req.params.id;
      const query={_id:new ObjectId(id)};
       const updateDoc = {
      $set: {
       name:item.name,
       category:item.category,
       price:item.price,
       recipe:item.recipe,
       image:item.image,
      },
    };
     const result = await menuCollection.updateOne(query, updateDoc);
     res.send(result);
    })

    // for delete api
    app.delete('/menu/:id',verifyToken,verifyAdmin, async(req,res)=>{
      const id=req.params.id;
      const query={ _id:new ObjectId(id)};
      const result=await menuCollection.deleteOne(query);
      res.send(result);
    })



    //  for all reviews data api
    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result)

    });

    //  carts collection api for post or add item
    app.post('/carts', async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);

    });

    // cart collection get data and show api 

    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const result = await cartCollection.find(query).toArray();
      res.send(result)

    });

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query);
      res.send(query);
    });


    // users related api
    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesn't exits
      const query = { email: user.email };
      const exitingUser = await userCollection.findOne(query);
      if (exitingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result)

    });

    app.get('/users', verifyToken,verifyAdmin, async (req, res) => {

      const result = await userCollection.find().toArray();
      res.send(result)
    });

    // user delete related api

    app.delete('/users/:id',verifyAdmin,verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result)

    });

    // make admin related api

    app.patch('/users/admin/:id',verifyAdmin,verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }

      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    

    // admin
    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        res.status(403).send({ message: 'forbiden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });

    });



    // payment gatway api

    app.post('/create-payment-intent',async(req,res)=>{
      const {price}=req.body;
      const amount=parseInt(price*100);
      const paymentIntent=await stripe.paymentIntents.create({
        amount:amount,
        currency:'usd',
        payment_method_types:['card']
      });
      res.send({
        clientSecret:paymentIntent.client_secret

      })

    });

    // payment save to database api

    app.post('/payments',async(req,res)=>{
      const payment=req.body;
      const paymentResult=await paymentCollection.insertOne(payment);

      // carefully delete item from the cart
      console.log('payement info',payment)
      const query={_id:{
        $in:payment.cartIds.map(id => new ObjectId(id))
      }};
      const deleteResult=await cartCollection.deleteMany(query)
      res.send({paymentResult,deleteResult})

    });

    app.get('/payemnt/:email',verifyToken,async(req,res)=>{
      const query={email:req.params.email};
      if(req.params.email !==req.decoded.email){
        return res.status(403).send({message:'forbiden access'})
      }
      const result=await paymentCollection.find(query).toArray();
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


app.get('/', (req, res) => {
  res.send('Nourish Running')
});

app.listen(port, () => {
  console.log(`server running on port ${port}`);
})
