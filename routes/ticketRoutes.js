const express    = require('express');
const router     = express.Router();
const protect    = require('../middleware/protect');
const authorize  = require('../middleware/authorize');
const {
  createTicket, getTickets, getTicketById,
  updateTicket, deleteTicket
} = require('../controllers/ticketController');

router.route('/')
  .get(protect, getTickets)             // all roles (filter by role in controller)
  .post(protect, createTicket);         // all roles

router.route('/:id')
  .get(protect, getTicketById)          // all roles (filter by role in controller)
  .put(protect, updateTicket)           // all roles (filter by role in controller)
  .delete(protect, authorize('admin', 'manager'), deleteTicket); // admin, manager only

module.exports = router;
