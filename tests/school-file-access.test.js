'use strict';
require('./safety/blockLiveEffects');

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { privateUploadFolder } = require('../lib/privateUploads');

test('homework, submissions, and textbooks are not public', () => {
  for (const path of ['/assignments/paper.pdf', '/submissions/answer.pdf', '/textbooks/math.pdf']) {
    assert.ok(privateUploadFolder(path));
  }
  assert.equal(privateUploadFolder('/logos/school.png'), null);
  assert.equal(privateUploadFolder('/assignments/../../.env'), 'invalid');
});
