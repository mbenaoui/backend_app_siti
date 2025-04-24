const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const auth = require('../middleware/auth');

// Create new order
router.post('/', auth, async (req, res) => {
  try {
    const { partner, items, totalAmount, justification } = req.body;

    const order = new Order({
      partner,
      items,
      totalAmount,
      justification,
      createdBy: req.user._id
    });

    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user's orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ createdBy: req.user._id })
      .populate('partner', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 