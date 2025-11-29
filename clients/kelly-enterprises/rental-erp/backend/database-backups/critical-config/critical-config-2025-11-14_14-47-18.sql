-- Critical Configuration Backup
-- Created: 2025-11-14T14:47:18.769Z
-- Database: fai_db_sandbox
-- Tables: gauge_categories, gauge_id_config, rejection_reasons
-- Purpose: Essential configuration data for gauge system
--
-- RESTORE INSTRUCTIONS:
-- 1. Review the SQL file to ensure data is correct
-- 2. Run: mysql -h host.docker.internal -P 3307 -u root -p fai_db_sandbox < critical-config-2025-11-14_14-47-18.sql
-- 3. Or use: docker exec fireproof-erp-modular-backend-dev node backend/scripts/restore-critical-config.js critical-config-2025-11-14_14-47-18.sql

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';


-- ============================================
-- Table: gauge_categories (20 rows)
-- ============================================
DELETE FROM gauge_categories;
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (41,'thread_gauge',1,'Standard','SP',NULL,365,18,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (42,'thread_gauge',2,'Metric','MP',NULL,365,13,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (43,'thread_gauge',3,'ACME','AC',NULL,365,13,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (44,'thread_gauge',4,'NPT','NPT',NULL,365,15,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (45,'thread_gauge',5,'STI','ST',NULL,365,8,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (46,'thread_gauge',6,'Spiralock','SL',NULL,365,19,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (47,'hand_tool',1,'Caliper','CA',NULL,365,20,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (48,'hand_tool',2,'Micrometer','MI',NULL,365,15,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (49,'hand_tool',3,'Depth Gauge','DG',NULL,365,14,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (50,'hand_tool',4,'Bore Gauge','BG',NULL,365,15,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (51,'large_equipment',1,'CMM','CMM',NULL,365,3,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (52,'large_equipment',2,'Optical Comparator','OC',NULL,365,10,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (53,'large_equipment',3,'Height Gauge','HG',NULL,365,9,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (54,'large_equipment',4,'Surface Plate','SPL',NULL,365,8,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (55,'large_equipment',5,'Hardness Tester','HT',NULL,365,5,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (56,'large_equipment',6,'Force/Torque Tester','FT',NULL,365,6,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (57,'calibration_standard',1,'Gauge Block','GB',NULL,365,8,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (58,'calibration_standard',2,'Master Ring','MRS',NULL,365,9,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (59,'calibration_standard',3,'Master Plug','MPS',NULL,365,6,1,'2025-09-17 20:31:57.000');
INSERT INTO gauge_categories (id,equipment_type,display_order,name,prefix,description,default_calibration_days,next_number,is_active,created_at) VALUES (60,'calibration_standard',4,'Reference Standard','RS',NULL,365,6,1,'2025-09-17 20:31:57.000');

-- ============================================
-- Table: gauge_id_config (25 rows)
-- ============================================
DELETE FROM gauge_id_config;
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (7,41,'plug','SP',1,0,NULL,'2025-09-17 20:31:57.000','2025-11-07 01:45:29.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (8,41,'ring','SR',8,0,NULL,'2025-09-17 20:31:57.000','2025-11-04 11:44:44.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (9,42,'plug','MP',0,0,NULL,'2025-09-17 20:31:57.000','2025-09-17 20:31:57.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (10,42,'ring','MR',0,0,NULL,'2025-09-17 20:31:57.000','2025-09-17 20:31:57.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (11,44,NULL,'NPT',0,0,NULL,'2025-09-17 20:31:57.000','2025-09-17 20:31:57.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (12,43,'plug','AC',1,0,NULL,'2025-09-17 20:31:57.000','2025-11-05 20:19:59.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (13,43,'ring','AR',0,0,NULL,'2025-09-17 20:31:57.000','2025-09-17 20:31:57.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (14,45,'plug','ST',0,0,NULL,'2025-09-17 20:31:57.000','2025-09-17 20:31:57.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (15,45,'ring','STR',0,0,NULL,'2025-09-17 20:31:57.000','2025-09-17 20:31:57.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (16,46,'plug','SL',0,0,NULL,'2025-09-17 20:31:57.000','2025-09-17 20:31:57.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (17,46,'ring','SLR',0,0,NULL,'2025-09-17 20:31:57.000','2025-09-17 20:31:57.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (18,47,'plug','CA',7008,0,NULL,'2025-09-17 20:31:57.000','2025-10-29 00:06:42.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (19,48,NULL,'MI',1,0,NULL,'2025-09-17 20:31:57.000','2025-11-06 22:20:40.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (20,49,NULL,'DG',1,0,NULL,'2025-09-17 20:31:57.000','2025-11-07 18:42:02.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (21,50,NULL,'BG',1,0,NULL,'2025-09-17 20:31:57.000','2025-11-07 11:16:16.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (22,51,NULL,'CMM',0,0,NULL,'2025-09-17 20:31:57.000','2025-09-17 20:31:57.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (23,52,NULL,'OC',1,0,NULL,'2025-09-17 20:31:57.000','2025-11-07 13:15:49.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (24,53,NULL,'HG',0,0,NULL,'2025-09-17 20:31:57.000','2025-09-17 20:31:57.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (25,54,NULL,'SPL',1,0,NULL,'2025-09-17 20:31:57.000','2025-11-07 13:14:30.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (26,55,NULL,'HT',0,0,NULL,'2025-09-17 20:31:57.000','2025-09-17 20:31:57.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (27,56,NULL,'FT',0,0,NULL,'2025-09-17 20:31:57.000','2025-09-17 20:31:57.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (28,57,NULL,'GB',1,0,NULL,'2025-09-17 20:31:57.000','2025-11-07 13:31:21.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (29,58,NULL,'MRS',1,0,NULL,'2025-09-17 20:31:57.000','2025-11-07 13:38:13.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (30,59,NULL,'MPS',1,0,NULL,'2025-09-17 20:31:57.000','2025-11-07 13:34:05.000');
INSERT INTO gauge_id_config (id,category_id,gauge_type,prefix,current_sequence,is_locked,locked_at,created_at,updated_at) VALUES (31,60,NULL,'RS',1,0,NULL,'2025-09-17 20:31:57.000','2025-11-07 13:21:30.000');

-- ============================================
-- Table: rejection_reasons (9 rows)
-- ============================================
DELETE FROM rejection_reasons;
INSERT INTO rejection_reasons (id,reason_name,action_type,target_status,requires_notes,is_active,display_order,created_at,updated_at) VALUES (1,'Gauge damaged','remove_checkout','out_of_service',0,1,1,'2025-09-09 17:32:27.000','2025-09-09 17:32:27.000');
INSERT INTO rejection_reasons (id,reason_name,action_type,target_status,requires_notes,is_active,display_order,created_at,updated_at) VALUES (2,'Lost or missing','remove_checkout','lost',0,1,2,'2025-09-09 17:32:27.000','2025-09-09 17:32:27.000');
INSERT INTO rejection_reasons (id,reason_name,action_type,target_status,requires_notes,is_active,display_order,created_at,updated_at) VALUES (3,'Calibration expired','keep_checkout','calibration_due',0,1,3,'2025-09-09 17:32:27.000','2025-09-09 17:32:27.000');
INSERT INTO rejection_reasons (id,reason_name,action_type,target_status,requires_notes,is_active,display_order,created_at,updated_at) VALUES (4,'Incorrect tolerance','remove_checkout','out_of_service',0,1,4,'2025-09-09 17:32:27.000','2025-09-09 17:32:27.000');
INSERT INTO rejection_reasons (id,reason_name,action_type,target_status,requires_notes,is_active,display_order,created_at,updated_at) VALUES (5,'Equipment malfunction','remove_checkout','out_of_service',0,1,5,'2025-09-09 17:32:27.000','2025-09-09 17:32:27.000');
INSERT INTO rejection_reasons (id,reason_name,action_type,target_status,requires_notes,is_active,display_order,created_at,updated_at) VALUES (6,'Wrong gauge returned','remove_checkout','available',0,1,6,'2025-09-09 17:32:27.000','2025-09-09 17:32:27.000');
INSERT INTO rejection_reasons (id,reason_name,action_type,target_status,requires_notes,is_active,display_order,created_at,updated_at) VALUES (7,'Gauge damaged during inspection','remove_checkout','out_of_service',0,1,7,'2025-09-09 17:32:27.000','2025-09-09 17:32:27.000');
INSERT INTO rejection_reasons (id,reason_name,action_type,target_status,requires_notes,is_active,display_order,created_at,updated_at) VALUES (8,'Out of tolerance beyond adjustment','remove_checkout','calibration_due',0,1,8,'2025-09-09 17:32:27.000','2025-09-09 17:32:27.000');
INSERT INTO rejection_reasons (id,reason_name,action_type,target_status,requires_notes,is_active,display_order,created_at,updated_at) VALUES (9,'Missing identification markings','remove_checkout','out_of_service',0,1,9,'2025-09-09 17:32:27.000','2025-09-09 17:32:27.000');

SET FOREIGN_KEY_CHECKS=1;

-- Backup completed: 2025-11-14T14:47:18.808Z
