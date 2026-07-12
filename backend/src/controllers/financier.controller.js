const Financier = require('../models/Financier')

exports.createFinancier = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, defaultInterestRate, address, notes, status } = req.body

    const existing = await Financier.findOne({ name, isDeleted: false })
    if (existing) {
      return res.status(400).json({ success: false, message: 'Financier name already exists' })
    }

    const financier = new Financier({
      name,
      contactPerson,
      email,
      phone,
      defaultInterestRate,
      address,
      notes,
      status
    })
    await financier.save()

    res.status(201).json({ success: true, data: financier })
  } catch (error) {
    next(error)
  }
}

exports.getFinanciers = async (req, res, next) => {
  try {
    const financiers = await Financier.find({ isDeleted: false }).sort({ name: 1 })
    res.status(200).json(financiers)
  } catch (error) {
    next(error)
  }
}

exports.getFinancierById = async (req, res, next) => {
  try {
    const financier = await Financier.findOne({ _id: req.params.id, isDeleted: false })
    if (!financier) {
      return res.status(404).json({ success: false, message: 'Financier not found' })
    }
    res.status(200).json(financier)
  } catch (error) {
    next(error)
  }
}

exports.updateFinancier = async (req, res, next) => {
  try {
    const { name, contactPerson, email, phone, defaultInterestRate, address, notes, status } = req.body
    const financier = await Financier.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { name, contactPerson, email, phone, defaultInterestRate, address, notes, status },
      { new: true, runValidators: true }
    )

    if (!financier) {
      return res.status(404).json({ success: false, message: 'Financier not found' })
    }

    res.status(200).json({ success: true, data: financier })
  } catch (error) {
    next(error)
  }
}

exports.deleteFinancier = async (req, res, next) => {
  try {
    const financier = await Financier.findByIdAndDelete(req.params.id)

    if (!financier) {
      return res.status(404).json({ success: false, message: 'Financier not found' })
    }

    res.status(200).json({ success: true, message: 'Financier deleted successfully from database' })
  } catch (error) {
    next(error)
  }
}
