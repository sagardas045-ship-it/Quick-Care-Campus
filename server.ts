import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import {
  buildDeterministicDoctorTriage,
  normalizeRecommendedKitIds,
  TRIAGE_CATALOG_SUMMARY,
} from './src/utils/doctorTriageEngine.ts';
import type {
  DoctorTriageRequest,
  DoctorTriageResponse,
} from './src/utils/doctorTriageEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function getValidGeminiApiKey(): string | null {
  const raw = (process.env.GEMINI_API_KEY || '').trim();
  if (!raw || raw === 'YOUR_GEMINI_API_KEY' || raw === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return raw;
}

const TRIAGE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    replyText: {
      type: Type.STRING,
      description:
        'Warm, empathetic, concise medical teleconsultation message from the on-call doctor asking any helpful clarifying questions, checking allergies, and giving safe OTC + first-aid guidance.',
    },
    issuePrescription: {
      type: Type.BOOLEAN,
      description:
        'Whether to issue/update the Official Digital Prescription & OTC Recommendation Card.',
    },
    diagnosisSummary: {
      type: Type.STRING,
      description: 'Short 1-line clinical triage summary based on reported symptoms.',
    },
    dosageGuidance: {
      type: Type.STRING,
      description:
        'Clear OTC dosing instructions and safety intervals (no prescription-only antibiotics/steroids).',
    },
    firstAidAdvice: {
      type: Type.STRING,
      description: 'Practical hostel self-care and first-aid steps for recovery tonight.',
    },
    redFlagWarning: {
      type: Type.STRING,
      description:
        'Specific warning signs requiring immediate visit to the campus infirmary or hospital emergency room.',
    },
    allergyCheckNote: {
      type: Type.STRING,
      description:
        'Confirmation that declared allergies were checked against the recommended OTC items.',
    },
    recommendedKitIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Up to 3 exact kit IDs selected strictly from the provided OTC catalog list.',
    },
  },
  required: [
    'replyText',
    'issuePrescription',
    'diagnosisSummary',
    'dosageGuidance',
    'firstAidAdvice',
    'redFlagWarning',
    'allergyCheckNote',
    'recommendedKitIds',
  ],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'quick-care-campus', geminiConfigured: Boolean(getValidGeminiApiKey()) });
  });

  app.post('/api/doctor-triage', async (req, res) => {
    const body = (req.body || {}) as Partial<DoctorTriageRequest>;
    const triageInput: DoctorTriageRequest = {
      doctorName:
        typeof body.doctorName === 'string' && body.doctorName.trim()
          ? body.doctorName.trim().slice(0, 100)
          : 'Dr. Ananya Sharma',
      doctorSpecialty:
        typeof body.doctorSpecialty === 'string' && body.doctorSpecialty.trim()
          ? body.doctorSpecialty.trim().slice(0, 120)
          : 'MBBS, General Physician',
      doctorNmcReg:
        typeof body.doctorNmcReg === 'string' && body.doctorNmcReg.trim()
          ? body.doctorNmcReg.trim().slice(0, 40)
          : 'NMC-UK-2019-4812',
      studentName:
        typeof body.studentName === 'string' && body.studentName.trim()
          ? body.studentName.trim().slice(0, 80)
          : 'Student',
      symptoms: Array.isArray(body.symptoms)
        ? body.symptoms.filter((s): s is string => typeof s === 'string').slice(0, 10)
        : ['General Unwellness'],
      duration:
        typeof body.duration === 'string' && body.duration.trim()
          ? body.duration.trim().slice(0, 80)
          : 'Under 6 hours',
      allergies:
        typeof body.allergies === 'string' ? body.allergies.trim().slice(0, 200) : 'None known',
      notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 400) : '',
      messages: Array.isArray(body.messages)
        ? body.messages
            .filter(
              (m): m is { sender: 'student' | 'doctor' | 'admin'; text: string } =>
                Boolean(m) &&
                (m.sender === 'student' || m.sender === 'doctor' || m.sender === 'admin') &&
                typeof m.text === 'string'
            )
            .slice(-16)
        : [],
      availableKitIds: Array.isArray(body.availableKitIds)
        ? body.availableKitIds.filter((id): id is string => typeof id === 'string')
        : undefined,
    };

    const fallback = buildDeterministicDoctorTriage(triageInput);
    const apiKey = getValidGeminiApiKey();

    if (!apiKey) {
      return res.json(fallback);
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const allowedSet = new Set(
        triageInput.availableKitIds && triageInput.availableKitIds.length > 0
          ? triageInput.availableKitIds
          : TRIAGE_CATALOG_SUMMARY.map((k) => k.id)
      );
      const scopedCatalog = TRIAGE_CATALOG_SUMMARY.filter((k) => allowedSet.has(k.id));

      const transcript = triageInput.messages
        .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
        .join('\n');

      const prompt = [
        `You are ${triageInput.doctorName} (${triageInput.doctorSpecialty}, Reg: ${triageInput.doctorNmcReg}), an on-call MBBS physician providing late-night 24/7 campus teleconsultation for college hostel students in Dehradun.`,
        `SAFETY RULES:`,
        `- Never prescribe Schedule H/Rx-only antibiotics, steroids, or controlled drugs.`,
        `- Strictly check declared allergies ("${triageInput.allergies || 'None declared'}") BEFORE recommending any OTC item.`,
        `- Ask 1-2 short clarifying clinical questions if helpful, give practical hostel first-aid advice, and clearly state red-flag symptoms that require visiting the campus infirmary / ER immediately.`,
        `- Pick 1 to 3 recommendedKitIds STRICTLY from the catalog list below matching the student's symptoms and allergy safety.`,
        ``,
        `PATIENT INTAKE:`,
        `- Name: ${triageInput.studentName}`,
        `- Reported Symptoms: ${triageInput.symptoms.join(', ')}`,
        `- Duration: ${triageInput.duration}`,
        `- Declared Drug Allergies: ${triageInput.allergies || 'None declared'}`,
        `- Additional Notes: ${triageInput.notes || 'None'}`,
        ``,
        `RECENT CHAT TRANSCRIPT:`,
        transcript || '(Session just started)',
        ``,
        `AVAILABLE IN-STOCK OTC CATALOG (id | skuCode | name | reliefFor):`,
        ...scopedCatalog.map((k) => `${k.id} | ${k.skuCode} | ${k.name} (₹${k.price}) | ${k.reliefFor}`),
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          temperature: 0.35,
          responseMimeType: 'application/json',
          responseSchema: TRIAGE_RESPONSE_SCHEMA,
        },
      });

      const rawText = (response.text || '').trim();
      if (!rawText) {
        return res.json(fallback);
      }

      const parsed = JSON.parse(rawText) as {
        replyText?: string;
        issuePrescription?: boolean;
        diagnosisSummary?: string;
        dosageGuidance?: string;
        firstAidAdvice?: string;
        redFlagWarning?: string;
        allergyCheckNote?: string;
        recommendedKitIds?: string[];
      };

      const validKitIds = normalizeRecommendedKitIds(
        parsed.recommendedKitIds,
        triageInput.availableKitIds
      );
      const finalKitIds =
        validKitIds.length > 0 ? validKitIds : fallback.prescription.recommendedKitIds;

      const aiResponse: DoctorTriageResponse = {
        replyText:
          typeof parsed.replyText === 'string' && parsed.replyText.trim()
            ? parsed.replyText.trim()
            : fallback.replyText,
        issuePrescription: Boolean(parsed.issuePrescription ?? true),
        prescription: {
          diagnosisSummary:
            typeof parsed.diagnosisSummary === 'string' && parsed.diagnosisSummary.trim()
              ? parsed.diagnosisSummary.trim()
              : fallback.prescription.diagnosisSummary,
          dosageGuidance:
            typeof parsed.dosageGuidance === 'string' && parsed.dosageGuidance.trim()
              ? parsed.dosageGuidance.trim()
              : fallback.prescription.dosageGuidance,
          firstAidAdvice:
            typeof parsed.firstAidAdvice === 'string' && parsed.firstAidAdvice.trim()
              ? parsed.firstAidAdvice.trim()
              : fallback.prescription.firstAidAdvice,
          redFlagWarning:
            typeof parsed.redFlagWarning === 'string' && parsed.redFlagWarning.trim()
              ? parsed.redFlagWarning.trim()
              : fallback.prescription.redFlagWarning,
          allergyCheckNote:
            typeof parsed.allergyCheckNote === 'string' && parsed.allergyCheckNote.trim()
              ? parsed.allergyCheckNote.trim()
              : fallback.prescription.allergyCheckNote,
          recommendedKitIds: finalKitIds,
          issuedBy: triageInput.doctorName,
          issuedByNmc: triageInput.doctorNmcReg,
          issuedAtIso: new Date().toISOString(),
        },
        source: 'gemini',
      };

      return res.json(aiResponse);
    } catch (err) {
      console.warn('Gemini triage fallback triggered:', err instanceof Error ? err.message : err);
      return res.json(fallback);
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quick Care Campus server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
