const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

const mongoUri = process.env.MONGO_URI
if (!mongoUri) {
  console.error("MONGO_URI not defined in environment")
  process.exit(1)
}

const Vendor = require('../src/models/Vendor')
const Financier = require('../src/models/Financier')
const Bill = require('../src/models/Bill')
const Payment = require('../src/models/Payment')
const Loan = require('../src/models/Loan')
const Repayment = require('../src/models/Repayment')
const Cheque = require('../src/models/Cheque')
const Transaction = require('../src/models/Transaction')

async function run() {
  console.log("Connecting to Database...")
  await mongoose.connect(mongoUri)
  console.log("Connected to Database.")

  // 1. Create Vendors
  const newVendors = [
    {
      name: "Adani Enterprises Ltd",
      contactPerson: "Gautam Adani",
      email: "finance@adani.com",
      phone: "9123456780",
      address: "Ahmedabad, GJ",
      type: "largeVendor",
      gstin: "24AAAAA2222A1Z2",
      openingBalance: 0,
      status: "Active",
      category: "Raw Materials"
    },
    {
      name: "Infosys Limited",
      contactPerson: "Salil Parekh",
      email: "accounts@infosys.com",
      phone: "9123456781",
      address: "Bengaluru, KA",
      type: "largeVendor",
      gstin: "29AAAAA3333A1Z3",
      openingBalance: 0,
      status: "Active",
      category: "Software Services"
    },
    {
      name: "Wipro Limited",
      contactPerson: "Thierry Delaporte",
      email: "finance@wipro.com",
      phone: "9123456782",
      address: "Bengaluru, KA",
      type: "largeVendor",
      gstin: "29AAAAA4444A1Z4",
      openingBalance: 0,
      status: "Active",
      category: "Software Services"
    },
    {
      name: "Mahindra & Mahindra Ltd",
      contactPerson: "Anand Mahindra",
      email: "vendor@mahindra.com",
      phone: "9123456783",
      address: "Mumbai, MH",
      type: "largeVendor",
      gstin: "27AAAAA5555A1Z5",
      openingBalance: 12000,
      status: "Active",
      category: "Logistics"
    },
    {
      name: "Larsen & Toubro Ltd",
      contactPerson: "S. N. Subrahmanyan",
      email: "accounts@larsentoubro.com",
      phone: "9123456784",
      address: "Chennai, TN",
      type: "largeVendor",
      gstin: "33AAAAA6666A1Z6",
      openingBalance: 40000,
      status: "Active",
      category: "Equipment"
    }
  ]

  const seededVendors = []
  for (const vData of newVendors) {
    let v = await Vendor.findOne({ name: vData.name })
    if (!v) {
      v = new Vendor(vData)
      await v.save()
      console.log(`Seeded Vendor: ${v.name}`)
    } else {
      console.log(`Vendor already exists: ${v.name}`)
    }
    seededVendors.push(v)
  }

  // 2. Create Financiers
  const newFinanciers = [
    {
      name: "HDFC Limited",
      contactPerson: "Sashidhar Jagdishan",
      email: "loans@hdfc.com",
      phone: "9223456780",
      address: "Mumbai, MH",
      defaultInterestRate: 11.5,
      status: "Active"
    },
    {
      name: "ICICI Bank Ltd",
      contactPerson: "Sandeep Bakhshi",
      email: "corporate.loans@icici.com",
      phone: "9223456781",
      address: "Mumbai, MH",
      defaultInterestRate: 12.0,
      status: "Active"
    },
    {
      name: "Tata Capital Ltd",
      contactPerson: "Rajiv Sabharwal",
      email: "loans@tatacapital.com",
      phone: "9223456782",
      address: "Mumbai, MH",
      defaultInterestRate: 13.5,
      status: "Active"
    }
  ]

  const seededFinanciers = []
  for (const fData of newFinanciers) {
    let f = await Financier.findOne({ name: fData.name })
    if (!f) {
      f = new Financier(fData)
      await f.save()
      console.log(`Seeded Financier: ${f.name}`)
    } else {
      console.log(`Financier already exists: ${f.name}`)
    }
    seededFinanciers.push(f)
  }

  // 3. Create Bills, Payments, and Transactions
  // Let's seed bills spread from Jan to Jul 2026
  const billSpecs = [
    { vendorIndex: 0, amount: 250000, billDate: "2026-01-15T00:00:00.000Z", dueDate: "2026-02-15T00:00:00.000Z", billNumber: "INV-2026-001", paidAmount: 250000, status: "PAID" },
    { vendorIndex: 0, amount: 450000, billDate: "2026-02-20T00:00:00.000Z", dueDate: "2026-03-20T00:00:00.000Z", billNumber: "INV-2026-002", paidAmount: 200000, status: "PARTIALLY_PAID" },
    { vendorIndex: 1, amount: 180000, billDate: "2026-03-05T00:00:00.000Z", dueDate: "2026-04-05T00:00:00.000Z", billNumber: "INV-2026-003", paidAmount: 180000, status: "PAID" },
    { vendorIndex: 1, amount: 320000, billDate: "2026-04-10T00:00:00.000Z", dueDate: "2026-05-10T00:00:00.000Z", billNumber: "INV-2026-004", paidAmount: 0, status: "UNPAID" },
    { vendorIndex: 2, amount: 120000, billDate: "2026-05-02T00:00:00.000Z", dueDate: "2026-06-02T00:00:00.000Z", billNumber: "INV-2026-005", paidAmount: 120000, status: "PAID" },
    { vendorIndex: 2, amount: 280000, billDate: "2026-06-15T00:00:00.000Z", dueDate: "2026-07-15T00:00:00.000Z", billNumber: "INV-2026-006", paidAmount: 80000, status: "PARTIALLY_PAID" },
    { vendorIndex: 3, amount: 150000, billDate: "2026-03-12T00:00:00.000Z", dueDate: "2026-04-12T00:00:00.000Z", billNumber: "INV-2026-007", paidAmount: 150000, status: "PAID" },
    { vendorIndex: 3, amount: 380000, billDate: "2026-05-25T00:00:00.000Z", dueDate: "2026-06-25T00:00:00.000Z", billNumber: "INV-2026-008", paidAmount: 0, status: "UNPAID" },
    { vendorIndex: 4, amount: 500000, billDate: "2026-06-01T00:00:00.000Z", dueDate: "2026-07-01T00:00:00.000Z", billNumber: "INV-2026-009", paidAmount: 200000, status: "PARTIALLY_PAID" },
    { vendorIndex: 4, amount: 620000, billDate: "2026-07-02T00:00:00.000Z", dueDate: "2026-08-02T00:00:00.000Z", billNumber: "INV-2026-010", paidAmount: 0, status: "UNPAID" }
  ]

  for (const spec of billSpecs) {
    const vendor = seededVendors[spec.vendorIndex]
    let bill = await Bill.findOne({ billNumber: spec.billNumber, vendorId: vendor._id })
    if (!bill) {
      bill = new Bill({
        billNumber: spec.billNumber,
        vendorId: vendor._id,
        amount: spec.amount,
        paidAmount: spec.paidAmount,
        outstandingAmount: spec.amount - spec.paidAmount,
        billDate: new Date(spec.billDate),
        dueDate: new Date(spec.dueDate),
        status: spec.status
      })
      await bill.save()

      // Transaction for BILL_POSTED
      let running = await Transaction.find({ vendorId: vendor._id }).sort({ date: 1 })
      let runningBal = running.length > 0 ? running[running.length - 1].runningBalance : 0
      runningBal += spec.amount

      const t1 = new Transaction({
        date: new Date(spec.billDate),
        type: 'BILL_POSTED',
        amount: spec.amount,
        runningBalance: runningBal,
        vendorId: vendor._id,
        referenceId: bill._id,
        referenceType: 'Bill',
        description: `Bill ${spec.billNumber} posted`
      })
      await t1.save()

      // If paid or partially paid, create Payment + Transaction
      if (spec.paidAmount > 0) {
        const refNo = String(100200 + Math.floor(Math.random() * 9000))
        const pDate = new Date(new Date(spec.billDate).getTime() + 10 * 24 * 60 * 60 * 1000) // 10 days later
        const payment = new Payment({
          vendorId: vendor._id,
          amount: spec.paidAmount,
          paymentDate: pDate,
          paymentMode: 'BANK_TRANSFER',
          referenceNumber: refNo,
          allocations: [{ billId: bill._id, allocatedAmount: spec.paidAmount }]
        })
        await payment.save()

        runningBal -= spec.paidAmount
        const t2 = new Transaction({
          date: pDate,
          type: 'BILL_PAID',
          amount: spec.paidAmount,
          runningBalance: runningBal,
          vendorId: vendor._id,
          referenceId: payment._id,
          referenceType: 'Payment',
          description: `Payment allocation of ₹${spec.paidAmount} for Bill ${spec.billNumber}`
        })
        await t2.save()
      }
      console.log(`Seeded Bill and Transactions for ${spec.billNumber}`)
    }
  }

  // 4. Create Loans, Repayments, and Transactions
  const loanSpecs = [
    { financierIndex: 0, amount: 600000, rate: 11.5, drawdownDate: "2026-01-10T00:00:00.000Z", maturityDate: "2026-07-10T00:00:00.000Z", loanReference: "LN-2026-101", paidPrincipal: 600000, status: "SETTLED" },
    { financierIndex: 0, amount: 800000, rate: 11.5, drawdownDate: "2026-03-12T00:00:00.000Z", maturityDate: "2026-09-12T00:00:00.000Z", loanReference: "LN-2026-102", paidPrincipal: 300000, status: "ACTIVE" },
    { financierIndex: 1, amount: 1000000, rate: 12.0, drawdownDate: "2026-02-15T00:00:00.000Z", maturityDate: "2026-08-15T00:00:00.000Z", loanReference: "LN-2026-103", paidPrincipal: 1000000, status: "SETTLED" },
    { financierIndex: 1, amount: 1200000, rate: 12.0, drawdownDate: "2026-05-18T00:00:00.000Z", maturityDate: "2026-11-18T00:00:00.000Z", loanReference: "LN-2026-104", paidPrincipal: 400000, status: "ACTIVE" },
    { financierIndex: 2, amount: 1500000, rate: 13.5, drawdownDate: "2026-04-20T00:00:00.000Z", maturityDate: "2026-10-20T00:00:00.000Z", loanReference: "LN-2026-105", paidPrincipal: 0, status: "ACTIVE" }
  ]

  for (const spec of loanSpecs) {
    const financier = seededFinanciers[spec.financierIndex]
    let loan = await Loan.findOne({ loanReference: spec.loanReference })
    if (!loan) {
      loan = new Loan({
        loanReference: spec.loanReference,
        financierId: financier._id,
        principalAmount: spec.amount,
        interestRate: spec.rate,
        paidPrincipal: spec.paidPrincipal,
        paidInterest: spec.paidPrincipal > 0 ? 10000 : 0,
        outstandingPrincipal: spec.amount - spec.paidPrincipal,
        drawdownDate: new Date(spec.drawdownDate),
        maturityDate: new Date(spec.maturityDate),
        status: spec.status
      })
      await loan.save()

      // Transaction for LOAN_DRAWDOWN
      let running = await Transaction.find({ financierId: financier._id }).sort({ date: 1 })
      let runningBal = running.length > 0 ? running[running.length - 1].runningBalance : 0
      runningBal += spec.amount

      const t1 = new Transaction({
        date: new Date(spec.drawdownDate),
        type: 'LOAN_DRAWDOWN',
        amount: spec.amount,
        runningBalance: runningBal,
        financierId: financier._id,
        referenceId: loan._id,
        referenceType: 'Loan',
        description: `Loan ${spec.loanReference} drawdown`
      })
      await t1.save()

      // If repaid, create Repayment + Transaction
      if (spec.paidPrincipal > 0) {
        const refNo = "TXN-" + String(90182740 + Math.floor(Math.random() * 9000))
        const rDate = new Date(new Date(spec.drawdownDate).getTime() + 60 * 24 * 60 * 60 * 1000) // 60 days later
        const repayment = new Repayment({
          loanId: loan._id,
          amount: spec.paidPrincipal + 10000,
          repaymentDate: rDate,
          interestPaid: 10000,
          principalPaid: spec.paidPrincipal,
          repaymentMode: 'BANK_TRANSFER',
          referenceNumber: refNo
        })
        await repayment.save()

        runningBal -= spec.paidPrincipal
        const t2 = new Transaction({
          date: rDate,
          type: 'LOAN_REPAYMENT',
          amount: spec.paidPrincipal,
          runningBalance: runningBal,
          financierId: financier._id,
          referenceId: repayment._id,
          referenceType: 'Repayment',
          description: `Repayment for Loan ${spec.loanReference}`
        })
        await t2.save()
      }
      console.log(`Seeded Loan and Repayments for ${spec.loanReference}`)
    }
  }

  // 5. Update cached aggregate outstanding balances
  console.log("Updating cached balances...")
  const allVendors = await Vendor.find({})
  for (const v of allVendors) {
    const activeBills = await Bill.find({ vendorId: v._id, isDeleted: false })
    const outstanding = activeBills.reduce((s, b) => s + b.outstandingAmount, 0)
    v.outstandingBalance = outstanding
    await v.save()
  }

  const allFinanciers = await Financier.find({})
  for (const f of allFinanciers) {
    const activeLoans = await Loan.find({ financierId: f._id, isDeleted: false })
    const outstanding = activeLoans.reduce((s, l) => s + l.outstandingPrincipal, 0)
    f.outstandingBalance = outstanding
    await f.save()
  }

  console.log("Database seeded successfully!")
  await mongoose.disconnect()
}

run().catch(err => {
  console.error("Seeding failed:", err)
  process.exit(1)
})
