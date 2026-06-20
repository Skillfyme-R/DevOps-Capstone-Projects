import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../services/database';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';

const router = Router();

const appointmentSchema = Joi.object({
  patientId: Joi.string().uuid().required(),
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

router.get('/', authenticate, async (req: Request, res: Response) => {
  const db = getDb();
  const { patientId, physicianId, facilityId, status, from, to, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = db('mc_appointments').select('mc_appointments.*').where({ 'mc_appointments.is_cancelled': false });

  if (req.user?.role === 'patient') {
    const patient = await db('mc_patients').where({ user_id: req.user.sub }).first();
    if (!patient) return res.json({ appointments: [], total: 0 });
    query = query.where({ 'mc_appointments.patient_id': patient.id });
  } else {
    if (patientId) query = query.where({ 'mc_appointments.patient_id': patientId });
    if (physicianId) query = query.where({ 'mc_appointments.physician_id': physicianId });
    if (facilityId) query = query.where({ 'mc_appointments.facility_id': facilityId });
  }

  if (status) query = query.where({ 'mc_appointments.status': status });
  if (from) query = query.where('mc_appointments.scheduled_at', '>=', from);
  if (to) query = query.where('mc_appointments.scheduled_at', '<=', to);

  const total = await query.clone().count('mc_appointments.id as count').first();
  const appointments = await query.orderBy('mc_appointments.scheduled_at').limit(Number(limit)).offset(offset);

  res.json({ appointments, total: Number(total?.count || 0), page: Number(page), limit: Number(limit) });
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

router.post('/', authenticate, requireRole('clinician', 'nurse', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  const { error, value } = appointmentSchema.validate(req.body);
  if (error) throw new ValidationError(error.details[0].message);

  const db = getDb();
  const physicianId = value.physicianId || req.user?.sub;
  const facilityId = value.facilityId || req.user?.facilityId || null;

  if (physicianId) {
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
    physician_id: physicianId || null,
    facility_id: facilityId,
    type: value.type,
    scheduled_at: value.scheduledAt,
    duration_minutes: value.durationMinutes,
    chief_complaint: value.chiefComplaint || null,
    notes: value.notes || null,
    is_telemedicine: value.isTelemedicine,
    room_number: value.roomNumber || null,
    priority: value.priority,
    status: 'scheduled',
    is_cancelled: false,
    booked_by: req.user?.sub,
    created_at: new Date(),
    updated_at: new Date(),
  }).returning('*');

  res.status(201).json({ appointment, message: 'Appointment scheduled successfully' });
});

router.patch('/:id/status', authenticate, requireRole('clinician', 'nurse', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  const { status, cancellationReason } = req.body;
  const validStatuses = ['scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'no_show'];
  if (!validStatuses.includes(status)) throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);

  const db = getDb();
  const existing = await db('mc_appointments').where({ id: req.params.id }).first();
  if (!existing) throw new NotFoundError('Appointment');

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
