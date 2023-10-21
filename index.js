require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

const User = mongoose.model('User', {
  username: String,
  password: String,
  userType: String,
});

const Seller = mongoose.model('Seller', {
  name: String,
  catalog: [{ name: String, price: Number }],
});

const Order = mongoose.model('Order', {
  sellerId: String,
  items: [{ name: String, price: Number }],
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, userType } = req.body;

  const existingUser = await User.findOne({ username });

  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    username,
    password: hashedPassword,
    userType,
  });

  user.save().then(() => {
    const token = jwt.sign({ username, userType }, 'secretKey');
    res.status(201).json({ message: 'User registered successfully', token });
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      'your-secret-key',
      {
        expiresIn: '1h',
      }
    );

    res.status(200).json({ token, userId: user._id, username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/buyer/list-of-sellers', async (req, res) => {
  try {
    const sellers = await User.find({ userType: 'seller' });
    res.json(sellers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/buyer/seller-catalog/:seller_id', async (req, res) => {
  const sellerId = req.params.seller_id;

  try {
    const seller = await Seller.findById(sellerId);

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    res.json(seller.catalog);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/buyer/create-order/:seller_id', async (req, res) => {
  const sellerId = req.params.seller_id;
  const orderItems = req.body;

  try {
    const seller = await Seller.findOne({ _id: sellerId });

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const order = new Order({
      sellerId: sellerId,
      items: orderItems,
    });

    await order.save();

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/seller/create-catalog', async (req, res) => {
  const catalogItems = req.body;
  try {
    const seller = new Seller({
      catalog: catalogItems,
    });

    await seller.save();

    res.json(seller);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/seller/orders', async (req, res) => {
  try {
    console.log(req.query.sellerId);
    const orders = await Order.find({ sellerId: req.query.sellerId });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
