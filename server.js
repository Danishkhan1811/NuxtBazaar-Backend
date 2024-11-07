const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const User = require('./models/user');
const Product = require('./models/product');
const Cart = require('./models/cart');
const Order = require('./models/order');
const multer = require('multer');

dotenv.config();

const app = express();
const port = 5000;

app.use(express.json());

app.use(cors({
    origin: 'https://nuxtbazaar.vercel.app', 
    credentials: true
}));

// Session middleware setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'yourSecretKey',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB', err);
    });

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
};

// Signup route
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create session
        req.session.userId = user._id;
        req.session.save(err => {
            if (err) {
                return res.status(500).json({ message: 'Failed to save session' });
            }
            res.status(200).json({ message: 'Logged in successfully' });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Failed to log out' });
        }
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Endpoint to upload an image
app.post('/upload/:productId', upload.single('image'), async (req, res) => {
    try {
      const productId = req.params.productId;
      console.log('Uploading image for product:', productId); // Debug log
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
  
      // Store the image as a base64 encoded string in the database
      product.image = req.file.buffer.toString('base64');
      await product.save();
  
      res.status(200).json({ message: 'Image uploaded successfully' });
    } catch (error) {
      console.error('Server error:', error); // Debug log
      res.status(500).json({ message: 'Server error' });
    }
  });


// Profile route to get current user's info
app.get('/profile', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).select('username email');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/session-data', (req, res) => {
    res.status(200).json(req.session);
});

// Add to wishlist
app.post('/wishlist/:productId', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const productId = req.params.productId;
        if (!user.wishlist.includes(productId)) {
            user.wishlist.push(productId);
            await user.save();
        }

        res.status(200).json({ message: 'Product added to wishlist' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get wishlist
app.get('/wishlist', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId).populate('wishlist');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user.wishlist);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove from wishlist
app.delete('/wishlist/:productId', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const productId = req.params.productId;
        user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
        await user.save();

        res.status(200).json({ message: 'Product removed from wishlist' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add to Cart
app.post('/cart/:productId', requireAuth, async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;

    try {
        const user = await User.findById(req.session.userId);
        const product = await Product.findById(productId);

        if (!product || product.product_stock < quantity) {
            return res.status(400).json({ message: 'Product out of stock' });
        }

        let cart = await Cart.findOne({ user: user._id });

        if (!cart) {
            cart = new Cart({ user: user._id, items: [] });
        }

        const cartItem = cart.items.find(item => item.product.equals(productId));
        if (cartItem) {
            cartItem.quantity += quantity;
        } else {
            cart.items.push({ product: productId, quantity });
        }

        product.product_stock -= quantity;
        await product.save();
        await cart.save();

        res.status(200).json({ message: 'Product added to cart' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Cart Items
app.get('/cart', requireAuth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        res.status(200).json(cart.items);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove item from Cart
app.delete('/cart/:productId', requireAuth, async (req, res) => {
    const { productId } = req.params;

    try {
        const user = await User.findById(req.session.userId);
        const cart = await Cart.findOne({ user: user._id });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const cartItemIndex = cart.items.findIndex(item => item.product.equals(productId));
        if (cartItemIndex === -1) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        const cartItem = cart.items[cartItemIndex];

        // Restore the product stock
        const product = await Product.findById(productId);
        product.product_stock += cartItem.quantity;
        await product.save();

        // Remove item from cart
        cart.items.splice(cartItemIndex, 1);
        await cart.save();

        res.status(200).json({ message: 'Product removed from cart' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Decrement item quantity in Cart
app.put('/cart/:productId', requireAuth, async (req, res) => {
    const { productId } = req.params;

    try {
        const user = await User.findById(req.session.userId);
        const cart = await Cart.findOne({ user: user._id });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const cartItemIndex = cart.items.findIndex(item => item.product.equals(productId));
        if (cartItemIndex === -1) {
            return res.status(404).json({ message: 'Product not found in cart' });
        }

        const cartItem = cart.items[cartItemIndex];
        cartItem.quantity -= 1;

        // Restore the product stock
        const product = await Product.findById(productId);
        product.product_stock += 1;
        await product.save();

        if (cartItem.quantity <= 0) {
            cart.items.splice(cartItemIndex, 1);
        }

        await cart.save();

        res.status(200).json({ message: 'Product quantity updated in cart' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Confirm order route
app.post('/order', requireAuth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.session.userId }).populate('items.product');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        const totalAmount = cart.items.reduce((total, item) => total + item.product.product_price * item.quantity, 0);

        const order = new Order({
            user: req.session.userId,
            items: cart.items,
            totalAmount
        });

        await order.save();

        // Clear the user's cart after placing the order
        cart.items = [];
        await cart.save();

        res.status(201).json({ message: 'Order confirmed', order });
    } catch (error) {
        res.status (500).json({ message: 'Server error' });
    }
});

// Get orders for the current user
app.get('/orders', requireAuth, async (req, res) => {
    try {
      const orders = await Order.find({ user: req.session.userId }).populate('items.product');
      res.status(200).json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  });

// User Routes
app.post('/users', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).send(user);
    } catch (error) {
        res.status(400).send(error);
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).send(users);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Product Routes
app.post('/products', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).send(product);
    } catch (error) {
        res.status(400).send(error);
    }
});

//Get all products
app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).send(products);
    } catch (error) {
        res.status(400).send(error);
    }
});

// Get product by id
app.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).send();
        }
        res.send(product);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.listen(port, () => {
    console.log(`This app is running on port ${port}`);
});