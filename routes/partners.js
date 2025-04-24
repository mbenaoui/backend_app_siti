const express = require('express');
const router = express.Router();
const Partner = require('../models/Partner');
const auth = require('../middleware/auth');

// Get all partners
router.get('/', auth, async (req, res) => {
  try {
    const partners = await Partner.find({ status: 'active' })
      .select('name description logo contact')
      .sort({ name: 1 });
    res.json(partners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get partner by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }
    res.json(partner);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 