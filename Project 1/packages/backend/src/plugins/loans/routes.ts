/**
 * NexusFinance Loans API
 *
 * Personal loans, auto loans, mortgages.
 * Loan lifecycle: applied → under_review → approved/rejected → active → paid_off
 *
 * GET  /api/v1/loans                — List user's loans
 * GET  /api/v1/loans/:id            — Loan details with repayment schedule
 * POST /api/v1/loans/apply          — Submit a loan application
 * GET  /api/v1/loans/:id/schedule   — Full amortization schedule
 * POST /api/v1/loans/:id/payment    — Make a loan repayment
 */

import Router from 'express-promise-router';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

import { TABLES }        from '../../services/database';
import { ValidationError, NotFoundError, BusinessRuleError } from '../../middleware/errorHandler';
import { requireKyc }    from '../../middleware/authMiddleware';
import { createLogger }  from '../../utils/logger';

const logger = createLogger('nexus-loans');

const applySchema = Joi.object({
  loanType:    Joi.string().valid('personal', 'auto', 'mortgage', 'student').required(),
  amount:      Joi.number().positive().required(),
  termMonths:  Joi.number().integer().min(3).max(360).required(),
  purpose:     Joi.string().max(200).required(),
  annualIncome: Joi.number().positive().required(),
  employmentStatus: Joi.string().valid('employed', 'self_employed', 'unemployed', 'retired').required(),
  creditScore:  Joi.number().integer().min(300).max(850).optional(),
});

export function loanRoutes() {
  const router = Router();

  // GET /api/v1/loans
  router.get('/', async (req: any, res) => {
    const { db, user } = req;
    const loans = await db(TABLES.LOANS)
      .where({ user_id: user.id })
      .orderBy('created_at', 'desc');
    return res.json({ loans, total: loans.length });
  });

  // GET /api/v1/loans/:id
  router.get('/:id', async (req: any, res) => {
    const { db, user } = req;
    const loan = await db(TABLES.LOANS)
      .where({ id: req.params.id, user_id: user.id }).first();
    if (!loan) throw new NotFoundError('Loan', req.params.id);

    const schedule = await db(TABLES.LOAN_SCHEDULES)
      .where({ loan_id: loan.id }).orderBy('payment_number', 'asc');

    return res.json({ ...loan, schedule });
  });

  // POST /api/v1/loans/apply — KYC level 1 required to apply for a loan
  router.post('/apply', requireKyc(1), async (req: any, res) => {
    const { error, value } = applySchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const { db, user, config } = req;

    const maxAmount = config.nexusfinance?.loans?.maxLoanAmount ?? 500_000;
    const minAmount = config.nexusfinance?.loans?.minLoanAmount ?? 1_000;

    if (value.amount > maxAmount) {
      throw new BusinessRuleError(`Maximum loan amount is $${maxAmount.toLocaleString()}.`);
    }
    if (value.amount < minAmount) {
      throw new BusinessRuleError(`Minimum loan amount is $${minAmount.toLocaleString()}.`);
    }

    // Simple credit scoring model (in production, integrate with Experian/Equifax)
    const baseRate  = config.nexusfinance?.loans?.baseInterestRate ?? 0.065;
    const creditScore = value.creditScore ?? 650;
    const riskAdjustment = creditScore >= 750 ? -0.01  // Excellent credit → lower rate
                          : creditScore >= 700 ? 0      // Good credit → base rate
                          : creditScore >= 650 ? 0.02   // Fair credit → +2%
                          : 0.05;                        // Poor credit → +5%
    const interestRate = Math.max(baseRate + riskAdjustment, 0.03); // Floor at 3%

    // Debt-to-Income ratio check (max 43% is industry standard)
    const monthlyPayment = calculateMonthlyPayment(value.amount, interestRate, value.termMonths);
    const monthlyIncome  = value.annualIncome / 12;
    const dtiRatio       = monthlyPayment / monthlyIncome;
    const maxDti         = 0.43;

    const applicationId = uuidv4();
    const isApproved    = dtiRatio <= maxDti && creditScore >= 580 && value.employmentStatus !== 'unemployed';

    const [application] = await db(TABLES.LOAN_APPLICATIONS).insert({
      id:                applicationId,
      user_id:           user.id,
      loan_type:         value.loanType,
      requested_amount:  value.amount,
      term_months:       value.termMonths,
      purpose:           value.purpose,
      annual_income:     value.annualIncome,
      employment_status: value.employmentStatus,
      credit_score:      creditScore,
      calculated_rate:   interestRate,
      dti_ratio:         dtiRatio,
      status:            isApproved ? 'approved' : 'under_review',
      created_at:        new Date(),
    }).returning('*');

    if (isApproved) {
      // Create the actual loan record
      const loanId = uuidv4();
      await db(TABLES.LOANS).insert({
        id:                loanId,
        user_id:           user.id,
        application_id:    applicationId,
        loan_type:         value.loanType,
        principal_amount:  value.amount,
        outstanding_balance: value.amount,
        interest_rate:     interestRate,
        term_months:       value.termMonths,
        monthly_payment:   monthlyPayment,
        status:            'approved',
        next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        created_at:        new Date(),
      });

      // Generate amortization schedule
      await generateAmortizationSchedule(db, loanId, value.amount, interestRate, value.termMonths);

      logger.info('Loan approved', { userId: user.id, loanId, amount: value.amount, rate: interestRate });
    }

    return res.status(201).json({
      applicationId,
      status:           application.status,
      amount:           value.amount,
      interestRate:     (interestRate * 100).toFixed(2) + '%',
      monthlyPayment:   isApproved ? monthlyPayment.toFixed(2) : null,
      termMonths:       value.termMonths,
      dtiRatio:         (dtiRatio * 100).toFixed(1) + '%',
      message: isApproved
        ? `Congratulations! Your loan of $${value.amount.toLocaleString()} has been approved at ${(interestRate*100).toFixed(2)}% APR.`
        : 'Your application is under review. We will notify you within 2 business days.',
    });
  });

  return router;
}

// ── Financial Calculation Helpers ───────────────────────────────────────────

// Standard loan amortization formula
function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / termMonths; // 0% interest edge case
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))
                   / (Math.pow(1 + monthlyRate, termMonths) - 1);
}

async function generateAmortizationSchedule(
  db: any, loanId: string,
  principal: number, annualRate: number, termMonths: number
): Promise<void> {
  const monthlyRate = annualRate / 12;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths);
  let balance = principal;
  const scheduleRows = [];

  for (let month = 1; month <= termMonths; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance = Math.max(balance - principalPayment, 0);

    scheduleRows.push({
      id:                uuidv4(),
      loan_id:           loanId,
      payment_number:    month,
      due_date:          new Date(Date.now() + month * 30 * 24 * 60 * 60 * 1000),
      payment_amount:    monthlyPayment.toFixed(2),
      principal_amount:  principalPayment.toFixed(2),
      interest_amount:   interestPayment.toFixed(2),
      remaining_balance: balance.toFixed(2),
      status:            'pending',
    });
  }

  // Bulk insert the entire schedule at once (more efficient than one-by-one)
  await db(TABLES.LOAN_SCHEDULES).insert(scheduleRows);
}
