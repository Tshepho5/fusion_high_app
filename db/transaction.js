const db = require('./db');

/**
 * Executes a series of database queries within a single transaction.
 * This function automatically handles client connection, BEGIN, COMMIT, ROLLBACK, and client release.
 *
 * @param {function(object): Promise<any>} callback - An async function that receives a database client and executes queries.
 * @returns {Promise<any>} The result returned by the callback function.
 * @throws Will re-throw any errors from the callback, after rolling back the transaction.
 */
async function withTransaction(callback) {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

module.exports = { withTransaction };