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

// --- Medical Knowledge (must be before /:id to avoid Express matching 'medical-knowledge' as an id) ---

const MEDICAL_KNOWLEDGE: Array<{
  icd10: string; disease: string; category: string; description: string;
  symptoms: string[]; medications: Array<{ name: string; generic: string; dosage: string; frequency: string; route: string; notes: string }>;
  precautions: string[]; specialty: string;
}> = [
  {
    icd10: 'E11', disease: 'Type 2 Diabetes Mellitus', category: 'Endocrine', specialty: 'Endocrinology',
    description: 'A metabolic disorder characterized by high blood glucose due to insulin resistance and relative insulin deficiency.',
    symptoms: ['Polyuria', 'Polydipsia', 'Polyphagia', 'Fatigue', 'Blurred vision', 'Slow wound healing', 'Frequent infections'],
    medications: [
      { name: 'Metformin', generic: 'Metformin HCl', dosage: '500–1000 mg', frequency: 'Twice daily', route: 'Oral', notes: 'First-line therapy; take with meals to reduce GI upset' },
      { name: 'Glipizide', generic: 'Glipizide', dosage: '5–10 mg', frequency: 'Once daily', route: 'Oral', notes: 'Sulfonylurea; risk of hypoglycaemia' },
      { name: 'Empagliflozin (Jardiance)', generic: 'Empagliflozin', dosage: '10–25 mg', frequency: 'Once daily', route: 'Oral', notes: 'SGLT2 inhibitor; cardio-renal protective' },
      { name: 'Insulin Glargine (Lantus)', generic: 'Insulin Glargine', dosage: '10–40 units', frequency: 'Once daily (bedtime)', route: 'Subcutaneous', notes: 'Long-acting basal insulin' },
    ],
    precautions: ['Monitor HbA1c every 3 months', 'Annual foot exam', 'Renal function check before starting Metformin', 'Avoid excessive alcohol'],
  },
  {
    icd10: 'I10', disease: 'Essential (Primary) Hypertension', category: 'Cardiovascular', specialty: 'Cardiology',
    description: 'Persistently elevated blood pressure (≥140/90 mmHg) without an identifiable secondary cause.',
    symptoms: ['Often asymptomatic', 'Headache (occipital)', 'Epistaxis', 'Blurred vision', 'Chest pain in severe cases'],
    medications: [
      { name: 'Amlodipine (Norvasc)', generic: 'Amlodipine Besylate', dosage: '5–10 mg', frequency: 'Once daily', route: 'Oral', notes: 'Calcium channel blocker; first-line' },
      { name: 'Losartan (Cozaar)', generic: 'Losartan Potassium', dosage: '50–100 mg', frequency: 'Once daily', route: 'Oral', notes: 'ARB; preferred in diabetics with microalbuminuria' },
      { name: 'Hydrochlorothiazide', generic: 'HCTZ', dosage: '12.5–25 mg', frequency: 'Once daily', route: 'Oral', notes: 'Thiazide diuretic; monitor electrolytes' },
      { name: 'Atenolol', generic: 'Atenolol', dosage: '25–100 mg', frequency: 'Once daily', route: 'Oral', notes: 'Beta-blocker; avoid in asthma/COPD' },
    ],
    precautions: ['Monitor BP at every visit', 'Lifestyle: low sodium diet, exercise', 'Avoid NSAIDs', 'Annual renal function & electrolytes'],
  },
  {
    icd10: 'J45', disease: 'Bronchial Asthma', category: 'Respiratory', specialty: 'Pulmonology',
    description: 'Chronic inflammatory airway disease causing recurrent episodes of wheezing, breathlessness, chest tightness and cough.',
    symptoms: ['Wheezing', 'Shortness of breath', 'Chest tightness', 'Coughing (worse at night)', 'Exercise intolerance'],
    medications: [
      { name: 'Salbutamol (Ventolin)', generic: 'Albuterol', dosage: '100–200 mcg', frequency: 'As needed (rescue)', route: 'Inhalation', notes: 'Short-acting β2 agonist; first-line reliever' },
      { name: 'Budesonide (Pulmicort)', generic: 'Budesonide', dosage: '200–400 mcg', frequency: 'Twice daily', route: 'Inhalation', notes: 'Inhaled corticosteroid; controller therapy' },
      { name: 'Formoterol', generic: 'Formoterol Fumarate', dosage: '6–12 mcg', frequency: 'Twice daily', route: 'Inhalation', notes: 'Long-acting β2 agonist; always combine with ICS' },
      { name: 'Montelukast (Singulair)', generic: 'Montelukast Sodium', dosage: '10 mg', frequency: 'Once daily (evening)', route: 'Oral', notes: 'Leukotriene antagonist; adjunct therapy' },
    ],
    precautions: ['Identify & avoid triggers (dust, smoke, pollen)', 'Ensure correct inhaler technique', 'Carry rescue inhaler at all times', 'Annual spirometry'],
  },
  {
    icd10: 'K21', disease: 'Gastro-oesophageal Reflux Disease (GERD)', category: 'Gastroenterology', specialty: 'Gastroenterology',
    description: 'Chronic condition where stomach acid flows back into the oesophagus causing heartburn and tissue damage.',
    symptoms: ['Heartburn', 'Acid regurgitation', 'Dysphagia', 'Chest discomfort', 'Chronic cough', 'Laryngitis', 'Nausea'],
    medications: [
      { name: 'Omeprazole (Prilosec)', generic: 'Omeprazole', dosage: '20–40 mg', frequency: 'Once daily (before breakfast)', route: 'Oral', notes: 'PPI; most effective acid suppression' },
      { name: 'Pantoprazole (Protonix)', generic: 'Pantoprazole Sodium', dosage: '40 mg', frequency: 'Once daily', route: 'Oral', notes: 'PPI; fewer drug interactions' },
      { name: 'Domperidone', generic: 'Domperidone', dosage: '10 mg', frequency: 'Three times daily (before meals)', route: 'Oral', notes: 'Prokinetic; enhances gastric emptying' },
      { name: 'Antacid (Gelusil)', generic: 'Aluminium Hydroxide + Magnesium Hydroxide', dosage: '10–20 mL', frequency: 'As needed', route: 'Oral', notes: 'Symptomatic relief only; not long-term' },
    ],
    precautions: ['Avoid lying down within 2h of meals', 'Elevate head of bed', 'Avoid coffee, alcohol, spicy/fatty foods', 'Endoscopy if symptoms persist >8 weeks'],
  },
  {
    icd10: 'M54.5', disease: 'Low Back Pain', category: 'Musculoskeletal', specialty: 'Orthopaedics',
    description: 'Pain in the lumbar region, often from muscle strain, disc disease, or degenerative changes.',
    symptoms: ['Dull or sharp lumbar pain', 'Radiating pain to buttocks or legs (sciatica)', 'Muscle stiffness', 'Limited range of motion', 'Pain worsened by sitting/bending'],
    medications: [
      { name: 'Ibuprofen (Brufen)', generic: 'Ibuprofen', dosage: '400–600 mg', frequency: 'Three times daily (with food)', route: 'Oral', notes: 'NSAID; effective for inflammatory component' },
      { name: 'Diclofenac (Voltaren)', generic: 'Diclofenac Sodium', dosage: '50 mg', frequency: 'Twice daily', route: 'Oral / Topical', notes: 'NSAID; topical gel reduces systemic side effects' },
      { name: 'Paracetamol (Calpol)', generic: 'Acetaminophen', dosage: '500–1000 mg', frequency: 'Every 6–8 hours as needed', route: 'Oral', notes: 'Safe for mild pain; limit to 4g/day' },
      { name: 'Cyclobenzaprine', generic: 'Cyclobenzaprine HCl', dosage: '5–10 mg', frequency: 'Three times daily', route: 'Oral', notes: 'Muscle relaxant; causes drowsiness' },
    ],
    precautions: ['Physiotherapy preferred over prolonged bed rest', 'Avoid heavy lifting', 'NSAIDs: check renal function & GI history', 'Red flags: bladder/bowel dysfunction → urgent MRI'],
  },
  {
    icd10: 'F32', disease: 'Major Depressive Disorder', category: 'Psychiatry', specialty: 'Psychiatry',
    description: 'A mood disorder characterised by persistent low mood, loss of interest, and a range of emotional and physical symptoms lasting ≥2 weeks.',
    symptoms: ['Persistent sadness', 'Loss of interest/pleasure (anhedonia)', 'Fatigue', 'Sleep disturbance', 'Appetite changes', 'Poor concentration', 'Suicidal ideation'],
    medications: [
      { name: 'Sertraline (Zoloft)', generic: 'Sertraline HCl', dosage: '50–200 mg', frequency: 'Once daily', route: 'Oral', notes: 'SSRI; first-line; takes 4–6 weeks for effect' },
      { name: 'Escitalopram (Lexapro)', generic: 'Escitalopram Oxalate', dosage: '10–20 mg', frequency: 'Once daily', route: 'Oral', notes: 'SSRI; well-tolerated; fewer interactions' },
      { name: 'Venlafaxine (Effexor)', generic: 'Venlafaxine HCl', dosage: '75–225 mg', frequency: 'Once daily (XR form)', route: 'Oral', notes: 'SNRI; useful when pain/anxiety co-exist' },
      { name: 'Mirtazapine (Remeron)', generic: 'Mirtazapine', dosage: '15–45 mg', frequency: 'Once daily (bedtime)', route: 'Oral', notes: 'NaSSA; good for insomnia + poor appetite' },
    ],
    precautions: ['Assess suicide risk at every visit', 'Do not stop abruptly (discontinuation syndrome)', 'Avoid alcohol', 'Psychotherapy (CBT) alongside medication'],
  },
  {
    icd10: 'N39.0', disease: 'Urinary Tract Infection (UTI)', category: 'Urology', specialty: 'Urology',
    description: 'Bacterial infection of the urinary tract — most commonly the bladder (cystitis) caused by E. coli.',
    symptoms: ['Dysuria (painful urination)', 'Frequency & urgency', 'Suprapubic discomfort', 'Haematuria', 'Cloudy/malodorous urine', 'Fever if upper tract involved'],
    medications: [
      { name: 'Nitrofurantoin (Macrobid)', generic: 'Nitrofurantoin', dosage: '100 mg', frequency: 'Twice daily for 5 days', route: 'Oral', notes: 'First-line for uncomplicated UTI; not for pyelonephritis' },
      { name: 'Trimethoprim-Sulfamethoxazole', generic: 'TMP-SMX', dosage: '160/800 mg', frequency: 'Twice daily for 3 days', route: 'Oral', notes: 'Check local resistance patterns before use' },
      { name: 'Fosfomycin (Monurol)', generic: 'Fosfomycin Tromethamine', dosage: '3 g', frequency: 'Single dose', route: 'Oral', notes: 'Convenient single-dose; good compliance' },
      { name: 'Ciprofloxacin', generic: 'Ciprofloxacin HCl', dosage: '250–500 mg', frequency: 'Twice daily for 3–7 days', route: 'Oral', notes: 'Reserve for complicated UTI / pyelonephritis' },
    ],
    precautions: ['Urine culture before starting antibiotics', 'Encourage fluid intake', 'Complete full antibiotic course', 'Recurrent UTI >3/year → urological evaluation'],
  },
  {
    icd10: 'A09', disease: 'Acute Gastroenteritis', category: 'Gastroenterology', specialty: 'General Medicine',
    description: 'Inflammation of the stomach and intestines typically caused by viral or bacterial infection.',
    symptoms: ['Nausea & vomiting', 'Diarrhoea (watery or bloody)', 'Abdominal cramps', 'Fever', 'Dehydration', 'Headache'],
    medications: [
      { name: 'ORS (Oral Rehydration Salts)', generic: 'Sodium Chloride + Glucose', dosage: '1 sachet in 200 mL water', frequency: 'After every loose stool', route: 'Oral', notes: 'Cornerstone of treatment; prevents dehydration' },
      { name: 'Ondansetron (Zofran)', generic: 'Ondansetron HCl', dosage: '4–8 mg', frequency: 'Every 8 hours as needed', route: 'Oral / IV', notes: '5-HT3 antagonist; rapidly controls vomiting' },
      { name: 'Loperamide (Imodium)', generic: 'Loperamide HCl', dosage: '2–4 mg', frequency: 'After each loose stool (max 16 mg/day)', route: 'Oral', notes: 'Anti-motility; avoid in bloody diarrhoea / fever' },
      { name: 'Ciprofloxacin', generic: 'Ciprofloxacin HCl', dosage: '500 mg', frequency: 'Twice daily for 3 days', route: 'Oral', notes: 'Only for confirmed bacterial cause; not viral' },
    ],
    precautions: ['Strict hand hygiene', 'Food safety: avoid raw/undercooked food', 'Hospitalize if severe dehydration or bloody diarrhoea', 'Avoid antidiarrhoeal agents in children <2 years'],
  },
  {
    icd10: 'J06.9', disease: 'Upper Respiratory Tract Infection (URTI)', category: 'Respiratory', specialty: 'General Medicine',
    description: 'Acute infection of the upper airways — most commonly viral (rhinovirus, influenza).',
    symptoms: ['Rhinorrhoea (runny nose)', 'Nasal congestion', 'Sore throat', 'Cough', 'Low-grade fever', 'Malaise', 'Sneezing'],
    medications: [
      { name: 'Paracetamol (Calpol)', generic: 'Acetaminophen', dosage: '500–1000 mg', frequency: 'Every 6 hours as needed', route: 'Oral', notes: 'Fever & pain relief; safe across all ages' },
      { name: 'Cetirizine (Zyrtec)', generic: 'Cetirizine HCl', dosage: '10 mg', frequency: 'Once daily', route: 'Oral', notes: 'Antihistamine; reduces rhinorrhoea and sneezing' },
      { name: 'Oxymetazoline (Afrin)', generic: 'Oxymetazoline', dosage: '2–3 sprays', frequency: 'Every 10–12 hours (max 3 days)', route: 'Nasal', notes: 'Decongestant; do not use >3 days (rebound congestion)' },
      { name: 'Dextromethorphan (Robitussin)', generic: 'Dextromethorphan HBr', dosage: '15–30 mg', frequency: 'Every 6–8 hours', route: 'Oral', notes: 'Cough suppressant; avoid in productive cough' },
    ],
    precautions: ['Antibiotics NOT indicated for viral URTI', 'Rest and adequate hydration', 'Isolate if influenza suspected', 'Return if symptoms worsen after 7 days'],
  },
  {
    icd10: 'E78.5', disease: 'Hyperlipidaemia (Dyslipidaemia)', category: 'Cardiovascular', specialty: 'Cardiology',
    description: 'Abnormal lipid levels in the blood — major risk factor for cardiovascular disease.',
    symptoms: ['Usually asymptomatic', 'Xanthomas in severe cases', 'Corneal arcus', 'Chest pain if coronary artery disease develops'],
    medications: [
      { name: 'Atorvastatin (Lipitor)', generic: 'Atorvastatin Calcium', dosage: '10–80 mg', frequency: 'Once daily (evening)', route: 'Oral', notes: 'High-intensity statin; most prescribed worldwide' },
      { name: 'Rosuvastatin (Crestor)', generic: 'Rosuvastatin Calcium', dosage: '5–40 mg', frequency: 'Once daily', route: 'Oral', notes: 'Most potent statin; fewer drug interactions' },
      { name: 'Fenofibrate (TriCor)', generic: 'Fenofibrate', dosage: '145 mg', frequency: 'Once daily', route: 'Oral', notes: 'Fibrate; primarily lowers triglycerides' },
      { name: 'Ezetimibe (Zetia)', generic: 'Ezetimibe', dosage: '10 mg', frequency: 'Once daily', route: 'Oral', notes: 'Cholesterol absorption inhibitor; use with statin' },
    ],
    precautions: ['Monitor LFTs at baseline and after 3 months of statin', 'Report muscle pain (myopathy/rhabdomyolysis)', 'Diet: reduce saturated fats & trans fats', 'Annual lipid profile'],
  },
  {
    icd10: 'G43', disease: 'Migraine', category: 'Neurology', specialty: 'Neurology',
    description: 'A neurological disorder characterised by recurrent moderate-to-severe headaches, often unilateral and pulsating.',
    symptoms: ['Unilateral throbbing headache', 'Nausea / vomiting', 'Photophobia', 'Phonophobia', 'Aura (visual disturbances)', 'Duration 4–72 hours'],
    medications: [
      { name: 'Sumatriptan (Imitrex)', generic: 'Sumatriptan Succinate', dosage: '50–100 mg', frequency: 'At onset; repeat after 2h if needed', route: 'Oral / Subcutaneous', notes: '5-HT1 agonist; most effective abortive agent' },
      { name: 'Ibuprofen', generic: 'Ibuprofen', dosage: '400–600 mg', frequency: 'At onset', route: 'Oral', notes: 'NSAID; effective for mild-moderate attacks' },
      { name: 'Topiramate (Topamax)', generic: 'Topiramate', dosage: '50–100 mg', frequency: 'Once daily (prophylaxis)', route: 'Oral', notes: 'Preventive therapy for ≥4 migraines/month' },
      { name: 'Propranolol', generic: 'Propranolol HCl', dosage: '40–160 mg', frequency: 'Once daily (prophylaxis)', route: 'Oral', notes: 'Beta-blocker; established migraine prophylaxis' },
    ],
    precautions: ['Avoid overuse of analgesics (MOH risk)', 'Identify & avoid triggers (stress, sleep, foods)', 'Keep migraine diary', 'Triptans contraindicated in CAD / uncontrolled HTN'],
  },
  {
    icd10: 'L20', disease: 'Atopic Dermatitis (Eczema)', category: 'Dermatology', specialty: 'Dermatology',
    description: 'Chronic inflammatory skin condition characterised by pruritic, erythematous plaques with periods of flare and remission.',
    symptoms: ['Intense itching (pruritus)', 'Dry, scaly skin', 'Erythematous patches', 'Lichenification (thickened skin)', 'Weeping/crusting in acute phase'],
    medications: [
      { name: 'Hydrocortisone Cream 1%', generic: 'Hydrocortisone', dosage: 'Thin layer', frequency: 'Twice daily (flares)', route: 'Topical', notes: 'Mild corticosteroid; safe for face/skin folds' },
      { name: 'Betamethasone Cream 0.1%', generic: 'Betamethasone Valerate', dosage: 'Thin layer', frequency: 'Once to twice daily', route: 'Topical', notes: 'Potent steroid; avoid face; short-term use only' },
      { name: 'Tacrolimus Ointment (Protopic)', generic: 'Tacrolimus', dosage: '0.03–0.1%', frequency: 'Twice daily', route: 'Topical', notes: 'Calcineurin inhibitor; steroid-sparing; safe long-term' },
      { name: 'Cetirizine (Zyrtec)', generic: 'Cetirizine HCl', dosage: '10 mg', frequency: 'Once daily (night)', route: 'Oral', notes: 'Antihistamine; reduces itch-scratch cycle' },
    ],
    precautions: ['Daily moisturiser application (emollient therapy)', 'Avoid soap & harsh detergents', 'Identify allergen triggers', 'Wet dressings for severe flares'],
  },
  {
    icd10: 'K35', disease: 'Appendicitis', category: 'Surgical', specialty: 'General Surgery',
    description: 'Acute inflammation of the vermiform appendix — a surgical emergency requiring prompt diagnosis and treatment.',
    symptoms: ['Periumbilical pain migrating to RIF', 'Fever', 'Nausea/vomiting', 'Anorexia', 'Rebound tenderness', 'Rigidity of abdominal wall'],
    medications: [
      { name: 'Ceftriaxone', generic: 'Ceftriaxone Sodium', dosage: '1–2 g', frequency: 'Once daily IV', route: 'Intravenous', notes: '3rd gen cephalosporin; pre/post-operative prophylaxis' },
      { name: 'Metronidazole (Flagyl)', generic: 'Metronidazole', dosage: '500 mg', frequency: 'Every 8 hours IV', route: 'Intravenous', notes: 'Anaerobic coverage; always combine with ceftriaxone' },
      { name: 'Morphine', generic: 'Morphine Sulphate', dosage: '0.1 mg/kg', frequency: 'Every 4 hours (titrate to pain)', route: 'Intravenous', notes: 'Pain management; does not mask diagnosis' },
    ],
    precautions: ['Surgery (appendicectomy) is definitive treatment', 'NPO pre-operatively', 'CT abdomen for equivocal diagnosis', 'Laparoscopic preferred over open approach'],
  },
  {
    icd10: 'B34.9', disease: 'COVID-19 (SARS-CoV-2 Infection)', category: 'Infectious Disease', specialty: 'Infectious Disease',
    description: 'Infection caused by the SARS-CoV-2 coronavirus, ranging from asymptomatic to severe respiratory failure.',
    symptoms: ['Fever', 'Dry cough', 'Fatigue', 'Loss of smell/taste (anosmia)', 'Shortness of breath', 'Myalgia', 'Headache', 'Diarrhoea'],
    medications: [
      { name: 'Nirmatrelvir/Ritonavir (Paxlovid)', generic: 'Nirmatrelvir + Ritonavir', dosage: '300/100 mg', frequency: 'Twice daily for 5 days', route: 'Oral', notes: 'Antiviral; within 5 days of symptom onset; high-risk patients' },
      { name: 'Dexamethasone', generic: 'Dexamethasone', dosage: '6 mg', frequency: 'Once daily for 10 days', route: 'Oral / IV', notes: 'For hospitalised patients requiring oxygen only' },
      { name: 'Remdesivir (Veklury)', generic: 'Remdesivir', dosage: '200 mg day 1, then 100 mg', frequency: 'Once daily for 5 days IV', route: 'Intravenous', notes: 'Antiviral; hospitalised patients within 7 days of symptoms' },
      { name: 'Paracetamol', generic: 'Acetaminophen', dosage: '500–1000 mg', frequency: 'Every 6 hours as needed', route: 'Oral', notes: 'Symptomatic management of fever and pain' },
    ],
    precautions: ['Isolation for 5 days from symptom onset', 'Vaccination remains primary prevention', 'Monitor SpO2; hospitalise if <94%', 'Anticoagulation for hospitalised patients'],
  },
  {
    icd10: 'I50', disease: 'Heart Failure', category: 'Cardiovascular', specialty: 'Cardiology',
    description: 'A clinical syndrome where the heart cannot pump sufficient blood to meet the body\'s metabolic demands.',
    symptoms: ['Dyspnoea on exertion', 'Orthopnoea', 'Paroxysmal nocturnal dyspnoea', 'Peripheral oedema', 'Fatigue', 'Reduced exercise tolerance'],
    medications: [
      { name: 'Furosemide (Lasix)', generic: 'Furosemide', dosage: '20–80 mg', frequency: 'Once or twice daily', route: 'Oral / IV', notes: 'Loop diuretic; rapidly reduces fluid overload' },
      { name: 'Ramipril (Altace)', generic: 'Ramipril', dosage: '2.5–10 mg', frequency: 'Once daily', route: 'Oral', notes: 'ACE inhibitor; reduces mortality in HFrEF' },
      { name: 'Carvedilol (Coreg)', generic: 'Carvedilol', dosage: '3.125–25 mg', frequency: 'Twice daily', route: 'Oral', notes: 'Beta-blocker; start low and titrate slowly' },
      { name: 'Spironolactone (Aldactone)', generic: 'Spironolactone', dosage: '25–50 mg', frequency: 'Once daily', route: 'Oral', notes: 'Aldosterone antagonist; monitor potassium' },
    ],
    precautions: ['Daily weight monitoring (alert if >2kg gain in 2 days)', 'Fluid restriction 1.5–2 L/day', 'Low-sodium diet', 'Avoid NSAIDs and certain CCBs'],
  },
  {
    icd10: 'A15', disease: 'Pulmonary Tuberculosis (TB)', category: 'Infectious Disease', specialty: 'Pulmonology',
    description: 'Bacterial infection caused by Mycobacterium tuberculosis, primarily affecting the lungs.',
    symptoms: ['Chronic productive cough (>2 weeks)', 'Haemoptysis', 'Night sweats', 'Weight loss', 'Low-grade fever', 'Fatigue', 'Chest pain'],
    medications: [
      { name: 'Isoniazid (INH)', generic: 'Isoniazid', dosage: '5 mg/kg (max 300 mg)', frequency: 'Once daily', route: 'Oral', notes: 'Part of RIPE regimen; give with Pyridoxine (B6)' },
      { name: 'Rifampicin (RIF)', generic: 'Rifampicin', dosage: '10 mg/kg (max 600 mg)', frequency: 'Once daily (fasting)', route: 'Oral', notes: 'Most potent anti-TB; colours urine/secretions orange' },
      { name: 'Pyrazinamide (PZA)', generic: 'Pyrazinamide', dosage: '25 mg/kg', frequency: 'Once daily', route: 'Oral', notes: 'First 2 months only; monitor uric acid & LFTs' },
      { name: 'Ethambutol (EMB)', generic: 'Ethambutol HCl', dosage: '15–25 mg/kg', frequency: 'Once daily', route: 'Oral', notes: 'Monitor visual acuity; first 2 months' },
    ],
    precautions: ['DOT (Directly Observed Therapy) mandatory', 'Notify public health authorities', 'Contact tracing essential', 'Full 6-month course regardless of symptoms resolving'],
  },
  {
    icd10: 'C50', disease: 'Breast Cancer', category: 'Oncology', specialty: 'Oncology',
    description: 'Malignant neoplasm arising from breast epithelial cells. Most common cancer in women worldwide.',
    symptoms: ['Painless breast lump', 'Nipple discharge / inversion', 'Skin dimpling', 'Axillary lymphadenopathy', 'Breast asymmetry', 'Pain in advanced disease'],
    medications: [
      { name: 'Tamoxifen', generic: 'Tamoxifen Citrate', dosage: '20 mg', frequency: 'Once daily for 5–10 years', route: 'Oral', notes: 'SERM; for ER+ breast cancer; pre-menopausal' },
      { name: 'Letrozole (Femara)', generic: 'Letrozole', dosage: '2.5 mg', frequency: 'Once daily', route: 'Oral', notes: 'Aromatase inhibitor; post-menopausal ER+ breast cancer' },
      { name: 'Trastuzumab (Herceptin)', generic: 'Trastuzumab', dosage: '6 mg/kg (loading 8 mg/kg)', frequency: 'Every 3 weeks IV', route: 'Intravenous', notes: 'Monoclonal antibody; HER2+ breast cancer' },
      { name: 'Doxorubicin (Adriamycin)', generic: 'Doxorubicin HCl', dosage: '60–75 mg/m²', frequency: 'Every 3 weeks (chemotherapy cycle)', route: 'Intravenous', notes: 'Anthracycline chemotherapy; monitor cardiac function' },
    ],
    precautions: ['Multidisciplinary team approach', 'Annual mammography surveillance', 'BRCA1/2 genetic testing if family history', 'Psychological support throughout treatment'],
  },
  {
    icd10: 'K80', disease: 'Cholelithiasis (Gallstones)', category: 'Gastroenterology', specialty: 'General Surgery',
    description: 'Presence of calculi in the gallbladder, which may cause biliary colic or complications like cholecystitis and pancreatitis.',
    symptoms: ['Right upper quadrant pain (biliary colic)', 'Pain radiating to right shoulder', 'Nausea/vomiting', 'Jaundice if CBD obstruction', 'Fatty food intolerance', 'Fever if cholecystitis'],
    medications: [
      { name: 'Diclofenac (Voltaren)', generic: 'Diclofenac Sodium', dosage: '75 mg', frequency: 'IM / oral for acute pain', route: 'Oral / IM', notes: 'NSAID; first-line for biliary colic pain' },
      { name: 'Hyoscine Butylbromide (Buscopan)', generic: 'Hyoscine Butylbromide', dosage: '20 mg', frequency: 'Every 6 hours as needed', route: 'Oral / IV', notes: 'Antispasmodic; reduces biliary smooth muscle spasm' },
      { name: 'Ursodeoxycholic Acid (UDCA)', generic: 'Ursodiol', dosage: '8–10 mg/kg', frequency: 'Once daily', route: 'Oral', notes: 'Dissolves small cholesterol stones; used if unfit for surgery' },
      { name: 'Ceftriaxone', generic: 'Ceftriaxone Sodium', dosage: '1–2 g', frequency: 'Once daily IV', route: 'Intravenous', notes: 'For acute cholecystitis; antibiotic coverage' },
    ],
    precautions: ['Laparoscopic cholecystectomy is definitive treatment', 'Low-fat diet during conservative management', 'ERCP if CBD stones present', 'Urgent surgery for gangrenous/perforated cholecystitis'],
  },
  {
    icd10: 'N18', disease: 'Chronic Kidney Disease (CKD)', category: 'Nephrology', specialty: 'Nephrology',
    description: 'Progressive loss of kidney function over months or years, classified in stages (G1–G5) based on eGFR.',
    symptoms: ['Fatigue', 'Oedema (ankles, face)', 'Hypertension', 'Nocturia', 'Decreased urine output (late)', 'Nausea', 'Pruritus', 'Anaemia symptoms'],
    medications: [
      { name: 'Amlodipine', generic: 'Amlodipine Besylate', dosage: '5–10 mg', frequency: 'Once daily', route: 'Oral', notes: 'BP control; target <130/80 mmHg in CKD' },
      { name: 'Erythropoietin (EPO)', generic: 'Epoetin Alfa', dosage: '50–100 units/kg', frequency: '3 times weekly', route: 'Subcutaneous', notes: 'Treats CKD-related anaemia; target Hb 10–12 g/dL' },
      { name: 'Calcium Carbonate', generic: 'Calcium Carbonate', dosage: '500 mg', frequency: 'Three times daily (with meals)', route: 'Oral', notes: 'Phosphate binder; controls hyperphosphataemia' },
      { name: 'Sodium Bicarbonate', generic: 'Sodium Bicarbonate', dosage: '650 mg', frequency: 'Twice daily', route: 'Oral', notes: 'Corrects metabolic acidosis; slows CKD progression' },
    ],
    precautions: ['Avoid nephrotoxic drugs (NSAIDs, contrast, aminoglycosides)', 'Dose-adjust all renally-cleared medications', 'Annual urine albumin:creatinine ratio', 'Dialysis planning at eGFR <20 mL/min'],
  },
  {
    icd10: 'M05', disease: 'Rheumatoid Arthritis', category: 'Rheumatology', specialty: 'Rheumatology',
    description: 'Chronic autoimmune inflammatory disease primarily affecting synovial joints with systemic involvement.',
    symptoms: ['Symmetric joint pain & swelling', 'Morning stiffness >1 hour', 'Fatigue', 'Rheumatoid nodules', 'Wrist & MCP joint involvement', 'Low-grade fever'],
    medications: [
      { name: 'Methotrexate (MTX)', generic: 'Methotrexate', dosage: '7.5–25 mg', frequency: 'Once weekly', route: 'Oral / SC', notes: 'Disease-modifying (DMARD); anchor drug for RA' },
      { name: 'Hydroxychloroquine (Plaquenil)', generic: 'Hydroxychloroquine Sulphate', dosage: '200–400 mg', frequency: 'Once daily', route: 'Oral', notes: 'DMARD; mild RA; requires annual eye check' },
      { name: 'Adalimumab (Humira)', generic: 'Adalimumab', dosage: '40 mg', frequency: 'Every 2 weeks', route: 'Subcutaneous', notes: 'Anti-TNF biologic; for refractory RA; screen for TB before starting' },
      { name: 'Prednisolone', generic: 'Prednisolone', dosage: '5–15 mg', frequency: 'Once daily (tapered)', route: 'Oral', notes: 'Short-term bridging during DMARD initiation' },
    ],
    precautions: ['Screen for hepatitis B & TB before biologics', 'Annual chest X-ray on MTX', 'Folic acid 5 mg weekly to reduce MTX side effects', 'Avoid live vaccines on biologics'],
  },
  {
    icd10: 'G35', disease: 'Multiple Sclerosis (MS)', category: 'Neurology', specialty: 'Neurology',
    description: 'Chronic autoimmune demyelinating disease of the CNS causing episodic neurological deficits.',
    symptoms: ['Visual disturbance / optic neuritis', 'Limb weakness', 'Sensory disturbances', 'Ataxia', 'Bladder dysfunction', 'Fatigue', 'Cognitive impairment'],
    medications: [
      { name: 'Interferon Beta-1a (Avonex)', generic: 'Interferon Beta-1a', dosage: '30 mcg', frequency: 'Once weekly IM', route: 'Intramuscular', notes: 'Disease-modifying; reduces relapse rate' },
      { name: 'Glatiramer Acetate (Copaxone)', generic: 'Glatiramer Acetate', dosage: '20 mg', frequency: 'Once daily SC', route: 'Subcutaneous', notes: 'Immunomodulator; first-line for relapsing MS' },
      { name: 'Methylprednisolone (Solu-Medrol)', generic: 'Methylprednisolone', dosage: '1 g IV', frequency: 'Once daily for 3–5 days (acute relapse)', route: 'Intravenous', notes: 'Hastens recovery from acute relapse' },
      { name: 'Baclofen', generic: 'Baclofen', dosage: '5–20 mg', frequency: 'Three times daily', route: 'Oral', notes: 'Muscle relaxant for MS-related spasticity' },
    ],
    precautions: ['MRI brain/spine every 1–2 years', 'Vitamin D supplementation', 'Physiotherapy for mobility', 'Fatigue management programme'],
  },
];

router.get('/medical-knowledge', authenticate, async (req: Request, res: Response) => {
  const { search, category, specialty } = req.query;
  let results = MEDICAL_KNOWLEDGE;

  if (search) {
    const q = (search as string).toLowerCase();
    results = results.filter((d) =>
      d.disease.toLowerCase().includes(q) ||
      d.icd10.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.symptoms.some((s) => s.toLowerCase().includes(q)) ||
      d.medications.some((m) => m.name.toLowerCase().includes(q) || m.generic.toLowerCase().includes(q))
    );
  }
  if (category) results = results.filter((d) => d.category.toLowerCase() === (category as string).toLowerCase());
  if (specialty) results = results.filter((d) => d.specialty.toLowerCase() === (specialty as string).toLowerCase());

  res.json({
    total: results.length,
    diseases: results,
    categories: [...new Set(MEDICAL_KNOWLEDGE.map((d) => d.category))].sort(),
    specialties: [...new Set(MEDICAL_KNOWLEDGE.map((d) => d.specialty))].sort(),
  });
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

// --- Conditions ---

router.get('/:id/conditions', authenticate, async (req: Request, res: Response) => {
  const db = getDb();
  const patient = await db('mc_patients').where({ id: req.params.id, is_deleted: false }).first();
  if (!patient) throw new NotFoundError('Patient');
  if (req.user?.role === 'patient' && req.user.sub !== patient.user_id) throw new ForbiddenError('Access denied');
  const conditions = await db('mc_conditions').where({ patient_id: patient.id }).orderBy('created_at', 'desc');
  res.json({ conditions });
});

router.post('/:id/conditions', authenticate, requireRole('clinician', 'nurse', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  const schema = Joi.object({
    icd10Code: Joi.string().max(20).required(),
    description: Joi.string().max(500).required(),
    category: Joi.string().valid('chronic', 'acute', 'historical').required(),
    status: Joi.string().valid('active', 'inactive', 'resolved', 'remission').default('active'),
    onsetDate: Joi.string().isoDate().optional(),
    notes: Joi.string().max(2000).optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) throw new ValidationError(error.details[0].message);

  const db = getDb();
  const patient = await db('mc_patients').where({ id: req.params.id, is_deleted: false }).first();
  if (!patient) throw new NotFoundError('Patient');

  const [condition] = await db('mc_conditions').insert({
    id: uuidv4(),
    patient_id: patient.id,
    icd10_code: value.icd10Code,
    description: value.description,
    category: value.category,
    status: value.status,
    onset_date: value.onsetDate || null,
    diagnosing_physician_id: req.user?.sub || null,
    notes: value.notes || null,
    created_at: new Date(),
    updated_at: new Date(),
  }).returning('*');

  res.status(201).json({ condition });
});

router.patch('/:id/conditions/:conditionId', authenticate, requireRole('clinician', 'nurse', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  const db = getDb();
  const condition = await db('mc_conditions').where({ id: req.params.conditionId, patient_id: req.params.id }).first();
  if (!condition) throw new NotFoundError('Condition');
  const [updated] = await db('mc_conditions').where({ id: req.params.conditionId }).update({
    status: req.body.status || condition.status,
    notes: req.body.notes !== undefined ? req.body.notes : condition.notes,
    resolved_date: req.body.status === 'resolved' ? new Date() : condition.resolved_date,
    updated_at: new Date(),
  }).returning('*');
  res.json({ condition: updated });
});

// --- Medications ---

router.get('/:id/medications', authenticate, async (req: Request, res: Response) => {
  const db = getDb();
  const patient = await db('mc_patients').where({ id: req.params.id, is_deleted: false }).first();
  if (!patient) throw new NotFoundError('Patient');
  if (req.user?.role === 'patient' && req.user.sub !== patient.user_id) throw new ForbiddenError('Access denied');
  const medications = await db('mc_medications').where({ patient_id: patient.id }).orderBy('created_at', 'desc');
  res.json({ medications });
});

router.post('/:id/medications', authenticate, requireRole('clinician', 'nurse', 'admin', 'superadmin'), async (req: Request, res: Response) => {
  const schema = Joi.object({
    name: Joi.string().max(200).required(),
    genericName: Joi.string().max(200).optional(),
    dosage: Joi.string().max(100).required(),
    frequency: Joi.string().max(100).required(),
    route: Joi.string().max(50).required(),
    status: Joi.string().valid('active', 'discontinued', 'on_hold', 'completed').default('active'),
    startDate: Joi.string().isoDate().required(),
    endDate: Joi.string().isoDate().optional(),
    instructions: Joi.string().max(1000).optional(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) throw new ValidationError(error.details[0].message);

  const db = getDb();
  const patient = await db('mc_patients').where({ id: req.params.id, is_deleted: false }).first();
  if (!patient) throw new NotFoundError('Patient');

  const [medication] = await db('mc_medications').insert({
    id: uuidv4(),
    patient_id: patient.id,
    name: value.name,
    generic_name: value.genericName || null,
    dosage: value.dosage,
    frequency: value.frequency,
    route: value.route,
    status: value.status,
    start_date: value.startDate,
    end_date: value.endDate || null,
    prescribed_by: req.user?.sub || null,
    instructions: value.instructions || null,
    created_at: new Date(),
    updated_at: new Date(),
  }).returning('*');

  res.status(201).json({ medication });
});

export default router;
