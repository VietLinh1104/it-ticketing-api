const express    = require('express');
const router     = express.Router();
const protect    = require('../middleware/protect');
const authorize  = require('../middleware/authorize');
const {
  createDepartment, getDepartments, getDepartmentById,
  updateDepartment, deleteDepartment
} = require('../controllers/departmentController');

router.route('/')
  .get(protect, getDepartments)                                       // all roles
  .post(protect, authorize('admin', 'manager'), createDepartment);   // admin, manager

router.route('/:id')
  .get(protect, getDepartmentById)                                    // all roles
  .put(protect, authorize('admin', 'manager'), updateDepartment)     // admin, manager
  .delete(protect, authorize('admin'), deleteDepartment);            // admin only

module.exports = router;
