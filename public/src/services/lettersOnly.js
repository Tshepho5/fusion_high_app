const MESSAGE = 'Numbers are not allowed in this field. Please use letters only.';

function hasDigits(value) {
  return value != null && String(value).trim() !== '' && /\d/.test(String(value));
}

function rejectNameDigits(res, ...values) {
  if (values.some(hasDigits)) {
    res.status(400).json({ error: MESSAGE, success: false });
    return true;
  }
  return false;
}

module.exports = { MESSAGE, rejectNameDigits };
