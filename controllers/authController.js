const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// POST /api/auth/register
exports.registerEmployee = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const user = await User.create({ name, email, password: hashed, role, department });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      status: 201,
      message: 'Register successful',
      data: { token }
    });

  } catch (err) {
    res.status(400).json({
      status: 400,
      message: err.message,
      data: null
    });
  }
};

// POST /api/auth/login
exports.loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 404,
        message: 'User not found',
        data: null
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        status: 401,
        message: 'Invalid credentials',
        data: null
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({
      status: 200,
      message: 'Login successful',
      data: { token }
    });

  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err.message,
      data: null
    });
  }
};
