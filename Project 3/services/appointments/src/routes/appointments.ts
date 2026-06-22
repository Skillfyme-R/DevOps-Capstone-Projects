import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../services/database';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';

const router = Router();

const appointmentSchema = Joi.object({
  patientId: Joi.string().uuid().optional(),
  physicianId: Joi.string().uuid().optional(),
  facilityId: Joi.string().uuid().optional(),
  type: Joi.string().valid('consultation', 'follow_up', 'procedure', 'lab', 'imaging', 'telemedicine', 'emergency', 'routine_checkup', 'specialist').required(),
  scheduledAt: Joi.string().isoDate().required(),
  durationMinutes: Joi.number().integer().min(15).max(240).default(30),
  chiefComplaint: Joi.string().max(500).optional(),
  notes: Joi.string().max(2000).optional(),
  isTelemedicine: Joi.boolean().default(false),
  roomNumber: Joi.string().max(20).optional(),
  priority: Joi.string().valid('routine', 'urgent', 'emergency').default('routine'),
});

const DEFAULT_FACILITY_ID = '00000000-0000-0000-0000-000000000001';

router.get('/', authenticate, async (req: Request, res: Response) => {
  const db = getDb();
  const { patientId, physicianId, facilityId, status, from, to, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const baseWhere: Record<string, unknown> = {};

  // Only hide cancelled when no specific status is requested
  if (!status) baseWhere['mc_appointments.is_cancelled'] = false;

  if (req.user?.role === 'patient') {
    const patient = await db('mc_patients').where({ user_id: req.user.sub }).first();
    if (!patient) return res.json({ appointments: [], total: 0 });
    baseWhere['mc_appointments.patient_id'] = patient.id;
  } else {
    if (patientId) baseWhere['mc_appointments.patient_id'] = patientId;
    if (physicianId) baseWhere['mc_appointments.physician_id'] = physicianId;
    if (facilityId) baseWhere['mc_appointments.facility_id'] = facilityId;
  }
  if (status) baseWhere['mc_appointments.status'] = status;

  function applyDateFilters(q: ReturnType<typeof db>) {
    if (from) q = q.where('mc_appointments.scheduled_at', '>=', from);
    if (to) q = q.where('mc_appointments.scheduled_at', '<=', to);
    return q;
  }

  const countRow = await applyDateFilters(
    db('mc_appointments').where(baseWhere).count('mc_appointments.id as count')
  ).first();

  const appointments = await applyDateFilters(
    db('mc_appointments')
      .leftJoin('mc_patients', 'mc_patients.id', 'mc_appointments.patient_id')
      .select(
        'mc_appointments.*',
        'mc_patients.first_name as patient_first_name',
        'mc_patients.last_name as patient_last_name',
        'mc_patients.mrn as patient_mrn',
      )
      .where(baseWhere)
  ).orderBy('mc_appointments.scheduled_at').limit(Number(limit)).offset(offset);

  res.json({ appointments, total: Number((countRow as any)?.count || 0), page: Number(page), limit: Number(limit) });
});

// Visit reports — completed appointments with patient info (must be before /:id)
router.get('/reports', authenticate, async (req: Request, res: Response) => {
  const db = getDb();
  const { patientId, from, to, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  // Build shared filters, then apply separately to count and data queries
  let patientFilter: string | null = null;
  if (req.user?.role === 'patient') {
    const patient = await db('mc_patients').where({ user_id: req.user.sub }).first();
    if (!patient) return res.json({ reports: [], total: 0 });
    patientFilter = patient.id;
  } else if (patientId) {
    patientFilter = patientId as string;
  }

  function applyFilters(q: ReturnType<typeof db>) {
    q = q.where('mc_appointments.status', 'completed');
    if (patientFilter) q = q.where('mc_appointments.patient_id', patientFilter);
    if (from) q = q.where('mc_appointments.scheduled_at', '>=', from);
    if (to) q = q.where('mc_appointments.scheduled_at', '<=', to);
    return q;
  }

  const countRow = await applyFilters(
    db('mc_appointments').leftJoin('mc_patients', 'mc_patients.id', 'mc_appointments.patient_id').count('mc_appointments.id as count')
  ).first();

  const reports = await applyFilters(
    db('mc_appointments')
      .leftJoin('mc_patients', 'mc_patients.id', 'mc_appointments.patient_id')
      .leftJoin('mc_visit_reports', 'mc_visit_reports.appointment_id', 'mc_appointments.id')
      .select(
        'mc_appointments.*',
        'mc_patients.first_name',
        'mc_patients.last_name',
        'mc_patients.mrn',
        'mc_patients.date_of_birth',
        'mc_patients.gender',
        'mc_visit_reports.id as report_id',
        'mc_visit_reports.diagnosis',
        'mc_visit_reports.clinical_findings',
        'mc_visit_reports.vitals',
        'mc_visit_reports.prescriptions as report_prescriptions',
        'mc_visit_reports.lab_orders as report_lab_orders',
        'mc_visit_reports.follow_up_instructions',
        'mc_visit_reports.follow_up_date',
        'mc_visit_reports.sicknote_days',
        'mc_visit_reports.reported_at',
      )
  ).orderBy('mc_appointments.scheduled_at', 'desc').limit(Number(limit)).offset(offset);

  res.json({ reports, total: Number((countRow as any)?.count || 0) });
});

// Write / update clinical report for a completed appointment
router.post('/:id/report', authenticate, async (req: Request, res: Response) => {
  if (!['clinician', 'nurse', 'admin', 'superadmin'].includes(req.user?.role || '')) {
    throw new ForbiddenError('Only clinical staff can write visit reports');
  }
  const db = getDb();
  const appointment = await db('mc_appointments').where({ id: req.params.id }).first();
  if (!appointment) throw new NotFoundError('Appointment');
  if (appointment.status !== 'completed') throw new ValidationError('Can only write reports for completed appointments');

  const { diagnosis, clinicalFindings, vitals, prescriptions, labOrders, followUpInstructions, followUpDate, sicknoteDays } = req.body;

  const existing = await db('mc_visit_reports').where({ appointment_id: req.params.id }).first();
  if (existing) {
    const [updated] = await db('mc_visit_reports').where({ appointment_id: req.params.id }).update({
      diagnosis: diagnosis || null,
      clinical_findings: clinicalFindings || null,
      vitals: vitals ? JSON.stringify(vitals) : '{}',
      prescriptions: prescriptions ? JSON.stringify(prescriptions) : '[]',
      lab_orders: labOrders ? JSON.stringify(labOrders) : '[]',
      follow_up_instructions: followUpInstructions || null,
      follow_up_date: followUpDate || null,
      sicknote_days: sicknoteDays || null,
      updated_at: new Date(),
    }).returning('*');
    return res.json({ report: updated });
  }

  const [report] = await db('mc_visit_reports').insert({
    appointment_id: req.params.id,
    patient_id: appointment.patient_id,
    diagnosis: diagnosis || null,
    clinical_findings: clinicalFindings || null,
    vitals: vitals ? JSON.stringify(vitals) : '{}',
    prescriptions: prescriptions ? JSON.stringify(prescriptions) : '[]',
    lab_orders: labOrders ? JSON.stringify(labOrders) : '[]',
    follow_up_instructions: followUpInstructions || null,
    follow_up_date: followUpDate || null,
    sicknote_days: sicknoteDays || null,
    reported_by: req.user?.sub,
  }).returning('*');

  res.status(201).json({ report });
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const db = getDb();
  const appointment = await db('mc_appointments').where({ id: req.params.id }).first();
  if (!appointment) throw new NotFoundError('Appointment');

  if (req.user?.role === 'patient') {
    const patient = await db('mc_patients').where({ user_id: req.user.sub }).first();
    if (!patient || patient.id !== appointment.patient_id) throw new ForbiddenError('Cannot access this appointment');
  }

  res.json({ appointment });
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  const { error, value } = appointmentSchema.validate(req.body);
  if (error) throw new ValidationError(error.details[0].message);

  const db = getDb();

  // Patient booking: ignore any patientId from body, always use their own record
  if (req.user?.role === 'patient') {
    const ownPatient = await db('mc_patients').where({ user_id: req.user.sub }).first();
    if (!ownPatient) throw new ValidationError('No patient record linked to your account. Please contact the clinic.');
    value.patientId = ownPatient.id;
  } else if (['clinician', 'nurse', 'admin', 'superadmin'].includes(req.user?.role || '')) {
    if (!value.patientId) throw new ValidationError('"patientId" is required');
  } else {
    throw new ForbiddenError('Not authorised to book appointments');
  }

  const physicianId = value.physicianId || DEFAULT_FACILITY_ID;
  const facilityId = value.facilityId || req.user?.facilityId || DEFAULT_FACILITY_ID;

  // Only check conflicts when a real physician is explicitly assigned (not the default placeholder)
  if (value.physicianId && value.physicianId !== DEFAULT_FACILITY_ID) {
    const conflict = await db('mc_appointments')
      .where({ physician_id: physicianId, is_cancelled: false })
      .whereBetween('scheduled_at', [
        new Date(new Date(value.scheduledAt).getTime() - value.durationMinutes * 60000),
        new Date(new Date(value.scheduledAt).getTime() + value.durationMinutes * 60000),
      ]).first();
    if (conflict) throw new ValidationError('Physician already has an appointment in this time slot');
  }

  const [appointment] = await db('mc_appointments').insert({
    id: uuidv4(),
    patient_id: value.patientId,
    physician_id: physicianId,
    facility_id: facilityId,
    type: value.type,
    scheduled_at: value.scheduledAt,
    duration_minutes: value.durationMinutes,
    chief_complaint: value.chiefComplaint || null,
    notes: value.notes || null,
    is_telemedicine: value.isTelemedicine,
    room_number: value.roomNumber || null,
    priority: value.priority,
    status: 'confirmed',
    is_cancelled: false,
    booked_by: req.user?.sub,
    created_at: new Date(),
    updated_at: new Date(),
  }).returning('*');

  res.status(201).json({ appointment, message: 'Appointment scheduled successfully' });
});

router.patch('/:id/status', authenticate, async (req: Request, res: Response) => {
  const { status, cancellationReason } = req.body;
  const validStatuses = ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'no_show', 'cancelled'];
  if (!validStatuses.includes(status)) throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);

  const db = getDb();
  const existing = await db('mc_appointments').where({ id: req.params.id }).first();
  if (!existing) throw new NotFoundError('Appointment');

  // Patients can only cancel their own appointments
  if (req.user?.role === 'patient') {
    const ownPatient = await db('mc_patients').where({ user_id: req.user.sub }).first();
    if (!ownPatient || ownPatient.id !== existing.patient_id) throw new ForbiddenError('Cannot modify this appointment');
    if (status !== 'cancelled') throw new ForbiddenError('Patients can only cancel appointments');
    if (!['scheduled', 'confirmed'].includes(existing.status)) throw new ValidationError('Can only cancel scheduled or confirmed appointments');
  } else if (!['clinician', 'nurse', 'admin', 'superadmin'].includes(req.user?.role || '')) {
    throw new ForbiddenError('Not authorised to update appointment status');
  }

  const [updated] = await db('mc_appointments').where({ id: req.params.id }).update({
    status,
    cancellation_reason: cancellationReason || null,
    is_cancelled: status === 'cancelled',
    cancelled_at: status === 'cancelled' ? new Date() : null,
    updated_at: new Date(),
  }).returning('*');

  res.json({ appointment: updated });
});

router.delete('/:id', authenticate, requireRole('clinician', 'nurse', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  const { reason } = req.body;
  const db = getDb();
  const existing = await db('mc_appointments').where({ id: req.params.id }).first();
  if (!existing) throw new NotFoundError('Appointment');

  await db('mc_appointments').where({ id: req.params.id }).update({
    is_cancelled: true,
    status: 'cancelled',
    cancellation_reason: reason || 'Cancelled by staff',
    cancelled_at: new Date(),
    updated_at: new Date(),
  });

  res.json({ message: 'Appointment cancelled successfully' });
});

export default router;
