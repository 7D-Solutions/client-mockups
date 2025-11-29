-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: fai_db_sandbox
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `table_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `record_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `event_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'system',
  `severity_level` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `hash_chain` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `digital_signature` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `previous_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user_id` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_table_record` (`table_name`,`record_id`),
  KEY `idx_audit_timestamp` (`timestamp`),
  KEY `idx_audit_event_type` (`event_type`),
  KEY `idx_audit_severity` (`severity_level`),
  KEY `idx_audit_hash_chain` (`hash_chain`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Enhanced audit log table with tamper-proof features - migrated from core_audit_log';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--
-- ORDER BY:  `id`

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `table_name`, `record_id`, `details`, `ip_address`, `user_agent`, `event_type`, `severity_level`, `hash_chain`, `digital_signature`, `previous_hash`, `timestamp`) VALUES (1,1,'test_migration','test',1,'{\"message\": \"Testing audit service after migration\"}','127.0.0.1','Node.js Test','other','info','6a0d39fd705671474ce341b39a267c12415542df013d183dbd8ad3307f1ce8d1',NULL,NULL,'2025-08-20 01:55:00'),(2,1,'permission_test','audit_test',1,'{\"test\": \"Verifying audit system functionality\", \"timestamp\": \"2025-08-20T02:40:30.873Z\", \"permission\": \"audit.view\"}','127.0.0.1','Audit Test Script','other','info','e734803d8fc06aacc40bcdaa9d2328568538e2b9cd83eba0d9f9dec020884fcf',NULL,NULL,'2025-08-20 02:40:31'),(3,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_NO_SUCH_TABLE\", \"error_name\": \"Error\", \"request_id\": \"b0622959-ccb1-4d4b-ba43-f4d8f84d63dc\", \"stack_trace\": \"Error: Table \'fai_db_sandbox.users\' doesn\'t exist\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Table \'fai_db_sandbox.users\' doesn\'t exist\"}','::ffff:172.18.0.1',NULL,'system','error','3c1035028ec6880dc2f703858a28757765c893a0f38ce41f0f31c5cb3f4882f4',NULL,NULL,'2025-08-20 02:58:52'),(4,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.18.0.1',NULL,'authentication','low','5226db2b0f5ac91bff3b5258a35d1646648d83b19b126e56e97df555bafb9a74',NULL,'3c1035028ec6880dc2f703858a28757765c893a0f38ce41f0f31c5cb3f4882f4','2025-08-20 02:58:52'),(5,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_NO_SUCH_TABLE\", \"error_name\": \"Error\", \"request_id\": \"ca3013dc-58cb-4b01-a07d-b1c08aa3cfe6\", \"stack_trace\": \"Error: Table \'fai_db_sandbox.users\' doesn\'t exist\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Table \'fai_db_sandbox.users\' doesn\'t exist\"}','::ffff:172.18.0.1',NULL,'system','error','3080c64a13f67d636d0f14e64a840eee5bd4dbb03cb55972faceba04d80021b4',NULL,'5226db2b0f5ac91bff3b5258a35d1646648d83b19b126e56e97df555bafb9a74','2025-08-20 02:58:52'),(6,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.18.0.1',NULL,'authentication','low','13e0f15a072216d7b865b76db1415df982bea11b1c659e129fca7ea2267d5d8c',NULL,'3080c64a13f67d636d0f14e64a840eee5bd4dbb03cb55972faceba04d80021b4','2025-08-20 02:58:52'),(7,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_NO_SUCH_TABLE\", \"error_name\": \"Error\", \"request_id\": \"42d9348b-abdd-4190-8a54-f9cfc44dbdc5\", \"stack_trace\": \"Error: Table \'fai_db_sandbox.users\' doesn\'t exist\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Table \'fai_db_sandbox.users\' doesn\'t exist\"}','::ffff:172.18.0.1','curl/8.5.0','system','error','194bc7cd48760be399fb11f33a563eea6dc1b3f8915abd6caafe1625a372cea8',NULL,'13e0f15a072216d7b865b76db1415df982bea11b1c659e129fca7ea2267d5d8c','2025-08-20 03:28:37'),(8,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.18.0.1','curl/8.5.0','authentication','low','fdabb6c332eaf32d7478226eaf650fb3f297f89fbc5021a2b279d03dcf682945',NULL,'194bc7cd48760be399fb11f33a563eea6dc1b3f8915abd6caafe1625a372cea8','2025-08-20 03:28:37'),(9,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_NO_SUCH_TABLE\", \"error_name\": \"Error\", \"request_id\": \"1bcede57-7802-463c-ace4-0c458c2aae88\", \"stack_trace\": \"Error: Table \'fai_db_sandbox.users\' doesn\'t exist\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Table \'fai_db_sandbox.users\' doesn\'t exist\"}','::ffff:172.18.0.1','curl/8.5.0','system','error','1eaaf5045928c43c66edeaedfa82b394c23464ff111b65c08cf4321d92f15d3d',NULL,'fdabb6c332eaf32d7478226eaf650fb3f297f89fbc5021a2b279d03dcf682945','2025-08-20 03:32:35'),(10,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.18.0.1','curl/8.5.0','authentication','low','3803107d58022c7eff2057fbd43fdda08d6f1e0700d30a3d65ca220c2bf8f582',NULL,'1eaaf5045928c43c66edeaedfa82b394c23464ff111b65c08cf4321d92f15d3d','2025-08-20 03:32:35'),(11,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_NO_SUCH_TABLE\", \"error_name\": \"Error\", \"request_id\": \"915071c9-e288-4dd8-81fd-f8bf3a65eee9\", \"stack_trace\": \"Error: Table \'fai_db_sandbox.users\' doesn\'t exist\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Table \'fai_db_sandbox.users\' doesn\'t exist\"}','::ffff:172.19.0.1','axios/1.11.0','system','error','ab71d95b15b016186299df03fad1088eaa8e012d86ae612be722e5f7b93d07c9',NULL,'3803107d58022c7eff2057fbd43fdda08d6f1e0700d30a3d65ca220c2bf8f582','2025-08-20 13:02:48'),(12,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.19.0.1','axios/1.11.0','authentication','low','0713be7a9accd8b11d7da61d6aeaff92c35e5af1a199bb6cbcbb9660a641e7fd',NULL,'ab71d95b15b016186299df03fad1088eaa8e012d86ae612be722e5f7b93d07c9','2025-08-20 13:02:48'),(13,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_NO_SUCH_TABLE\", \"error_name\": \"Error\", \"request_id\": \"b530ec59-5d32-4346-bc57-741b98c58b0b\", \"stack_trace\": \"Error: Table \'fai_db_sandbox.users\' doesn\'t exist\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Table \'fai_db_sandbox.users\' doesn\'t exist\"}','::ffff:172.19.0.1','axios/1.11.0','system','error','9a2896f4a703c6bdea5cd2c00d4e632efaac487d61d081ac487aa3a96ecd26c5',NULL,'0713be7a9accd8b11d7da61d6aeaff92c35e5af1a199bb6cbcbb9660a641e7fd','2025-08-20 13:02:48'),(14,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.19.0.1','axios/1.11.0','authentication','low','0138ea7eebc796f69f91bee32963e5464319b6c60ecc3da57c2fbc2f8f60dc62',NULL,'9a2896f4a703c6bdea5cd2c00d4e632efaac487d61d081ac487aa3a96ecd26c5','2025-08-20 13:02:48'),(15,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_NO_SUCH_TABLE\", \"error_name\": \"Error\", \"request_id\": \"8a383e1b-a52f-468e-874e-d6dc44e7319b\", \"stack_trace\": \"Error: Table \'fai_db_sandbox.users\' doesn\'t exist\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Table \'fai_db_sandbox.users\' doesn\'t exist\"}','::ffff:172.19.0.1','curl/8.5.0','system','error','2530fceb5baed1f7346d9c45f10bd6825f9747a1754409e84f7d7acbeb2cfa49',NULL,'0138ea7eebc796f69f91bee32963e5464319b6c60ecc3da57c2fbc2f8f60dc62','2025-08-20 13:05:13'),(16,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.19.0.1','curl/8.5.0','authentication','low','70bdbed7b378d36086a96419e054da0a6ec0ccc41aa440313b1dd6969372f3e6',NULL,'2530fceb5baed1f7346d9c45f10bd6825f9747a1754409e84f7d7acbeb2cfa49','2025-08-20 13:05:13'),(17,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_NO_SUCH_TABLE\", \"error_name\": \"Error\", \"request_id\": \"6a30b5f8-20b3-48aa-8eb5-7b2815134bd8\", \"stack_trace\": \"Error: Table \'fai_db_sandbox.users\' doesn\'t exist\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Table \'fai_db_sandbox.users\' doesn\'t exist\"}','::ffff:172.20.0.1','axios/1.11.0','system','error','42f00f2f27781d1fd8eebdc46804ef3f69d9edf14bca220a42a838d55d6484ad',NULL,'70bdbed7b378d36086a96419e054da0a6ec0ccc41aa440313b1dd6969372f3e6','2025-08-21 02:08:38'),(18,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.20.0.1','axios/1.11.0','authentication','low','002ddf43407b5fe03ba2bc508c2f712040dc46f91a690dbd4620fd22c4803cbc',NULL,'42f00f2f27781d1fd8eebdc46804ef3f69d9edf14bca220a42a838d55d6484ad','2025-08-21 02:08:38'),(19,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_NO_SUCH_TABLE\", \"error_name\": \"Error\", \"request_id\": \"8c7a2b82-d5f0-48a6-a9cf-f67e934c5731\", \"stack_trace\": \"Error: Table \'fai_db_sandbox.users\' doesn\'t exist\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Table \'fai_db_sandbox.users\' doesn\'t exist\"}','::ffff:172.20.0.1','curl/8.5.0','system','error','179d696a7905f899bbc28a1c278bacd64ed86b9ec0f2dbc6b8b4e8484b054c79',NULL,'002ddf43407b5fe03ba2bc508c2f712040dc46f91a690dbd4620fd22c4803cbc','2025-08-21 02:11:48'),(20,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.20.0.1','curl/8.5.0','authentication','low','8a4c65307d34de5ce52828d8bf59ae781d39fbf93024601a4f27f6218eb977a4',NULL,'179d696a7905f899bbc28a1c278bacd64ed86b9ec0f2dbc6b8b4e8484b054c79','2025-08-21 02:11:48'),(21,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_BAD_FIELD_ERROR\", \"error_name\": \"Error\", \"request_id\": \"99b5dda8-6284-4242-b2d2-9edbac088544\", \"stack_trace\": \"Error: Unknown column \'role\' in \'field list\'\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Unknown column \'role\' in \'field list\'\"}','::ffff:172.20.0.1','curl/8.5.0','system','error','26eedef478d472ef830026bc1c24fd4251c38c069116d0cd05b873da0538d9b4',NULL,'8a4c65307d34de5ce52828d8bf59ae781d39fbf93024601a4f27f6218eb977a4','2025-08-21 02:12:41'),(22,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.20.0.1','curl/8.5.0','authentication','low','77e0ff1134881869a7c0047ed9f18aa5bc312f3dc39651c495051cbb253b5153',NULL,'26eedef478d472ef830026bc1c24fd4251c38c069116d0cd05b873da0538d9b4','2025-08-21 02:12:41'),(23,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_BAD_FIELD_ERROR\", \"error_name\": \"Error\", \"request_id\": \"67bfb4a1-5e2d-46f0-850f-27f50219a677\", \"stack_trace\": \"Error: Unknown column \'role\' in \'field list\'\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Unknown column \'role\' in \'field list\'\"}','::ffff:172.20.0.1','curl/8.5.0','system','error','87a3da794bc595d9d91ea545052dc60f12ab94c3a8ef7017a90d2e7aee4c8f7a',NULL,'77e0ff1134881869a7c0047ed9f18aa5bc312f3dc39651c495051cbb253b5153','2025-08-21 02:22:28'),(24,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.20.0.1','curl/8.5.0','authentication','low','50eb95fb8993d5fc61a979e6e31759f5d515c4ac8619c938883096fdeb0a2c5c',NULL,'87a3da794bc595d9d91ea545052dc60f12ab94c3a8ef7017a90d2e7aee4c8f7a','2025-08-21 02:22:28'),(25,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_BAD_FIELD_ERROR\", \"error_name\": \"Error\", \"request_id\": \"4816542d-3e83-4c69-acc1-d1592cbb8bd4\", \"stack_trace\": \"Error: Unknown column \'role\' in \'field list\'\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Unknown column \'role\' in \'field list\'\"}','::ffff:172.20.0.1','curl/8.5.0','system','error','75c4c8e49bb178ebed6782e2bb023703546fa9a5055fcfccad0245254ba2a259',NULL,'50eb95fb8993d5fc61a979e6e31759f5d515c4ac8619c938883096fdeb0a2c5c','2025-08-21 02:25:24'),(26,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.20.0.1','curl/8.5.0','authentication','low','cc863f20970eed4aa77d7e4ab2619487f1c476124fefa5f181244911dd4d1ea6',NULL,'75c4c8e49bb178ebed6782e2bb023703546fa9a5055fcfccad0245254ba2a259','2025-08-21 02:25:24'),(27,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_NO_SUCH_TABLE\", \"error_name\": \"Error\", \"request_id\": \"3eb88ea5-bfd7-4211-8a97-d70c1168665f\", \"stack_trace\": \"Error: Table \'fai_db_sandbox.user_sessions\' doesn\'t exist\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Table \'fai_db_sandbox.user_sessions\' doesn\'t exist\"}','::ffff:172.20.0.1','curl/8.5.0','system','error','7bc41e8224b1d9e9dcc3588168d0b7a22eeb33fdee5a5b27c801a3303eab7923',NULL,'cc863f20970eed4aa77d7e4ab2619487f1c476124fefa5f181244911dd4d1ea6','2025-08-21 02:26:09'),(28,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.20.0.1','curl/8.5.0','authentication','low','38bea450c4a54dcfd996eba4a9164aa3c36e02929427b41e869f3dc42351f9a1',NULL,'7bc41e8224b1d9e9dcc3588168d0b7a22eeb33fdee5a5b27c801a3303eab7923','2025-08-21 02:26:09'),(29,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_NO_SUCH_TABLE\", \"error_name\": \"Error\", \"request_id\": \"9960d20e-c2c9-4a53-893a-6b62f633310b\", \"stack_trace\": \"Error: Table \'fai_db_sandbox.user_sessions\' doesn\'t exist\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Table \'fai_db_sandbox.user_sessions\' doesn\'t exist\"}','::ffff:172.20.0.1','curl/8.5.0','system','error','bb5689cce0360a4aa88872a8178a922fef82ee2070312b875f372549a9029d0a',NULL,'38bea450c4a54dcfd996eba4a9164aa3c36e02929427b41e869f3dc42351f9a1','2025-08-21 02:28:49'),(30,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.20.0.1','curl/8.5.0','authentication','low','c1c2941d34e922da9adcfe648779ff88ef9d2fb2199af8b76625eec8496925ff',NULL,'bb5689cce0360a4aa88872a8178a922fef82ee2070312b875f372549a9029d0a','2025-08-21 02:28:49'),(31,NULL,'system_error','system',NULL,'{\"url\": \"/api/auth/login\", \"method\": \"POST\", \"category\": \"DATABASE\", \"error_code\": \"ER_BAD_FIELD_ERROR\", \"error_name\": \"Error\", \"request_id\": \"6dd0375f-3405-425e-a5a4-23ff182656de\", \"stack_trace\": \"Error: Unknown column \'email\' in \'field list\'\\n    at PromisePoolConnection.execute (/app/node_modules/mysql2/lib/promise/connection.js:47:22)\\n    at operation (/app/config/database.enhanced.js:113:48)\\n    at CircuitBreaker.executeWithTimeout (/app/utils/circuitBreaker.js:77:7)\\n    at CircuitBreaker.execute (/app/utils/circuitBreaker.js:59:33)\\n    at wrappedOperation (/app/utils/retryHandler.js:157:27)\\n    at retryOperation (/app/utils/retryHandler.js:60:28)\\n    at executeWithRetryAndCircuitBreaker (/app/utils/retryHandler.js:160:10)\\n    at connection.execute (/app/config/database.enhanced.js:124:14)\\n    at EnhancedPool.execute (/app/config/database.enhanced.js:154:31)\\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\", \"error_message\": \"Unknown column \'email\' in \'field list\'\"}','::ffff:172.20.0.1','curl/8.5.0','system','error','2cd8893955e5bf4dffaadb2dd905949c4e60a7dd5bb4b8c0bc61b67fc0e1a4f7',NULL,'c1c2941d34e922da9adcfe648779ff88ef9d2fb2199af8b76625eec8496925ff','2025-08-21 02:31:37'),(32,NULL,'login','users',NULL,'{\"success\": false}','::ffff:172.20.0.1','curl/8.5.0','authentication','low','46e7da61de458963bb1cd6938a597b2efab0bd014f515dea02214279c6d98ec9',NULL,'2cd8893955e5bf4dffaadb2dd905949c4e60a7dd5bb4b8c0bc61b67fc0e1a4f7','2025-08-21 02:31:37'),(33,7,'create_gauge','gauges',88,'{\"gauge_id\": \"PH1-HT-001\", \"category_id\": 7, \"equipment_type\": \"hand_tool\", \"has_specifications\": true}',NULL,NULL,'other','info','e5d4bb3642ed5dcf44b5073da00197a2db955b502e972d8d0c86917857c0fa46',NULL,'46e7da61de458963bb1cd6938a597b2efab0bd014f515dea02214279c6d98ec9','2025-08-21 19:56:42'),(34,7,'create_gauge','gauges',89,'{\"gauge_id\": \"PH1-LE-001\", \"category_id\": 11, \"equipment_type\": \"large_equipment\", \"has_specifications\": true}',NULL,NULL,'other','info','4ce552583340561777bcbb69ebd8cb85170a79f50646ca64452dd3679cfed65b',NULL,'e5d4bb3642ed5dcf44b5073da00197a2db955b502e972d8d0c86917857c0fa46','2025-08-21 19:56:42'),(35,7,'create_gauge','gauges',90,'{\"gauge_id\": \"PH1-CS-001\", \"category_id\": 17, \"equipment_type\": \"calibration_standard\", \"has_specifications\": true}',NULL,NULL,'other','info','7d2186bf197b8d0945379101c525b86b44f000db7ff17ba5f85606ae0a68acdd',NULL,'4ce552583340561777bcbb69ebd8cb85170a79f50646ca64452dd3679cfed65b','2025-08-21 19:56:42');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_audit_log`
--

DROP TABLE IF EXISTS `core_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_audit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `module_id` varchar(50) NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `module_id` (`module_id`),
  KEY `idx_user_action` (`user_id`,`action`,`created_at`),
  KEY `idx_entity` (`entity_type`,`entity_id`,`created_at`),
  KEY `idx_created` (`created_at`),
  CONSTRAINT `core_audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `core_audit_log_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `core_modules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_audit_log`
--
-- ORDER BY:  `id`

LOCK TABLES `core_audit_log` WRITE;
/*!40000 ALTER TABLE `core_audit_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_audit_log_backup`
--

DROP TABLE IF EXISTS `core_audit_log_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_audit_log_backup` (
  `id` bigint NOT NULL DEFAULT '0',
  `user_id` int DEFAULT NULL,
  `module_id` varchar(50) NOT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Backup of original core_audit_log before migration to audit_logs';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_audit_log_backup`
--

LOCK TABLES `core_audit_log_backup` WRITE;
/*!40000 ALTER TABLE `core_audit_log_backup` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_audit_log_backup` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_enabled_modules`
--

DROP TABLE IF EXISTS `core_enabled_modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_enabled_modules` (
  `module_id` varchar(50) NOT NULL,
  `enabled_by` int NOT NULL,
  `enabled_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`module_id`),
  KEY `enabled_by` (`enabled_by`),
  CONSTRAINT `core_enabled_modules_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `core_modules` (`id`),
  CONSTRAINT `core_enabled_modules_ibfk_2` FOREIGN KEY (`enabled_by`) REFERENCES `core_users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_enabled_modules`
--
-- ORDER BY:  `module_id`

LOCK TABLES `core_enabled_modules` WRITE;
/*!40000 ALTER TABLE `core_enabled_modules` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_enabled_modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_event_subscriptions`
--

DROP TABLE IF EXISTS `core_event_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_event_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_id` varchar(50) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `handler_endpoint` varchar(255) DEFAULT NULL,
  `priority` int DEFAULT '100',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_subscription` (`module_id`,`event_type`),
  KEY `idx_event_priority` (`event_type`,`priority`),
  CONSTRAINT `core_event_subscriptions_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `core_modules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_event_subscriptions`
--
-- ORDER BY:  `id`

LOCK TABLES `core_event_subscriptions` WRITE;
/*!40000 ALTER TABLE `core_event_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_event_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_events`
--

DROP TABLE IF EXISTS `core_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_events` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `event_type` varchar(100) NOT NULL,
  `source_module_id` varchar(50) NOT NULL,
  `target_module_id` varchar(50) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `payload` json NOT NULL,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `retry_count` int DEFAULT '0',
  `error_message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `source_module_id` (`source_module_id`),
  KEY `target_module_id` (`target_module_id`),
  KEY `idx_status_created` (`status`,`created_at`),
  KEY `idx_type_entity` (`event_type`,`entity_type`,`entity_id`),
  CONSTRAINT `core_events_ibfk_1` FOREIGN KEY (`source_module_id`) REFERENCES `core_modules` (`id`),
  CONSTRAINT `core_events_ibfk_2` FOREIGN KEY (`target_module_id`) REFERENCES `core_modules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_events`
--
-- ORDER BY:  `id`

LOCK TABLES `core_events` WRITE;
/*!40000 ALTER TABLE `core_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_login_attempts`
--

DROP TABLE IF EXISTS `core_login_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_login_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `success` tinyint(1) NOT NULL,
  `failure_reason` varchar(50) DEFAULT NULL,
  `attempted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_time` (`email`,`attempted_at`),
  KEY `idx_ip_time` (`ip_address`,`attempted_at`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_login_attempts`
--
-- ORDER BY:  `id`

LOCK TABLES `core_login_attempts` WRITE;
/*!40000 ALTER TABLE `core_login_attempts` DISABLE KEYS */;
INSERT INTO `core_login_attempts` (`id`, `email`, `ip_address`, `success`, `failure_reason`, `attempted_at`) VALUES (1,'admin@fireproof.com','::ffff:172.18.0.1',0,'Invalid password','2025-08-20 12:13:18'),(2,'admin@fireproof.com','::ffff:172.18.0.1',0,'Invalid password','2025-08-20 12:18:28'),(3,'admin@fireproof.com','::ffff:172.18.0.1',1,NULL,'2025-08-20 12:24:04'),(4,'admin@fireproof.com','::ffff:172.18.0.1',1,NULL,'2025-08-20 12:25:05'),(5,'admin@fireproof.com','::ffff:172.18.0.1',1,NULL,'2025-08-20 12:47:47'),(6,'invalid@test.com','::ffff:172.18.0.1',0,'User not found','2025-08-20 12:50:58'),(7,'admin@fireproof.com','::ffff:172.18.0.1',1,NULL,'2025-08-20 12:50:58'),(8,'admin@fireproof.com','::ffff:172.18.0.1',1,NULL,'2025-08-20 12:50:58'),(9,'gauge.user@fireproof.com','::ffff:172.18.0.1',0,'Invalid password','2025-08-20 12:50:58'),(10,'admin@fireproof.com','::ffff:172.18.0.1',1,NULL,'2025-08-20 12:50:58'),(11,'invalid@test.com','::ffff:172.18.0.1',0,'User not found','2025-08-20 12:57:26'),(12,'admin@fireproof.com','::ffff:172.18.0.1',1,NULL,'2025-08-20 12:57:26'),(13,'admin@fireproof.com','::ffff:172.18.0.1',1,NULL,'2025-08-20 12:57:27'),(14,'gauge.user@fireproof.com','::ffff:172.18.0.1',0,'Invalid password','2025-08-20 12:57:27'),(15,'admin@fireproof.com','::ffff:172.18.0.1',1,NULL,'2025-08-20 12:57:27'),(16,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 13:14:51'),(17,'invalid@test.com','::ffff:172.19.0.1',0,'User not found','2025-08-20 13:15:02'),(18,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 13:15:02'),(19,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 13:15:02'),(20,'gauge.user@fireproof.com','::ffff:172.19.0.1',0,'Invalid password','2025-08-20 13:15:03'),(21,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 13:15:03'),(22,'invalid@test.com','::ffff:172.19.0.1',0,'User not found','2025-08-20 13:23:19'),(23,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 13:23:19'),(24,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 13:23:19'),(25,'gauge.user@fireproof.com','::ffff:172.19.0.1',0,'Invalid password','2025-08-20 13:23:20'),(26,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 13:23:20'),(27,'gauge.admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 14:53:52'),(28,'gauge.user@fireproof.com','::ffff:172.19.0.1',0,'Invalid password','2025-08-20 14:53:53'),(29,'gauge.admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 15:01:21'),(30,'gauge.user@fireproof.com','::ffff:172.19.0.1',0,'Invalid password','2025-08-20 15:15:56'),(31,'gauge.admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 16:09:42'),(32,'gauge.admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 16:09:47'),(33,'invalid@email.com','::ffff:172.19.0.1',0,'User not found','2025-08-20 16:10:36'),(34,'gauge.admin@fireproof.com','::ffff:172.19.0.1',0,'Invalid password','2025-08-20 16:44:16'),(35,'gauge.admin@fireproof.com','::ffff:172.19.0.1',0,'Invalid password','2025-08-20 17:47:00'),(36,'gauge.admin@fireproof.com','::ffff:172.19.0.1',0,'Invalid password','2025-08-20 17:47:17'),(37,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 18:27:43'),(38,'gauge.admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 18:31:30'),(39,'gauge.user@fireproof.com','::ffff:172.19.0.1',0,'Invalid password','2025-08-20 18:31:30'),(40,'gauge.admin@fireproof.com','::ffff:172.19.0.1',0,'Invalid password','2025-08-20 18:34:39'),(41,'gauge.admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 18:40:48'),(42,'gauge.user@fireproof.com','::ffff:172.19.0.1',0,'Invalid password','2025-08-20 18:40:49'),(43,'test@example.com','::ffff:127.0.0.1',0,'User not found','2025-08-20 18:41:24'),(44,'test@example.com','::ffff:127.0.0.1',0,'User not found','2025-08-20 18:44:00'),(45,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 23:30:18'),(46,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 23:30:50'),(47,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 23:31:09'),(48,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 23:37:17'),(49,'bwilson@fireproof.com','::ffff:172.19.0.1',0,'Invalid password','2025-08-20 23:37:17'),(50,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 23:39:19'),(51,'admin@fireproof.com','::ffff:172.19.0.1',1,NULL,'2025-08-20 23:41:44'),(52,'operator@test.com','::1',1,NULL,'2025-08-20 23:59:02'),(53,'admin@fireproof.com','::1',1,NULL,'2025-08-20 23:59:02'),(54,'operator@test.com','::1',1,NULL,'2025-08-21 00:01:43'),(55,'admin@fireproof.com','::1',1,NULL,'2025-08-21 00:01:44'),(56,'operator@test.com','::1',1,NULL,'2025-08-21 00:02:35'),(57,'operator@test.com','::1',1,NULL,'2025-08-21 00:28:38'),(58,'admin@fireproof.com','::1',1,NULL,'2025-08-21 00:28:38'),(59,'operator@test.com','::1',1,NULL,'2025-08-21 00:30:53'),(60,'admin@fireproof.com','::1',1,NULL,'2025-08-21 00:30:53'),(61,'operator@test.com','::1',1,NULL,'2025-08-21 00:32:15'),(62,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:12:16'),(63,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:13:09'),(64,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:14:16'),(65,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:16:33'),(66,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:18:31'),(67,'qc@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:18:31'),(68,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:21:17'),(69,'qc@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:21:17'),(70,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:36:00'),(71,'qc@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:36:00'),(72,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:36:00'),(73,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:39:14'),(74,'qc@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:39:14'),(75,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:39:15'),(76,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:42:44'),(77,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:49:15'),(78,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:53:06'),(79,'qc@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:53:07'),(80,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:54:16'),(81,'qc@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:54:16'),(82,'qc@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 01:54:33'),(83,'operator@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 02:03:17'),(84,'qc@test.com','::ffff:172.19.0.1',1,NULL,'2025-08-21 02:03:17');
/*!40000 ALTER TABLE `core_login_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_module_config`
--

DROP TABLE IF EXISTS `core_module_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_module_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_id` varchar(50) NOT NULL,
  `config_key` varchar(100) NOT NULL,
  `config_value` json NOT NULL,
  `updated_by` int NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_config` (`module_id`,`config_key`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `core_module_config_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `core_modules` (`id`),
  CONSTRAINT `core_module_config_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `core_users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_module_config`
--
-- ORDER BY:  `id`

LOCK TABLES `core_module_config` WRITE;
/*!40000 ALTER TABLE `core_module_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_module_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_modules`
--

DROP TABLE IF EXISTS `core_modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_modules` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `version` varchar(20) NOT NULL,
  `is_core` tinyint(1) DEFAULT '0',
  `dependencies` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_modules`
--
-- ORDER BY:  `id`

LOCK TABLES `core_modules` WRITE;
/*!40000 ALTER TABLE `core_modules` DISABLE KEYS */;
INSERT INTO `core_modules` (`id`, `name`, `version`, `is_core`, `dependencies`, `created_at`, `updated_at`) VALUES ('auth','Authentication','1.0.0',1,NULL,'2025-08-19 02:45:05','2025-08-19 02:45:05'),('data','Data Management','1.0.0',1,NULL,'2025-08-19 02:45:05','2025-08-19 02:45:05'),('gauge','Gauge Management','1.0.0',0,NULL,'2025-08-19 14:45:36','2025-08-19 14:45:36'),('navigation','Navigation','1.0.0',1,NULL,'2025-08-19 02:45:05','2025-08-19 02:45:05'),('notifications','Notifications','1.0.0',1,NULL,'2025-08-19 02:45:05','2025-08-19 02:45:05');
/*!40000 ALTER TABLE `core_modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_navigation`
--

DROP TABLE IF EXISTS `core_navigation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_navigation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_id` varchar(50) NOT NULL,
  `parent_id` int DEFAULT NULL,
  `label` varchar(100) NOT NULL,
  `path` varchar(255) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `required_permission_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `required_permission_id` (`required_permission_id`),
  KEY `idx_module_order` (`module_id`,`sort_order`),
  KEY `idx_parent_order` (`parent_id`,`sort_order`),
  CONSTRAINT `core_navigation_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `core_modules` (`id`),
  CONSTRAINT `core_navigation_ibfk_2` FOREIGN KEY (`required_permission_id`) REFERENCES `core_permissions` (`id`),
  CONSTRAINT `fk_navigation_parent` FOREIGN KEY (`parent_id`) REFERENCES `core_navigation` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_navigation`
--
-- ORDER BY:  `id`

LOCK TABLES `core_navigation` WRITE;
/*!40000 ALTER TABLE `core_navigation` DISABLE KEYS */;
INSERT INTO `core_navigation` (`id`, `module_id`, `parent_id`, `label`, `path`, `icon`, `sort_order`, `required_permission_id`, `is_active`) VALUES (19,'gauge',NULL,'Gauges','/gauges','gauge',10,40,1),(20,'gauge',19,'Calibrations','/gauges/calibrations','calendar',20,49,1),(21,'gauge',19,'QC Checks','/gauges/qc','check-circle',30,53,1),(22,'gauge',19,'Reports','/gauges/reports','chart-bar',40,57,1);
/*!40000 ALTER TABLE `core_navigation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_notification_preferences`
--

DROP TABLE IF EXISTS `core_notification_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_notification_preferences` (
  `user_id` int NOT NULL,
  `notification_type` varchar(50) NOT NULL,
  `delivery_methods` json DEFAULT NULL,
  `is_enabled` tinyint(1) DEFAULT '1',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`notification_type`),
  CONSTRAINT `core_notification_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_notification_preferences`
--
-- ORDER BY:  `user_id`,`notification_type`

LOCK TABLES `core_notification_preferences` WRITE;
/*!40000 ALTER TABLE `core_notification_preferences` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_notification_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_notification_templates`
--

DROP TABLE IF EXISTS `core_notification_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_notification_templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module_id` varchar(50) NOT NULL,
  `type` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `subject_template` varchar(255) NOT NULL,
  `body_template` text NOT NULL,
  `variables` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_template` (`module_id`,`type`,`name`),
  CONSTRAINT `core_notification_templates_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `core_modules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_notification_templates`
--
-- ORDER BY:  `id`

LOCK TABLES `core_notification_templates` WRITE;
/*!40000 ALTER TABLE `core_notification_templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_notification_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_notifications`
--

DROP TABLE IF EXISTS `core_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `module_id` varchar(50) NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `data` json DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `module_id` (`module_id`),
  KEY `idx_user_unread` (`user_id`,`is_read`,`created_at`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `core_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `core_notifications_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `core_modules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_notifications`
--
-- ORDER BY:  `id`

LOCK TABLES `core_notifications` WRITE;
/*!40000 ALTER TABLE `core_notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_permissions`
--

DROP TABLE IF EXISTS `core_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_permissions`
--
-- ORDER BY:  `id`

LOCK TABLES `core_permissions` WRITE;
/*!40000 ALTER TABLE `core_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_role_permissions`
--

DROP TABLE IF EXISTS `core_role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `core_role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `core_roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `core_role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `core_permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_role_permissions`
--
-- ORDER BY:  `role_id`,`permission_id`

LOCK TABLES `core_role_permissions` WRITE;
/*!40000 ALTER TABLE `core_role_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_roles`
--

DROP TABLE IF EXISTS `core_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_roles`
--
-- ORDER BY:  `id`

LOCK TABLES `core_roles` WRITE;
/*!40000 ALTER TABLE `core_roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_sessions`
--

DROP TABLE IF EXISTS `core_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token` varchar(255) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_user_expires` (`user_id`,`expires_at`),
  CONSTRAINT `core_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_sessions`
--
-- ORDER BY:  `id`

LOCK TABLES `core_sessions` WRITE;
/*!40000 ALTER TABLE `core_sessions` DISABLE KEYS */;
INSERT INTO `core_sessions` (`id`, `user_id`, `token`, `ip_address`, `user_agent`, `expires_at`, `created_at`) VALUES (3,7,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo3LCJlbWFpbCI6ImFkbWluQGZpcmVwcm9vZi5jb20iLCJyb2xlcyI6W10sIm5hbWUiOiJTeXN0ZW0gQWRtaW5pc3RyYXRvciIsImlhdCI6MTc1NTY5MjY0NCwiZXhwIjoxNzU1NzIxNDQ0fQ.DI1JzunjArUjsGUMUD2vm9uUMSegDDGgYSklyA3ybG0','::ffff:172.18.0.1','curl/8.5.0','2025-08-20 20:24:04','2025-08-20 12:24:04'),(4,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3MzQzNDIsImV4cCI6MTc1NTc2MzE0Mn0.RRs7iKUBtz-jvy15N_ZDnoHfq-nnUyRhzaSh569c6AY','::1','axios/1.11.0','2025-08-21 07:59:03','2025-08-20 23:59:02'),(5,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3MzQ1MDMsImV4cCI6MTc1NTc2MzMwM30.1o8aRGqWdL_UUAhIGLPu8-vzGdm-VI3i2mB5fLMwc9I','::1','axios/1.11.0','2025-08-21 08:01:44','2025-08-21 00:01:43'),(6,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3MzQ1NTUsImV4cCI6MTc1NTc2MzM1NX0.FHmDYqC5DY9XXGUKHHT_GGbRDd2cuIDTkXnhqpajXzg','::1','axios/1.11.0','2025-08-21 08:02:35','2025-08-21 00:02:35'),(7,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3MzYxMTgsImV4cCI6MTc1NTc2NDkxOH0.WoihW-twOG6OBDVwkbcEWcpoYn8m3b2qlxFuoSbQ9dU','::1','axios/1.11.0','2025-08-21 08:28:39','2025-08-21 00:28:38'),(8,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3MzYyNTMsImV4cCI6MTc1NTc2NTA1M30.R_ijwhYvfFRfVx0nKMO68Ps6GoA4Vng1UV7AqzOwkl8','::1','axios/1.11.0','2025-08-21 08:30:53','2025-08-21 00:30:53'),(9,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3MzYzMzUsImV4cCI6MTc1NTc2NTEzNX0.BPQzTyz42QZvNrW7JCHilD8vzdPcp3JEgHEH3D1MKZ4','::1','axios/1.11.0','2025-08-21 08:32:16','2025-08-21 00:32:15'),(10,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3Mzg3MzYsImV4cCI6MTc1NTc2NzUzNn0.hGL5_7xVRvieplshVtGKCX-VxVD6yrT2l-4IetyofMA','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:12:16','2025-08-21 01:12:16'),(11,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3Mzg3ODksImV4cCI6MTc1NTc2NzU4OX0.nLydv7x0cYHU7rudn8iZAyqt5Y-1rEqjN52pn73f1NQ','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:13:10','2025-08-21 01:13:09'),(12,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3Mzg4NTYsImV4cCI6MTc1NTc2NzY1Nn0.H3-f_7s44gniR8--Q8-i5HYWaC9PU5y20uiwuyH9yxA','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:14:16','2025-08-21 01:14:16'),(13,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3Mzg5OTMsImV4cCI6MTc1NTc2Nzc5M30.pN3oQ8t_g8eEHOnqlqPe71IF1-MS_0INOdZOu1ChQzw','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:16:33','2025-08-21 01:16:33'),(14,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3MzkxMTEsImV4cCI6MTc1NTc2NzkxMX0.2f8O611r8lmoI-tj5xLAStMwPyZHro9rsy3SSA6evXY','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:18:31','2025-08-21 01:18:31'),(15,20,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyMCwiZW1haWwiOiJxY0B0ZXN0LmNvbSIsInJvbGVzIjpbInF1YWxpdHlfaW5zcGVjdG9yIl0sIm5hbWUiOiJUZXN0IFFDIiwiaWF0IjoxNzU1NzM5MTExLCJleHAiOjE3NTU3Njc5MTF9.AcF7ehI7hngx_H1vymvy0_Z2qOiYQlvHX561U-ualTE','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:18:31','2025-08-21 01:18:31'),(16,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3MzkyNzcsImV4cCI6MTc1NTc2ODA3N30.q0JPyUtQqXMLFXxzhcOY7Y5hqmrEME1M6BRAQMgwLOw','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:21:17','2025-08-21 01:21:17'),(17,20,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyMCwiZW1haWwiOiJxY0B0ZXN0LmNvbSIsInJvbGVzIjpbInF1YWxpdHlfaW5zcGVjdG9yIl0sIm5hbWUiOiJUZXN0IFFDIiwiaWF0IjoxNzU1NzM5Mjc3LCJleHAiOjE3NTU3NjgwNzd9.ZNAQP0FldXfYoRcCs-2KtQLwqEGLtj_8YQ4NlsooXxo','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:21:17','2025-08-21 01:21:17'),(18,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3NDAxNjAsImV4cCI6MTc1NTc2ODk2MH0.ySoBtiSJo7iKe06dRkXoEGYfG9-7vxM2OUEwnf1tQ84','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:36:00','2025-08-21 01:36:00'),(19,20,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyMCwiZW1haWwiOiJxY0B0ZXN0LmNvbSIsInJvbGVzIjpbInF1YWxpdHlfaW5zcGVjdG9yIl0sIm5hbWUiOiJUZXN0IFFDIiwiaWF0IjoxNzU1NzQwMTYwLCJleHAiOjE3NTU3Njg5NjB9.MaDG5ktW2_yT-iSg8IpuYSr_gMYU9tpIIyE_mI7zFtw','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:36:00','2025-08-21 01:36:00'),(21,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3NDAzNTQsImV4cCI6MTc1NTc2OTE1NH0.NBc0vtDNePdvOZDafMJUKFF4e8oxZkTD8cvyr_8G4aQ','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:39:14','2025-08-21 01:39:14'),(22,20,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyMCwiZW1haWwiOiJxY0B0ZXN0LmNvbSIsInJvbGVzIjpbInF1YWxpdHlfaW5zcGVjdG9yIl0sIm5hbWUiOiJUZXN0IFFDIiwiaWF0IjoxNzU1NzQwMzU0LCJleHAiOjE3NTU3NjkxNTR9.r7n49TWGCcdtbUcjqD5WOOhWfdNcYH7otW7ba7ajmpU','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:39:15','2025-08-21 01:39:14'),(23,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3NDAzNTUsImV4cCI6MTc1NTc2OTE1NX0.vzNraAzukZg-S6AmiHYRZCXzl4MuYshkOpeWrqf9D8c','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:39:15','2025-08-21 01:39:15'),(24,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3NDA1NjQsImV4cCI6MTc1NTc2OTM2NH0.Y5RJXMxuXFt_FtA7LR1BBAAI4cHBA9TOhwyQBil3vyk','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:42:44','2025-08-21 01:42:44'),(25,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3NDA5NTUsImV4cCI6MTc1NTc2OTc1NX0.gW5_1Y1mAeds66RLmulcCEFzAZcCHpSYTI_KngBakok','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:49:15','2025-08-21 01:49:15'),(26,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3NDExODYsImV4cCI6MTc1NTc2OTk4Nn0.Xngv4sbn3szg9xowF1FThJxohce7g7NDlyvo6oRUmbg','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:53:07','2025-08-21 01:53:06'),(27,20,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyMCwiZW1haWwiOiJxY0B0ZXN0LmNvbSIsInJvbGVzIjpbInF1YWxpdHlfaW5zcGVjdG9yIl0sIm5hbWUiOiJUZXN0IFFDIiwiaWF0IjoxNzU1NzQxMTg3LCJleHAiOjE3NTU3Njk5ODd9.8-uq1NH0GVX660OINCtQEbuFTIqnF0skR1UcL6MqVoo','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:53:07','2025-08-21 01:53:07'),(28,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3NDEyNTYsImV4cCI6MTc1NTc3MDA1Nn0.Wd3fNn_jr03a3C7GqfPmzthwI8ARLtk_4wyqt95L0u4','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:54:16','2025-08-21 01:54:16'),(29,20,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyMCwiZW1haWwiOiJxY0B0ZXN0LmNvbSIsInJvbGVzIjpbInF1YWxpdHlfaW5zcGVjdG9yIl0sIm5hbWUiOiJUZXN0IFFDIiwiaWF0IjoxNzU1NzQxMjU2LCJleHAiOjE3NTU3NzAwNTZ9.mv9ycDBzEwO3MEQztOx_rSS9p0WFz0NY05bhQQPu4aQ','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:54:17','2025-08-21 01:54:16'),(30,20,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyMCwiZW1haWwiOiJxY0B0ZXN0LmNvbSIsInJvbGVzIjpbInF1YWxpdHlfaW5zcGVjdG9yIl0sIm5hbWUiOiJUZXN0IFFDIiwiaWF0IjoxNzU1NzQxMjczLCJleHAiOjE3NTU3NzAwNzN9.dICIDCLD5iFr2s6GesbqsZwkmeZO3WcjqiiWsYEeSvk','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 09:54:34','2025-08-21 01:54:33'),(31,19,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxOSwiZW1haWwiOiJvcGVyYXRvckB0ZXN0LmNvbSIsInJvbGVzIjpbImdhdWdlX3VzZXIiXSwibmFtZSI6IlRlc3QgT3BlcmF0b3IiLCJpYXQiOjE3NTU3NDE3OTcsImV4cCI6MTc1NTc3MDU5N30.Xr5QhwOvYMpFcEzfTRDaQWMvgHUEmA2hdA_KKr_zvS8','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 10:03:17','2025-08-21 02:03:17'),(32,20,'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyMCwiZW1haWwiOiJxY0B0ZXN0LmNvbSIsInJvbGVzIjpbInF1YWxpdHlfaW5zcGVjdG9yIl0sIm5hbWUiOiJUZXN0IFFDIiwiaWF0IjoxNzU1NzQxNzk3LCJleHAiOjE3NTU3NzA1OTd9.in4UJlu5-Xu-oMuD9vtesQavp2yjhG9Xjlk7mCJsW6s','::ffff:172.19.0.1','axios/1.11.0','2025-08-21 10:03:18','2025-08-21 02:03:17');
/*!40000 ALTER TABLE `core_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_user_module_access`
--

DROP TABLE IF EXISTS `core_user_module_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_user_module_access` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `module_id` varchar(50) NOT NULL,
  `has_access` tinyint(1) DEFAULT '1',
  `module_role_id` int DEFAULT NULL,
  `granted_by` int NOT NULL,
  `granted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_access` (`user_id`,`module_id`),
  KEY `module_role_id` (`module_role_id`),
  KEY `granted_by` (`granted_by`),
  KEY `idx_user` (`user_id`),
  KEY `idx_module` (`module_id`),
  CONSTRAINT `core_user_module_access_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `core_user_module_access_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `core_modules` (`id`),
  CONSTRAINT `core_user_module_access_ibfk_3` FOREIGN KEY (`module_role_id`) REFERENCES `core_roles` (`id`),
  CONSTRAINT `core_user_module_access_ibfk_4` FOREIGN KEY (`granted_by`) REFERENCES `core_users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_user_module_access`
--
-- ORDER BY:  `id`

LOCK TABLES `core_user_module_access` WRITE;
/*!40000 ALTER TABLE `core_user_module_access` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_user_module_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_user_permission_overrides`
--

DROP TABLE IF EXISTS `core_user_permission_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_user_permission_overrides` (
  `user_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `granted` tinyint(1) NOT NULL,
  `granted_by` int NOT NULL,
  `granted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `core_user_permission_overrides_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `core_user_permission_overrides_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `core_permissions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_user_permission_overrides`
--
-- ORDER BY:  `user_id`,`permission_id`

LOCK TABLES `core_user_permission_overrides` WRITE;
/*!40000 ALTER TABLE `core_user_permission_overrides` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_user_permission_overrides` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_user_roles`
--

DROP TABLE IF EXISTS `core_user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_user_roles` (
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `core_user_roles_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `core_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_user_roles`
--
-- ORDER BY:  `user_id`,`role_id`

LOCK TABLES `core_user_roles` WRITE;
/*!40000 ALTER TABLE `core_user_roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `core_user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `core_users`
--

DROP TABLE IF EXISTS `core_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `core_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `failed_login_count` int NOT NULL DEFAULT '0',
  `locked_until` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_active_deleted` (`is_active`,`is_deleted`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `core_users`
--
-- ORDER BY:  `id`

LOCK TABLES `core_users` WRITE;
/*!40000 ALTER TABLE `core_users` DISABLE KEYS */;
INSERT INTO `core_users` (`id`, `email`, `password_hash`, `name`, `is_active`, `is_deleted`, `failed_login_count`, `locked_until`, `created_at`, `updated_at`) VALUES (7,'admin@fireproof.com','$2b$10$xYatAWC2Zm6CsGxPjRPZCOCl3BnBb1oYk4bQFLXChNqhiKFFEN4ES','System Administrator',1,0,0,NULL,'2025-08-19 13:01:08','2025-08-20 12:24:04'),(8,'jsmith@fireproof.com','$2b$10$YourHashHere','John Smith',1,0,0,NULL,'2025-08-19 13:01:08','2025-08-19 13:01:08'),(9,'mjones@fireproof.com','$2b$10$YourHashHere','Mary Jones',1,0,0,NULL,'2025-08-19 13:01:08','2025-08-19 13:01:08'),(10,'bwilson@fireproof.com','$2b$10$YourHashHere','Bob Wilson',1,0,1,NULL,'2025-08-19 13:01:08','2025-08-20 23:37:17'),(11,'qc@fireproof.com','$2b$10$YourHashHere','Quality Inspector',1,0,0,NULL,'2025-08-19 13:01:08','2025-08-19 13:01:08'),(12,'gauge.admin@fireproof.com','$2b$10$kKUlxR6YIidJWmdZ1q5jjemQC9XYgwm81IkZ9xOig.w8.M4wjIBOK','Gauge Administrator',1,0,0,NULL,'2025-08-19 15:36:26','2025-08-20 18:40:48'),(13,'gauge.user@fireproof.com','$2b$10$T6aCbaEmStnYnxhwGvb82eeHZde7X45cYs7GnMCwTnQ48CegkBze.','Gauge User',1,0,8,NULL,'2025-08-19 15:36:26','2025-08-20 18:40:49'),(14,'gauge.viewer@fireproof.com','$2b$10$T6aCbaEmStnYnxhwGvb82eeHZde7X45cYs7GnMCwTnQ48CegkBze.','Gauge Viewer',1,0,0,NULL,'2025-08-19 15:36:26','2025-08-19 15:55:12'),(19,'operator@test.com','$2b$10$r0fMUFr8n13zCpLLSmfapeAJ8ExUCjlecnxMgujr7uoQCnL.Vtpz6','Test Operator',1,0,0,NULL,'2025-08-20 23:56:42','2025-08-20 23:56:42'),(20,'qc@test.com','$2b$10$r0fMUFr8n13zCpLLSmfapeAJ8ExUCjlecnxMgujr7uoQCnL.Vtpz6','Test QC',1,0,0,NULL,'2025-08-20 23:56:42','2025-08-20 23:56:42');
/*!40000 ALTER TABLE `core_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gauge_calibration_failures`
--

DROP TABLE IF EXISTS `gauge_calibration_failures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gauge_calibration_failures` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `calibration_id` bigint unsigned NOT NULL,
  `failure_type` varchar(100) NOT NULL,
  `details` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_fail_cal` (`calibration_id`),
  CONSTRAINT `gauge_calibration_failures_ibfk_1` FOREIGN KEY (`calibration_id`) REFERENCES `gauge_calibrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gauge_calibration_failures`
--
-- ORDER BY:  `id`

LOCK TABLES `gauge_calibration_failures` WRITE;
/*!40000 ALTER TABLE `gauge_calibration_failures` DISABLE KEYS */;
/*!40000 ALTER TABLE `gauge_calibration_failures` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gauge_calibration_schedule`
--

DROP TABLE IF EXISTS `gauge_calibration_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gauge_calibration_schedule` (
  `gauge_id` int NOT NULL,
  `frequency_days` int NOT NULL DEFAULT '365',
  `last_calibration_id` bigint unsigned DEFAULT NULL,
  `next_due_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`gauge_id`),
  KEY `gauge_calibration_schedule_ibfk_2` (`last_calibration_id`),
  KEY `idx_next_due` (`next_due_date`),
  KEY `idx_active_due` (`is_active`,`next_due_date`),
  CONSTRAINT `gauge_calibration_schedule_ibfk_1` FOREIGN KEY (`gauge_id`) REFERENCES `gauges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `gauge_calibration_schedule_ibfk_2` FOREIGN KEY (`last_calibration_id`) REFERENCES `gauge_calibrations` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gauge_calibration_schedule`
--
-- ORDER BY:  `gauge_id`

LOCK TABLES `gauge_calibration_schedule` WRITE;
/*!40000 ALTER TABLE `gauge_calibration_schedule` DISABLE KEYS */;
/*!40000 ALTER TABLE `gauge_calibration_schedule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gauge_categories`
--

DROP TABLE IF EXISTS `gauge_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gauge_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_type` enum('thread_gauge','hand_tool','large_equipment','calibration_standard') NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `display_order` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_category` (`equipment_type`,`category_name`),
  KEY `idx_equipment_type` (`equipment_type`,`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gauge_categories`
--
-- ORDER BY:  `id`

LOCK TABLES `gauge_categories` WRITE;
/*!40000 ALTER TABLE `gauge_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `gauge_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gauge_categories_backup_phase1`
--

DROP TABLE IF EXISTS `gauge_categories_backup_phase1`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gauge_categories_backup_phase1` (
  `id` int NOT NULL DEFAULT '0',
  `name` varchar(100) NOT NULL,
  `prefix` varchar(10) NOT NULL,
  `description` text,
  `default_calibration_days` int NOT NULL,
  `next_number` int DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gauge_categories_backup_phase1`
--

LOCK TABLES `gauge_categories_backup_phase1` WRITE;
/*!40000 ALTER TABLE `gauge_categories_backup_phase1` DISABLE KEYS */;
INSERT INTO `gauge_categories_backup_phase1` (`id`, `name`, `prefix`, `description`, `default_calibration_days`, `next_number`, `is_active`, `created_at`) VALUES (31,'Thread Plugs','TP','Thread Plug Gauges',365,1,1,'2025-08-19 15:14:18'),(33,'Thread Plug Gauges','TPG','GO/NO GO thread plug gauges for internal thread checking',365,1,1,'2025-08-19 15:38:04'),(34,'Thread Ring Gauges','TRG','GO/NO GO thread ring gauges for external thread checking',365,1,1,'2025-08-19 15:38:04'),(35,'Hand Tool Calipers','CAL','Digital and dial calipers for precision measurement',183,1,1,'2025-08-19 15:38:04'),(36,'Hand Tool Micrometers','MIC','Digital and dial micrometers for precision measurement',183,1,1,'2025-08-19 15:38:04'),(37,'Large Equipment CMM','CMM','Coordinate Measuring Machines for complex part inspection',365,1,1,'2025-08-19 15:38:04'),(38,'Calibration Standards','STD','Reference standards and gauge blocks for calibration',365,1,1,'2025-08-19 15:38:04');
/*!40000 ALTER TABLE `gauge_categories_backup_phase1` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gauge_checkout_history`
--

DROP TABLE IF EXISTS `gauge_checkout_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gauge_checkout_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `gauge_id` int NOT NULL,
  `action` enum('checkout','return','transfer_out','transfer_in') NOT NULL,
  `actor_user_id` int DEFAULT NULL,
  `target_user_id` int DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `related_transfer_id` bigint unsigned DEFAULT NULL,
  `action_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_gch_transfer_id` (`related_transfer_id`),
  KEY `idx_gch_gauge_time` (`gauge_id`,`action_at`),
  KEY `idx_gch_actor` (`actor_user_id`),
  KEY `idx_gch_target` (`target_user_id`),
  KEY `idx_gch_action` (`action`),
  CONSTRAINT `fk_gch_actor_user` FOREIGN KEY (`actor_user_id`) REFERENCES `core_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_gch_gauge_id` FOREIGN KEY (`gauge_id`) REFERENCES `gauges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gch_target_user` FOREIGN KEY (`target_user_id`) REFERENCES `core_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_gch_transfer_id` FOREIGN KEY (`related_transfer_id`) REFERENCES `gauge_transfers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gauge_checkout_history`
--
-- ORDER BY:  `id`

LOCK TABLES `gauge_checkout_history` WRITE;
/*!40000 ALTER TABLE `gauge_checkout_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `gauge_checkout_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gauge_companion_history_bak_20250823`
--

DROP TABLE IF EXISTS `gauge_companion_history_bak_20250823`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gauge_companion_history_bak_20250823` (
  `id` int NOT NULL DEFAULT '0',
  `gauge_id` int NOT NULL,
  `companion_gauge_id` int NOT NULL,
  `old_companion_id` int DEFAULT NULL,
  `action` enum('paired','unpaired','replaced') NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `changed_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gauge_companion_history_bak_20250823`
--

LOCK TABLES `gauge_companion_history_bak_20250823` WRITE;
/*!40000 ALTER TABLE `gauge_companion_history_bak_20250823` DISABLE KEYS */;
INSERT INTO `gauge_companion_history_bak_20250823` (`id`, `gauge_id`, `companion_gauge_id`, `old_companion_id`, `action`, `reason`, `changed_by`, `created_at`) VALUES (1,28,35,NULL,'paired','Auto-log via trigger',7,'2025-08-23 02:35:20'),(2,35,28,34,'replaced','Auto-log via trigger',7,'2025-08-23 02:35:20'),(3,28,35,NULL,'paired','bulk pairing',7,'2025-08-23 02:35:20'),(4,35,28,34,'replaced','bulk pairing',7,'2025-08-23 02:35:20');
/*!40000 ALTER TABLE `gauge_companion_history_bak_20250823` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gauge_location_history`
--

DROP TABLE IF EXISTS `gauge_location_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gauge_location_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gauge_id` int NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `changed_by` int NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `changed_by` (`changed_by`),
  KEY `idx_gauge_location` (`gauge_id`,`changed_at`),
  KEY `idx_glh_gauge_time` (`gauge_id`,`changed_at`),
  CONSTRAINT `gauge_location_history_ibfk_1` FOREIGN KEY (`gauge_id`) REFERENCES `gauges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `gauge_location_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `core_users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gauge_location_history`
--
-- ORDER BY:  `id`

LOCK TABLES `gauge_location_history` WRITE;
/*!40000 ALTER TABLE `gauge_location_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `gauge_location_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gauge_notes`
--

DROP TABLE IF EXISTS `gauge_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gauge_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gauge_id` int NOT NULL,
  `user_id` int NOT NULL,
  `note_type` enum('general','maintenance','damage','calibration','qc') DEFAULT 'general',
  `note` text NOT NULL,
  `attachments` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_gauge_type` (`gauge_id`,`note_type`),
  CONSTRAINT `gauge_notes_ibfk_1` FOREIGN KEY (`gauge_id`) REFERENCES `gauges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `gauge_notes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gauge_notes`
--
-- ORDER BY:  `id`

LOCK TABLES `gauge_notes` WRITE;
/*!40000 ALTER TABLE `gauge_notes` DISABLE KEYS */;
INSERT INTO `gauge_notes` (`id`, `gauge_id`, `user_id`, `note_type`, `note`, `attachments`, `created_at`) VALUES (1,34,12,'calibration','Gauge passed calibration with excellent results. No issues noted.',NULL,'2025-07-20 10:42:35'),(2,39,13,'maintenance','Gauge showing slight accuracy drift. Recommended for recalibration.',NULL,'2025-08-04 10:42:35'),(3,40,7,'general','CMM software updated to latest version. Performance improved.',NULL,'2025-08-14 10:42:35'),(4,41,12,'calibration','NIST-traceable calibration completed. Certificate filed.',NULL,'2025-02-20 10:42:35');
/*!40000 ALTER TABLE `gauge_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gauge_qc_checks`
--

DROP TABLE IF EXISTS `gauge_qc_checks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gauge_qc_checks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gauge_id` int NOT NULL,
  `checked_by` int NOT NULL,
  `check_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `check_type` enum('return','periodic','damage') NOT NULL,
  `passed` tinyint(1) NOT NULL,
  `findings` json DEFAULT NULL,
  `corrective_action` text,
  `next_action` enum('available','calibration','repair','retire') DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `checked_by` (`checked_by`),
  KEY `idx_gauge_date` (`gauge_id`,`check_date`),
  CONSTRAINT `gauge_qc_checks_ibfk_1` FOREIGN KEY (`gauge_id`) REFERENCES `gauges` (`id`),
  CONSTRAINT `gauge_qc_checks_ibfk_2` FOREIGN KEY (`checked_by`) REFERENCES `core_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gauge_qc_checks`
--
-- ORDER BY:  `id`

LOCK TABLES `gauge_qc_checks` WRITE;
/*!40000 ALTER TABLE `gauge_qc_checks` DISABLE KEYS */;
/*!40000 ALTER TABLE `gauge_qc_checks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gauge_transfers`
--

DROP TABLE IF EXISTS `gauge_transfers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gauge_transfers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `gauge_id` int NOT NULL,
  `from_user_id` int DEFAULT NULL,
  `to_user_id` int DEFAULT NULL,
  `status` enum('pending','accepted','rejected','cancelled','completed') NOT NULL DEFAULT 'pending',
  `initiated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status_changed_at` timestamp NULL DEFAULT NULL,
  `status_changed_by` int DEFAULT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_gt_status_by` (`status_changed_by`),
  KEY `idx_gt_gauge_status` (`gauge_id`,`status`),
  KEY `idx_gt_from_user` (`from_user_id`),
  KEY `idx_gt_to_user` (`to_user_id`),
  CONSTRAINT `fk_gt_from_user` FOREIGN KEY (`from_user_id`) REFERENCES `core_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_gt_gauge` FOREIGN KEY (`gauge_id`) REFERENCES `gauges` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_gt_status_by` FOREIGN KEY (`status_changed_by`) REFERENCES `core_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_gt_to_user` FOREIGN KEY (`to_user_id`) REFERENCES `core_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gauge_transfers`
--
-- ORDER BY:  `id`

LOCK TABLES `gauge_transfers` WRITE;
/*!40000 ALTER TABLE `gauge_transfers` DISABLE KEYS */;
/*!40000 ALTER TABLE `gauge_transfers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gauge_unseal_requests`
--

DROP TABLE IF EXISTS `gauge_unseal_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gauge_unseal_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gauge_id` int NOT NULL,
  `requested_by` int NOT NULL,
  `requested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `status_changed_at` timestamp NULL DEFAULT NULL,
  `status_changed_by` int DEFAULT NULL,
  `reason` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `requested_by` (`requested_by`),
  KEY `status_changed_by` (`status_changed_by`),
  KEY `idx_status` (`status`),
  KEY `idx_gauge_status` (`gauge_id`,`status`),
  CONSTRAINT `gauge_unseal_requests_ibfk_1` FOREIGN KEY (`gauge_id`) REFERENCES `gauges` (`id`),
  CONSTRAINT `gauge_unseal_requests_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `core_users` (`id`),
  CONSTRAINT `gauge_unseal_requests_ibfk_3` FOREIGN KEY (`status_changed_by`) REFERENCES `core_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gauge_unseal_requests`
--
-- ORDER BY:  `id`

LOCK TABLES `gauge_unseal_requests` WRITE;
/*!40000 ALTER TABLE `gauge_unseal_requests` DISABLE KEYS */;
INSERT INTO `gauge_unseal_requests` (`id`, `gauge_id`, `requested_by`, `requested_at`, `status`, `status_changed_at`, `status_changed_by`, `reason`) VALUES (2,80,19,'2025-08-21 02:16:28','approved','2025-08-21 02:16:28',20,'Required for critical production test');
/*!40000 ALTER TABLE `gauge_unseal_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `gauges`
--

DROP TABLE IF EXISTS `gauges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `gauges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `gauge_id` varchar(20) NOT NULL,
  `custom_id` varchar(50) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `equipment_type` enum('thread_gauge','hand_tool','large_equipment','calibration_standard') NOT NULL,
  `serial_number` varchar(100) NOT NULL,
  `category_id` int DEFAULT NULL,
  `status` enum('available','checked_out','calibration_due','pending_qc','out_of_service','pending_unseal','retired') NOT NULL DEFAULT 'available',
  `companion_gauge_id` int DEFAULT NULL,
  `gauge_suffix` char(1) DEFAULT NULL,
  `is_spare` tinyint(1) DEFAULT '0',
  `is_sealed` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) DEFAULT '0',
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `gauge_id` (`gauge_id`),
  UNIQUE KEY `custom_id` (`custom_id`),
  KEY `category_id` (`category_id`),
  KEY `companion_gauge_id` (`companion_gauge_id`),
  CONSTRAINT `gauges_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `gauge_categories` (`id`),
  CONSTRAINT `gauges_ibfk_2` FOREIGN KEY (`companion_gauge_id`) REFERENCES `gauges` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `gauges`
--
-- ORDER BY:  `id`

LOCK TABLES `gauges` WRITE;
/*!40000 ALTER TABLE `gauges` DISABLE KEYS */;
/*!40000 ALTER TABLE `gauges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--
-- ORDER BY:  `id`

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` (`id`, `name`, `description`, `created_at`) VALUES (1,'gauge.manage','Create, edit, retire any gauge type','2025-08-23 16:51:38'),(2,'gauge.operate','Checkout, return, transfer gauges','2025-08-23 16:51:38'),(3,'gauge.view','View gauges and their details','2025-08-23 16:51:38'),(4,'calibration.manage','Record calibrations, manage schedules','2025-08-23 16:51:38'),(5,'user.manage','Create, edit, deactivate users','2025-08-23 16:51:38'),(6,'system.admin','System configuration and maintenance','2025-08-23 16:51:38'),(7,'audit.view','View audit logs and history','2025-08-23 16:51:38'),(8,'data.export','Export reports and data','2025-08-23 16:51:38');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rejection_reasons`
--

DROP TABLE IF EXISTS `rejection_reasons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rejection_reasons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reason_name` varchar(100) NOT NULL,
  `action_type` enum('remove_checkout','keep_checkout') NOT NULL,
  `target_status` varchar(50) DEFAULT NULL,
  `requires_notes` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rejection_reasons`
--
-- ORDER BY:  `id`

LOCK TABLES `rejection_reasons` WRITE;
/*!40000 ALTER TABLE `rejection_reasons` DISABLE KEYS */;
INSERT INTO `rejection_reasons` (`id`, `reason_name`, `action_type`, `target_status`, `requires_notes`, `is_active`, `display_order`, `created_at`, `updated_at`) VALUES (1,'Gauge damaged','remove_checkout','out_of_service',1,1,1,'2025-08-20 15:15:16','2025-08-20 15:15:16'),(2,'Wrong gauge requested','remove_checkout','available',0,1,2,'2025-08-20 15:15:16','2025-08-20 15:15:16'),(3,'Calibration expired','remove_checkout','calibration_due',0,1,3,'2025-08-20 15:15:16','2025-08-20 15:15:16'),(4,'User unavailable','keep_checkout','available',0,1,4,'2025-08-20 15:15:16','2025-08-20 15:15:16'),(5,'Equipment malfunction','remove_checkout','out_of_service',1,1,5,'2025-08-20 15:15:16','2025-08-20 15:15:16');
/*!40000 ALTER TABLE `rejection_reasons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `core_roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--
-- ORDER BY:  `role_id`,`permission_id`

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--
-- ORDER BY:  `id`

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_permissions`
--

DROP TABLE IF EXISTS `user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_permissions` (
  `user_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `granted_by` int NOT NULL,
  `granted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `user_permissions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `core_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_permissions`
--
-- ORDER BY:  `user_id`,`permission_id`

LOCK TABLES `user_permissions` WRITE;
/*!40000 ALTER TABLE `user_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_gauge_calibrations`
--

DROP TABLE IF EXISTS `v_gauge_calibrations`;
