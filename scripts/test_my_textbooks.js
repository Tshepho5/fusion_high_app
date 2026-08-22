const textbookController = require('../public/src/controller/textbookController');

const req = { user: { id: 6 } };
const res = {
  json: (data) => {
    console.log('Learner Issued Textbooks count:', data.length);
    console.table(data.map(b => ({
      title: b.title,
      subject: b.subject,
      grade: b.grade,
      publisher: b.publisher,
      status: b.status
    })));
    process.exit(0);
  },
  status: (code) => {
    console.log('Status code:', code);
    return { json: console.log };
  }
};

textbookController.getLearnerAllocations(req, res);
