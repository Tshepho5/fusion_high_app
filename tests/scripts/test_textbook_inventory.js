const db = require('../../db/db');
const jwt = require('jsonwebtoken');
const http = require('http');

// Let's test textbookController.getInventory directly
const textbookController = require('../../public/src/controller/textbookController');

async function test() {
  try {
    console.log('--- Testing textbookController.getInventory directly ---');
    const req = {
      query: {},
      user: { id: 1, role: 'admin', school_id: 1 }
    };
    const res = {
      json: (d) => {
        console.log('Direct controller success! Count:', Array.isArray(d) ? d.length : d);
        if (Array.isArray(d) && d.length > 0) {
          console.log('Sample item:', d[0]);
        }
      },
      status: (c) => ({
        json: (e) => console.log('Direct controller error:', c, e)
      })
    };

    await textbookController.getInventory(req, res);

    console.log('\n--- Testing with grade=12 ---');
    await textbookController.getInventory({ query: { grade: '12' } }, res);

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    process.exit(0);
  }
}

test();
