/**
 * GaugeSetTransactionHelper
 *
 * Encapsulates transaction management for gauge set operations
 * Provides consistent error handling and resource cleanup
 */

class GaugeSetTransactionHelper {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Execute operation within a repeatable read transaction
   *
   * @param {Function} operation - Async function that receives connection
   * @returns {Promise<any>} Result from operation
   */
  async executeInTransaction(operation) {
    const connection = await this.pool.getConnection();

    try {
      await connection.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      await connection.beginTransaction();

      const result = await operation(connection);

      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Execute operation within a standard transaction
   *
   * @param {Function} operation - Async function that receives connection
   * @returns {Promise<any>} Result from operation
   */
  async executeInSimpleTransaction(operation) {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      const result = await operation(connection);

      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = GaugeSetTransactionHelper;
