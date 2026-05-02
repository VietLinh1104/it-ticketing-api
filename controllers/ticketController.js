const Ticket = require('../models/Ticket');

// POST /api/tickets  [all roles]
exports.createTicket = async (req, res) => {
  try {
    // Tự động gán employee từ token đã giải mã
    const ticket = await Ticket.create({ ...req.body, employee: req.user.id });

    res.status(201).json({
      status: 201,
      message: 'Ticket created',
      data: ticket
    });

  } catch (err) {
    res.status(400).json({
      status: 400,
      message: err.message,
      data: null
    });
  }
};

// GET /api/tickets  [protected + pagination + sorting]
// Query params: ?page=1&limit=10&sortBy=priority&order=asc
exports.getTickets = async (req, res) => {
  try {
    const page    = parseInt(req.query.page)  || 1;
    const limit   = parseInt(req.query.limit) || 10;
    const skip    = (page - 1) * limit;
    const sortBy  = req.query.sortBy || 'createdAt';
    const order   = req.query.order === 'asc' ? 1 : -1;

    // employee chỉ thấy ticket của mình; admin/manager thấy tất cả
    const filter = req.user.role === 'employee' ? { employee: req.user.id } : {};

    const tickets = await Ticket.find(filter)
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments(filter);

    res.status(200).json({
      status: 200,
      message: 'Success',
      data: { total, page, limit, tickets }
    });

  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err.message,
      data: null
    });
  }
};

// GET /api/tickets/:id  [protected + populate]
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('department', 'name officeLocation')
      .populate('employee',   'name email');

    if (!ticket) {
      return res.status(404).json({
        status: 404,
        message: 'Ticket not found',
        data: null
      });
    }

    // employee chỉ được xem ticket của mình
    if (req.user.role === 'employee' && ticket.employee._id.toString() !== req.user.id) {
      return res.status(403).json({
        status: 403,
        message: 'Forbidden – not your ticket',
        data: null
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Success',
      data: ticket
    });

  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err.message,
      data: null
    });
  }
};

// PUT /api/tickets/:id  [protected + role-based ownership]
exports.updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        status: 404,
        message: 'Ticket not found',
        data: null
      });
    }

    // employee chỉ được sửa ticket của mình; admin/manager được sửa tất cả
    if (req.user.role === 'employee' && ticket.employee.toString() !== req.user.id) {
      return res.status(403).json({
        status: 403,
        message: 'Forbidden – not your ticket',
        data: null
      });
    }

    const updated = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });

    res.status(200).json({
      status: 200,
      message: 'Ticket updated',
      data: updated
    });

  } catch (err) {
    res.status(400).json({
      status: 400,
      message: err.message,
      data: null
    });
  }
};

// DELETE /api/tickets/:id  [admin, manager only – enforced via authorize middleware]
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({
        status: 404,
        message: 'Ticket not found',
        data: null
      });
    }

    await ticket.deleteOne();

    res.status(200).json({
      status: 200,
      message: 'Ticket deleted',
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
