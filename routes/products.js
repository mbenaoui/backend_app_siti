const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// Get products by partner
router.get('/partner/:partnerId', auth, async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { partner: req.params.partnerId, status: 'available' };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .select('name description category unit price image stock')
      .sort({ name: 1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product categories
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 