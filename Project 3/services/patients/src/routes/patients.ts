import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../services/database';
import { getCache } from '../services/cache';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';

const router = Router();

const patientSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  dateOfBirth: Joi.string().isoDate().optional(),
  gender: Joi.string().valid('male', 'female', 'other', 'unknown').required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  address: Joi.object({
    line1: Joi.string().required(),
    line2: Joi.string().optional(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    postalCode: Joi.string().required(),
    country: Joi.string().default('US'),
  }).optional(),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
  maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed', 'unknown').optional(),
  nationalId: Joi.string().optional(),
  emergencyContact: Joi.object({
    name: Joi.string().required(),
    relationship: Joi.string().required(),
    phone: Joi.string().required(),
  }).optional(),
  insuranceInfo: Joi.object({
    provider: Joi.string().required(),
    policyNumber: Joi.string().required(),
    groupNumber: Joi.string().optional(),
    expiryDate: Joi.string().isoDate().optional(),
  }).optional(),
  primaryPhysicianId: Joi.string().uuid().optional(),
  facilityId: Joi.string().uuid().optional(),
});

router.get('/', authenticate, requireRole('clinician', 'nurse', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  const db = getDb();
  const { search, page = 1, limit = 20, facilityId } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const filters: Record<string, unknown> = { is_deleted: false };
  if (facilityId) filters.facility_id = facilityId;

  function applySearch(q: ReturnType<typeof db>) {
    if (!search) return q;
    return q.where((b: ReturnType<typeof db>) =>
      b.whereILike('first_name', `%${search}%`)
        .orWhereILike('last_name', `%${search}%`)
        .orWhereILike('mrn', `%${search}%`)
        .orWhereILike('email', `%${search}%`)
    );
  }

  const countRow = await applySearch(db('mc_patients').where(filters).count('id as count')).first();
  const patients = await applySearch(db('mc_patients').select('*').where(filters))
    .orderBy('last_name').limit(Number(limit)).offset(offset);

  res.json({ patients, total: Number((countRow as any)?.count || 0), page: Number(page), limit: Number(limit) });
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const db = getDb();
  const patient = await db('mc_patients').where({ id: req.params.id, is_deleted: false }).first();
  if (!patient) throw new NotFoundError('Patient');

  if (req.user?.role === 'patient' && req.user.sub !== patient.user_id) {
    throw new ForbiddenError('You can only access your own records');
  }

  const [allergies, conditions, medications] = await Promise.all([
    db('mc_allergies').where({ patient_id: patient.id, is_active: true }),
    db('mc_conditions').where({ patient_id: patient.id, status: 'active' }),
    db('mc_medications').where({ patient_id: patient.id, status: 'active' }),
  ]);

  res.json({ patient, allergies, activeConditions: conditions, currentMedications: medications });
});

router.post('/', authenticate, requireRole('clinician', 'nurse', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  const { error, value } = patientSchema.validate(req.body);
  if (error) throw new ValidationError(error.details[0].message);

  const db = getDb();
  const mrn = `MC-${Date.now().toString().slice(-8)}`;

  const [patient] = await db('mc_patients').insert({
    id: uuidv4(),
    mrn,
    first_name: value.firstName,
    last_name: value.lastName,
    date_of_birth: value.dateOfBirth || null,
    gender: value.gender,
    email: value.email || null,
    phone: value.phone || null,
    address: value.address ? JSON.stringify(value.address) : null,
    blood_group: value.bloodGroup || null,
    marital_status: value.maritalStatus || null,
    national_id: value.nationalId || null,
    emergency_contact: value.emergencyContact ? JSON.stringify(value.emergencyContact) : null,
    insurance_info: value.insuranceInfo ? JSON.stringify(value.insuranceInfo) : null,
    primary_physician_id: value.primaryPhysicianId || null,
    facility_id: value.facilityId || req.user?.facilityId || null,
    registered_by: req.user?.sub,
    is_deleted: false,
    created_at: new Date(),
    updated_at: new Date(),
  }).returning('*');

  res.status(201).json({ patient, message: 'Patient registered successfully' });
});

router.patch('/:id', authenticate, requireRole('clinician', 'nurse', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  const { error, value } = patientSchema.fork(Object.keys(patientSchema.describe().keys), (s) => s.optional()).validate(req.body);
  if (error) throw new ValidationError(error.details[0].message);

  const db = getDb();
  const existing = await db('mc_patients').where({ id: req.params.id, is_deleted: false }).first();
  if (!existing) throw new NotFoundError('Patient');

  const cache = getCache();
  await cache.del(`mc:patient:${req.params.id}`);

  const [updated] = await db('mc_patients').where({ id: req.params.id }).update({
    ...(value.firstName && { first_name: value.firstName }),
    ...(value.lastName && { last_name: value.lastName }),
    ...(value.phone && { phone: value.phone }),
    ...(value.address && { address: JSON.stringify(value.address) }),
    ...(value.emergencyContact && { emergency_contact: JSON.stringify(value.emergencyContact) }),
    ...(value.insuranceInfo && { insurance_info: JSON.stringify(value.insuranceInfo) }),
    updated_at: new Date(),
  }).returning('*');

  res.json({ patient: updated });
});

router.delete('/:id', authenticate, requireRole('admin', 'superadmin'), async (req: Request, res: Response) => {
  const db = getDb();
  const existing = await db('mc_patients').where({ id: req.params.id, is_deleted: false }).first();
  if (!existing) throw new NotFoundError('Patient');
  await db('mc_patients').where({ id: req.params.id }).update({ is_deleted: true, deleted_at: new Date() });
  res.json({ message: 'Patient record archived' });
});

export default router;
