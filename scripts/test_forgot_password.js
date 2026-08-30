const authController = require('../public/src/controller/authController');

async function test() {
  try {
    console.log('--- TESTING FORGOT PASSWORD SPEED ---');
    const start = Date.now();

    const mockReq = {
      body: {
        email: 'tshepomakola22@gmail.com'
      },
      get: (header) => 'https://educonnect-cmyh.onrender.com',
      protocol: 'https'
    };

    const mockRes = {
      statusCode: 200,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        const elapsed = Date.now() - start;
        console.log(`[INSTANT RESPONSE] HTTP ${this.statusCode} in ${elapsed}ms:`, data);
        return this;
      }
    };

    await authController.forgotPassword(mockReq, mockRes);
    setTimeout(() => {
      console.log('Finished background dispatch check.');
      process.exit(0);
    }, 4000);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

test();
