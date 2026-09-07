const learnerController = require('../public/src/controller/learnerController');

const req = {
  user: { id: 6 },
  query: { subject: 'Physical Sciences', grade: '11' }
};

const res = {
  json: (data) => {
    console.log('Returned resources count:', data.length);
    data.forEach((item, i) => {
      console.log(`${i + 1}. [DB Grade: ${item.grade}] ${item.title}`);
    });
    process.exit(0);
  },
  status: (code) => {
    console.log('Status code:', code);
    return { json: console.log };
  }
};

learnerController.getSubjectResources(req, res);
