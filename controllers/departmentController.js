const Department = require('../models/Department');

// POST /api/departments
exports.createDepartment = async (req, res) => {
  try {
    const dept = await Department.create(req.body);

    res.status(201).json({
      status: 201,
      message: 'Department created',
      data: dept
    });

  } catch (err) {
    res.status(400).json({
      status: 400,
      message: err.message,
      data: null
    });
  }
};

// GET /api/departments
exports.getDepartments = async (req, res) => {
  try {
    const page    = parseInt(req.query.page)  || 1;
    const limit   = parseInt(req.query.limit) || 10;
    const skip    = (page - 1) * limit;
    const sortBy  = req.query.sortBy || 'createdAt';
    const order   = req.query.order === 'asc' ? 1 : -1;

    const depts = await Department.find()
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit);

    const total = await Department.countDocuments();

    res.status(200).json({
      status: 200,
      message: 'Success',
      data: { total, page, limit, departments: depts }
    });

  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err.message,
      data: null
    });
  }
};

// GET /api/departments/:id
exports.getDepartmentById = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);

    if (!dept) {
      return res.status(404).json({
        status: 404,
        message: 'Department not found',
        data: null
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Success',
      data: dept
    });

  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err.message,
      data: null
    });
  }
};

// PUT /api/departments/:id
exports.updateDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!dept) {
      return res.status(404).json({
        status: 404,
        message: 'Department not found',
        data: null
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Department updated',
      data: dept
    });

  } catch (err) {
    res.status(400).json({
      status: 400,
      message: err.message,
      data: null
    });
  }
};

// DELETE /api/departments/:id
exports.deleteDepartment = async (req, res) => {
  try {
    const dept = await Department.findByIdAndDelete(req.params.id);

    if (!dept) {
      return res.status(404).json({
        status: 404,
        message: 'Department not found',
        data: null
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Department deleted',
      data: null
    });

  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err.message,
      data: null
    });
  }
};
