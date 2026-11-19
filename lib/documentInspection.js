'use strict';

function buildDocumentInspection({ extractedText = '', declaredData = {} } = {}) {
  const text = String(extractedText || '').trim();
  if (text.length < 10) {
    return {
      success: false,
      status: 'extraction_failed',
      extraction: 'unreadable',
      clarity_score: null,
      is_authentic: false,
      official_decision: false,
      authenticity_proven: false,
      extracted_text_preview: '',
      extracted_fields: {},
      discrepancies: [],
      message: 'The file could not be read as text. Upload a clearer PDF or review it manually. This is not an authenticity result.'
    };
  }

  const foundIds = text.match(/\b\d{13}\b/g) || [];
  const extractedFields = {};
  const discrepancies = [];
  if (foundIds.length > 0) {
    extractedFields.id_number_present = true;
    if (declaredData.id_number && String(declaredData.id_number) !== foundIds[0]) {
      discrepancies.push('The identity number read from the file does not match the number on the application.');
    }
  } else if (declaredData.id_number) {
    discrepancies.push('No identity number could be read from the file.');
  }

  return {
    success: true,
    status: 'text_extracted',
    extraction: 'pdf_text',
    clarity_score: null,
    is_authentic: false,
    official_decision: false,
    authenticity_proven: false,
    extracted_text_preview: text.slice(0, 500),
    extracted_fields: extractedFields,
    discrepancies,
    message: 'Text was extracted from the PDF. A readable file is not proof that the document is official or that the applicant owns it. A person must make the admission decision.'
  };
}

module.exports = { buildDocumentInspection };
