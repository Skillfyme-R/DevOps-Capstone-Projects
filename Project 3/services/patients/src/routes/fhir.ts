import { Router, Request, Response } from 'express';
import { getDb } from '../services/database';
import { authenticate } from '../middleware/authMiddleware';
import { NotFoundError } from '../middleware/errorHandler';

const router = Router();

function toFhirPatient(p: Record<string, unknown>) {
  const address = p.address ? (typeof p.address === 'string' ? JSON.parse(p.address) : p.address) : null;
  return {
    resourceType: 'Patient',
    id: p.id,
    meta: { versionId: '1', lastUpdated: p.updated_at, profile: ['http://hl7.org/fhir/StructureDefinition/Patient'] },
    identifier: [{ system: 'urn:medicore:mrn', value: p.mrn }],
    active: !p.is_deleted,
    name: [{ use: 'official', family: p.last_name, given: [p.first_name] }],
    telecom: [
      ...(p.phone ? [{ system: 'phone', value: p.phone, use: 'home' }] : []),
      ...(p.email ? [{ system: 'email', value: p.email }] : []),
    ],
    gender: p.gender,
    birthDate: p.date_of_birth,
    address: address ? [{ use: 'home', line: [address.line1, address.line2].filter(Boolean), city: address.city, state: address.state, postalCode: address.postalCode, country: address.country }] : [],
  };
}

router.get('/Patient', authenticate, async (req: Request, res: Response) => {
  const db = getDb();
  const patients = await db('mc_patients').where({ is_deleted: false }).limit(50);
  res.json({
    resourceType: 'Bundle',
    type: 'searchset',
    total: patients.length,
    entry: patients.map((p) => ({ resource: toFhirPatient(p), fullUrl: `/fhir/r4/Patient/${p.id}` })),
  });
});

router.get('/Patient/:id', authenticate, async (req: Request, res: Response) => {
  const db = getDb();
  const patient = await db('mc_patients').where({ id: req.params.id, is_deleted: false }).first();
  if (!patient) throw new NotFoundError('Patient');
  res.json(toFhirPatient(patient));
});

router.get('/metadata', (_req: Request, res: Response) => {
  res.json({
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: new Date().toISOString(),
    kind: 'instance',
    software: { name: 'MediCore FHIR Server', version: '1.0.0' },
    fhirVersion: '4.0.1',
    format: ['json'],
    rest: [{
      mode: 'server',
      resource: [
        { type: 'Patient', interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }, { code: 'update' }] },
        { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Observation', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'MedicationRequest', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Appointment', interaction: [{ code: 'read' }, { code: 'search-type' }] },
      ],
    }],
  });
});

export default router;
