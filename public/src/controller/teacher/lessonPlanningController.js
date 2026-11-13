const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const service = require('../../services/lessonPlanning/lessonPlanningService');
const rules = require('../../services/lessonPlanning/lessonPlanningRules');
const { renderLessonPlanPdf } = require('../../services/lessonPlanning/lessonPlanPdfService');
const aiProvider = require('../../services/ai/aiProvider');

const uploadRoot = path.join(process.cwd(), 'uploads', 'lesson-materials');

function ensureUploadDir() {
  if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });
}

function sendError(res, error) {
  const status = error.status || 500;
  if (status >= 500) console.error('[LESSON PLANNING]', error);
  res.status(status).json({
    error: status >= 500 ? 'Lesson planning request failed.' : error.message
  });
}

function actor(req) {
  return service.actorFromReq(req);
}

exports.context = async (req, res) => {
  try {
    res.json(await service.getContext(actor(req)));
  } catch (error) {
    sendError(res, error);
  }
};

exports.dashboard = async (req, res) => {
  try {
    res.json(await service.dashboard(actor(req), req.query));
  } catch (error) {
    sendError(res, error);
  }
};

exports.list = async (req, res) => {
  try {
    res.json(await service.listPlans(actor(req), req.query));
  } catch (error) {
    sendError(res, error);
  }
};

exports.detail = async (req, res) => {
  try {
    res.json(await service.getPlan(actor(req), Number(req.params.id)));
  } catch (error) {
    sendError(res, error);
  }
};

exports.create = async (req, res) => {
  try {
    const plan = await service.savePlan(actor(req), null, req.body);
    res.status(201).json(plan);
  } catch (error) {
    sendError(res, error);
  }
};

exports.update = async (req, res) => {
  try {
    res.json(await service.savePlan(actor(req), Number(req.params.id), req.body));
  } catch (error) {
    sendError(res, error);
  }
};

exports.remove = async (req, res) => {
  try {
    res.json(await service.deletePlan(actor(req), Number(req.params.id)));
  } catch (error) {
    sendError(res, error);
  }
};

exports.duplicate = async (req, res) => {
  try {
    const plan = await service.duplicatePlan(actor(req), Number(req.params.id));
    res.status(201).json(plan);
  } catch (error) {
    sendError(res, error);
  }
};

exports.pdf = async (req, res) => {
  try {
    const plan = await service.getPlan(actor(req), Number(req.params.id));
    const buffer = await renderLessonPlanPdf(plan);
    const name = (plan.topic || plan.subject_name || 'lesson-plan').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.pdf"`);
    res.send(buffer);
  } catch (error) {
    sendError(res, error);
  }
};

exports.progress = async (req, res) => {
  try {
    res.json(await service.progress(actor(req), req.query));
  } catch (error) {
    sendError(res, error);
  }
};

exports.calendar = async (req, res) => {
  try {
    res.json(await service.calendar(actor(req), req.query));
  } catch (error) {
    sendError(res, error);
  }
};

exports.homeworkOptions = async (req, res) => {
  try {
    res.json(await service.homeworkOptions(actor(req), req.query));
  } catch (error) {
    sendError(res, error);
  }
};

exports.uploadMaterial = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a file to attach.' });
    const material = await service.addMaterialFile(actor(req), Number(req.params.id), {
      materialName: rules.cleanText(req.body.material_name, 255) || req.file.originalname,
      originalName: path.basename(req.file.originalname || 'file'),
      storedName: req.file.filename
    });
    res.status(201).json(material);
  } catch (error) {
    sendError(res, error);
  }
};

exports.downloadMaterial = async (req, res) => {
  try {
    const file = await service.materialFile(actor(req), Number(req.params.materialId));
    if (!fs.existsSync(file.absolutePath)) return res.status(404).json({ error: 'File not found.' });
    res.download(file.absolutePath, file.downloadName);
  } catch (error) {
    sendError(res, error);
  }
};

exports.aiAssist = async (req, res) => {
  try {
    const action = String(req.body.action || '');
    const request = rules.buildAiRequest(action, req.body || {});
    if (!request.ok) {
      return res.json({ applied: false, insufficient: true, warnings: request.warnings, suggestions: null });
    }
    if (!aiProvider.isAvailable()) {
      return res.status(503).json({
        error: 'The lesson assistant is not configured on this server.',
        warnings: ['AI assistance is unavailable until the server AI provider is configured.']
      });
    }
    const result = await aiProvider.generateContent({
      temperature: 0.5,
      systemInstruction: [
        'You help one teacher prepare one lesson.',
        'Use only the subject, grade, class, topic, duration, objectives, and other facts in the prompt.',
        'Do not claim that the lesson is CAPS compliant, DBE approved, or officially aligned.',
        'Do not invent curriculum document titles, page numbers, or policy statements.',
        'Do not say the content has been published or approved.',
        'Return JSON only.'
      ].join(' '),
      prompt: request.prompt
    });
    const parsed = rules.parseAiJson(result.text);
    if (!parsed) {
      return res.json({
        applied: false,
        warnings: ['The assistant reply could not be read. Nothing was saved.'],
        suggestions: null
      });
    }
    res.json({
      applied: false,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map((item) => String(item)).slice(0, 8) : [],
      suggestions: parsed
    });
  } catch (error) {
    const message = error.code === 'CONFIG_MISSING'
      ? 'The lesson assistant is not configured on this server.'
      : 'The lesson assistant could not complete that request.';
    res.status(error.code === 'CONFIG_MISSING' ? 503 : 502).json({ error: message });
  }
};

exports.listNotes = async (req, res) => {
  try {
    res.json(await service.listNotes(actor(req), req.query));
  } catch (error) {
    sendError(res, error);
  }
};

exports.noteDetail = async (req, res) => {
  try {
    res.json(await service.getNote(actor(req), Number(req.params.id)));
  } catch (error) {
    sendError(res, error);
  }
};

exports.createNote = async (req, res) => {
  try {
    const note = await service.saveNote(actor(req), null, req.body);
    res.status(201).json(note);
  } catch (error) {
    sendError(res, error);
  }
};

exports.updateNote = async (req, res) => {
  try {
    res.json(await service.saveNote(actor(req), Number(req.params.id), req.body));
  } catch (error) {
    sendError(res, error);
  }
};

exports.removeNote = async (req, res) => {
  try {
    res.json(await service.deleteNote(actor(req), Number(req.params.id)));
  } catch (error) {
    sendError(res, error);
  }
};

exports.uploadNoteFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Choose a file to attach.' });
    const section = await service.addNoteAttachment(
      actor(req),
      Number(req.params.id),
      Number(req.body.section_id),
      { originalName: path.basename(req.file.originalname || 'file'), storedName: req.file.filename }
    );
    res.status(201).json(section);
  } catch (error) {
    sendError(res, error);
  }
};

exports.downloadNoteFile = async (req, res) => {
  try {
    const file = await service.noteFile(actor(req), Number(req.params.sectionId));
    if (!fs.existsSync(file.absolutePath)) return res.status(404).json({ error: 'File not found.' });
    res.download(file.absolutePath, file.downloadName);
  } catch (error) {
    sendError(res, error);
  }
};

exports.listTemplates = async (req, res) => {
  try {
    res.json({ templates: await service.listTemplates(actor(req)) });
  } catch (error) {
    sendError(res, error);
  }
};

exports.templateDetail = async (req, res) => {
  try {
    res.json(await service.getTemplate(actor(req), Number(req.params.id)));
  } catch (error) {
    sendError(res, error);
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const template = await service.saveTemplateRecord(actor(req), null, req.body);
    res.status(201).json(template);
  } catch (error) {
    sendError(res, error);
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    res.json(await service.saveTemplateRecord(actor(req), Number(req.params.id), req.body));
  } catch (error) {
    sendError(res, error);
  }
};

exports.removeTemplate = async (req, res) => {
  try {
    res.json(await service.deleteTemplate(actor(req), Number(req.params.id)));
  } catch (error) {
    sendError(res, error);
  }
};

exports.templateFromPlan = async (req, res) => {
  try {
    const template = await service.templateFromPlan(actor(req), Number(req.params.id), req.body || {});
    res.status(201).json(template);
  } catch (error) {
    sendError(res, error);
  }
};

exports.applyTemplate = async (req, res) => {
  try {
    const plan = await service.applyTemplate(actor(req), Number(req.params.id), req.body || {});
    res.status(201).json(plan);
  } catch (error) {
    sendError(res, error);
  }
};

exports.storeUpload = (file) => {
  ensureUploadDir();
  const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 8);
  return `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${ext}`;
};

exports.uploadRoot = uploadRoot;
