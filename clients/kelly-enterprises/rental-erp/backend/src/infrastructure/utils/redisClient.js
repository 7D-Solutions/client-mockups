const redis = require('redis');
const logger = require('./logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.warn('Redis connection refused, retrying...');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.connected = true;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.connected = false;
      return null;
    }
  }

  async get(key) {
    if (!this.connected || !this.client) return null;
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.connected || !this.client) return false;
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.connected || !this.client) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  }

  isConnected() {
    return this.connected;
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;