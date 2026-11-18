const { spawn } = require('child_process');
const path = require('path');

const QUESTION_BANK_DIR = path.resolve(__dirname, '../../../QuestionBank');
const BRIDGE_SCRIPT = path.join(QUESTION_BANK_DIR, 'api_bridge.py');

/**
 * Execute QuestionBank Python CLI Bridge
 */
function runBridge(action, args = {}) {
    return new Promise((resolve, reject) => {
        const cliArgs = [BRIDGE_SCRIPT, action];
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '') {
                cliArgs.push(`${k}=${v}`);
            }
        }

        const pyProc = spawn('python', cliArgs, {
            cwd: QUESTION_BANK_DIR,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });

        let stdout = '';
        let stderr = '';

        pyProc.stdout.on('data', (chunk) => {
            stdout += chunk.toString('utf-8');
        });

        pyProc.stderr.on('data', (chunk) => {
            stderr += chunk.toString('utf-8');
        });

        pyProc.on('close', (code) => {
            if (code !== 0) {
                console.warn('[QuestionBank Bridge Error]', stderr || `Exited with code ${code}`);
                return resolve({ ok: false, error: stderr || `Process failed with exit code ${code}` });
            }
            try {
                const parsed = JSON.parse(stdout.trim());
                resolve(parsed);
            } catch (err) {
                console.error('[QuestionBank JSON Parse Error]', stdout);
                resolve({ ok: false, error: 'Failed to parse QuestionBank JSON output' });
            }
        });

        pyProc.on('error', (err) => {
            console.error('[QuestionBank Spawn Error]', err);
            resolve({ ok: false, error: err.message });
        });
    });
}

class QuestionBankService {
    /**
     * Get QuestionBank statistics & available categories
     */
    async getStats() {
        return runBridge('stats');
    }

    /**
     * Query individual questions from QuestionBank
     */
    async getQuestions(filters = {}) {
        return runBridge('questions', filters);
    }

    /**
     * Build an official CAPS test and memo
     */
    async buildTest({ marks = 30, grade = 10, subject = 'Physical Sciences', topic, title, qtype } = {}) {
        return runBridge('build', {
            marks,
            grade,
            subject,
            topic: topic || '',
            title: title || `${subject} Grade ${grade} Test`,
            qtype: qtype || ''
        });
    }
}

module.exports = new QuestionBankService();
