require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Product = require("./models/Product");
const Order = require("./models/Order");
const Admin = require("./models/Admin");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    // Seed admin if none exists
    const adminExists = await Admin.findOne({ email: 'admin@jewelize.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await Admin.create({ email: 'admin@jewelize.com', password: hashedPassword });
      console.log("✅ Default Admin created: admin@jewelize.com / admin123");
    }
  })
  .catch(err => console.error("MongoDB connection error:", err));

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());
app.use(express.json());

const otpStore = {};

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 1. Check Identifier API - returns the role
app.post("/check-identifier", async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ message: "Identifier required" });

  // Format Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9]{10}$/; // Basic 10-digit phone number validation

  const isEmail = emailRegex.test(identifier);
  const isPhone = phoneRegex.test(identifier);

  if (!isEmail && !isPhone) {
    return res.status(400).json({ message: "Please enter a valid 10-digit phone number or email address." });
  }

  let role = 'customer'; // Default role
  const admin = await Admin.findOne({ email: identifier });
  if (admin) role = 'admin';

  if (role === 'customer') {
    // Generate OTP for customer
    const otp = generateOTP();
    otpStore[identifier] = otp;
    console.log(`✅ OTP for ${identifier}: ${otp}`); // For testing/fallback

    // Try to send email if configured and identifier is an email
    if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_gmail@gmail.com' && identifier.includes('@')) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: identifier,
          subject: 'Your Jewelize Verification Code',
          text: `Your One Time Password is: ${otp}. Welcome to Jewelize!`
        });
        console.log(`📧 Email successfully sent to ${identifier}`);
      } catch (err) {
        console.error("Failed to send email OTP:", err.message);
      }
    } else {
      console.log("⚠️ EMAIL_USER not configured or identifier is not an email. OTP printed to console only.");
    }
  }
  
  res.json({ role, message: role === 'customer' ? 'OTP sent' : 'Password required' });
});

// 2. Password Login API (Admin / Delivery)
app.post("/api/login", async (req, res) => {
  const { identifier, password, role } = req.body;
  if (!identifier || !password) return res.status(400).json({ success: false, message: "Credentials required" });

  let user = null;
  if (role === 'admin') user = await Admin.findOne({ email: identifier });

  if (!user) return res.status(400).json({ success: false, message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ success: false, message: "Invalid credentials" });

  const token = jwt.sign({ userId: user._id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, role });
});

// 3. Verify OTP & Login (Customer)
app.post("/verify-otp", async (req, res) => {
  const { contact, otp } = req.body;
  if (!contact || !otp) return res.status(400).json({ success: false, message: "Contact and OTP required" });

  if (otpStore[contact] && otpStore[contact] === otp) {
    delete otpStore[contact]; // Clear OTP after successful use

    try {
      let user = await User.findOne({ contact });
      if (!user) {
        user = new User({ contact });
        await user.save();
      }
      const token = jwt.sign({ userId: user._id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token, role: 'customer' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
  res.status(400).json({ success: false, message: "Invalid OTP" });
});

// Middleware for authenticating customer
const authenticateCustomer = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, message: "Unauthorized" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'customer') return res.status(403).json({ success: false, message: "Forbidden" });
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// API Routes for User Cart
app.get("/api/user/cart", authenticateCustomer, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({ success: true, cart: user.cart || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching cart" });
  }
});

app.post("/api/user/cart", authenticateCustomer, async (req, res) => {
  try {
    const { cart } = req.body;
    const user = await User.findByIdAndUpdate(req.user.userId, { cart }, { new: true });
    res.json({ success: true, cart: user.cart });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating cart" });
  }
});

// API Routes for User Wishlist
app.get("/api/user/wishlist", authenticateCustomer, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json({ success: true, wishlist: user.wishlist || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching wishlist" });
  }
});

app.post("/api/user/wishlist", authenticateCustomer, async (req, res) => {
  try {
    const { wishlist } = req.body;
    const user = await User.findByIdAndUpdate(req.user.userId, { wishlist }, { new: true });
    res.json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating wishlist" });
  }
});

// API Routes for Orders
app.post("/api/orders", authenticateCustomer, async (req, res) => {
  try {
    const { shippingAddress, cartItems } = req.body;
    
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    let totalAmount = 0;
    const orderItems = [];

    // Lookup products to get real IDs and Prices for security
    for (const item of cartItems) {
      const product = await Product.findOne({ name: item.name });
      if (product) {
        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;
        orderItems.push({
          productId: product._id,
          quantity: item.quantity,
          price: product.price
        });
      }
    }

    const newOrder = new Order({
      userId: req.user.userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      status: 'Pending'
    });

    await newOrder.save();

    // Clear the user's cart in the DB!
    await User.findByIdAndUpdate(req.user.userId, { cart: [] });

    res.json({ success: true, orderId: newOrder._id });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ success: false, message: "Error creating order" });
  }
});

app.get("/api/orders", authenticateCustomer, async (req, res) => {
  try {
    // Populate the product details so the frontend can display names and images
    const orders = await Order.find({ userId: req.user.userId })
      .populate('items.productId')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching orders" });
  }
});

// API Routes for Products (Public)
app.get("/api/products", async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    if (category) {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }
    if (search) {
      query.name = { $regex: new RegExp(`^${search}`, 'i') }; // Matches products starting with the search string
    }
    
    const products = await Product.find(query);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products" });
  }
});

// API Routes for Products (Admin Only)
app.post("/api/admin/products", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ success: false, message: "Forbidden" });

    const { name, description, price, imageUrl, category, stock } = req.body;
    const product = new Product({ name, description, price, imageUrl, category, stock: stock || 0 });
    await product.save();
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating product" });
  }
});

app.put("/api/admin/products/:id", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ success: false, message: "Forbidden" });

    const { name, description, price, imageUrl, category, stock } = req.body;
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id, 
      { name, description, price, imageUrl, category, stock },
      { new: true }
    );
    res.json({ success: true, product: updatedProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating product" });
  }
});

app.delete("/api/admin/products/:id", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ success: false, message: "Forbidden" });

    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting product" });
  }
});

// Create Order (Requires JWT)
app.post("/api/orders", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { items, totalAmount, shippingAddress } = req.body;

    const order = new Order({
      userId: decoded.userId,
      items,
      totalAmount,
      shippingAddress
    });
    
    await order.save();
    res.json({ success: true, message: "Order placed successfully" });
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid token or error creating order" });
  }
});

// Admin: Get all orders
app.get("/api/admin/orders", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ success: false, message: "Forbidden" });

    const orders = await Order.find({})
      .populate('userId', 'contact')
      .populate('items.productId', 'name price')
      .sort({ createdAt: -1 });
      
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching orders" });
  }
});

// Seed actual products
app.post("/api/seed", async (req, res) => {
  try {
    await Product.deleteMany({});
    const productsData = [
      { name: "Clover Bracelet", description: "Beautiful clover bracelet.", price: 200, imageUrl: "images/bracelet.jpeg", category: "Bracelets", stock: 15 },
      { name: "Pearlgap Bracelet", description: "Elegant pearlgap design.", price: 250, imageUrl: "images/2.bracelet.jpg", category: "Bracelets", stock: 10 },
      { name: "Pearlshine Bracelet", description: "Shining pearl bracelet.", price: 250, imageUrl: "images/3.bracelet.jpg", category: "Bracelets", stock: 8 },
      { name: "Tulip Bracelet", description: "Lovely tulip bracelet.", price: 350, imageUrl: "images/4.bracelet.jpg", category: "Bracelets", stock: 5 },
      { name: "Pearlchain Bracelet", description: "Classic pearlchain.", price: 250, imageUrl: "images/5.bracelet.jpg", category: "Bracelets", stock: 20 },
      { name: "Bow Earring", description: "Minimalist earrings.", price: 180, imageUrl: "images/bow.jpeg", category: "Earrings", stock: 12 },
      { name: "Golden Leaf Ring", description: "Dangling earrings.", price: 165, imageUrl: "images/golden leaf.jpeg", category: "Rings", stock: 0 },
      { name: "Knot Cuff", description: "Chain bracelet.", price: 285, imageUrl: "images/knot.jpeg", category: "Cuff Bracelets", stock: 7 },
      { name: "Luvdrop Necklace", description: "Dainty necklace.", price: 210, imageUrl: "images/luvdrop.jpeg", category: "Necklaces", stock: 14 },
      { name: "Luvloop Necklace", description: "Dainty necklace.", price: 210, imageUrl: "images/luvloop.jpeg", category: "Necklaces", stock: 22 }
    ];
    const createdProducts = await Product.insertMany(productsData);
    
    // Seed a mock order
    await Order.deleteMany({});
    await User.deleteMany({});
    
    const fakeUser = new User({ contact: 'john@example.com' });
    await fakeUser.save();
    
    const fakeOrder = new Order({
      userId: fakeUser._id,
      items: [
        { productId: createdProducts[0]._id, quantity: 1, price: createdProducts[0].price },
        { productId: createdProducts[1]._id, quantity: 2, price: createdProducts[1].price }
      ],
      totalAmount: createdProducts[0].price + (createdProducts[1].price * 2),
      status: 'Pending',
      shippingAddress: { fullName: 'John Doe', address: '123 Fake St', city: 'Mumbai', zipCode: '400001', phone: '9876543210' }
    });
    await fakeOrder.save();

    res.json({ message: "Database seeded successfully with your actual products AND a test order!" });
  } catch (error) {
    res.status(500).json({ message: "Error seeding database" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}/1.loginpage.html`));
