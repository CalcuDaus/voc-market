import mysql from 'mysql2/promise';
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const SCHEMA_DDL_STATEMENTS: string[] = [
  `CREATE TABLE \`regions\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`code\` VARCHAR(10) NOT NULL,
    \`name\` VARCHAR(100) NOT NULL,
    \`province\` VARCHAR(100) NOT NULL,
    \`type\` ENUM('kabupaten', 'kota') NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`regions_code_unique\` (\`code\`),
    KEY \`idx_regions_province\` (\`province\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`subdistricts\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`region_id\` BIGINT UNSIGNED NOT NULL,
    \`name\` VARCHAR(120) NOT NULL,
    \`latitude\` DECIMAL(9, 6) NOT NULL,
    \`longitude\` DECIMAL(9, 6) NOT NULL,
    PRIMARY KEY (\`id\`),
    KEY \`idx_subdistricts_region\` (\`region_id\`),
    CONSTRAINT \`fk_subdistricts_region\` FOREIGN KEY (\`region_id\`) REFERENCES \`regions\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`schools\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`npsn\` VARCHAR(12) NULL,
    \`name\` VARCHAR(160) NOT NULL,
    \`slug\` VARCHAR(180) NOT NULL,
    \`region_id\` BIGINT UNSIGNED NULL,
    \`subdistrict_id\` BIGINT UNSIGNED NULL,
    \`address\` VARCHAR(255) NULL,
    \`logo\` VARCHAR(255) NULL,
    \`cover_image\` VARCHAR(255) NULL,
    \`description\` TEXT NULL,
    \`majors\` JSON NULL,
    \`has_tefa\` TINYINT(1) NOT NULL DEFAULT 0,
    \`tefa_description\` TEXT NULL,
    \`official_phone\` VARCHAR(30) NULL,
    \`website\` VARCHAR(255) NULL,
    \`is_verified\` TINYINT(1) NOT NULL DEFAULT 0,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`schools_npsn_unique\` (\`npsn\`),
    UNIQUE KEY \`schools_slug_unique\` (\`slug\`),
    KEY \`idx_schools_region\` (\`region_id\`),
    KEY \`idx_schools_subdistrict\` (\`subdistrict_id\`),
    KEY \`idx_schools_name\` (\`name\`),
    CONSTRAINT \`fk_schools_region\` FOREIGN KEY (\`region_id\`) REFERENCES \`regions\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_schools_subdistrict\` FOREIGN KEY (\`subdistrict_id\`) REFERENCES \`subdistricts\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`users\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(150) NOT NULL,
    \`username\` VARCHAR(50) NOT NULL,
    \`first_name\` VARCHAR(100) NULL,
    \`last_name\` VARCHAR(100) NULL,
    \`email\` VARCHAR(191) NOT NULL,
    \`password\` VARCHAR(255) NOT NULL,
    \`foto_profil\` VARCHAR(255) NULL,
    \`phone_number\` VARCHAR(25) NULL,
    \`user_type\` ENUM('smk', 'public', 'teacher', 'company', 'admin') NOT NULL DEFAULT 'smk',
    \`school_name\` VARCHAR(180) NULL,
    \`school_id\` BIGINT UNSIGNED NULL,
    \`region_id\` BIGINT UNSIGNED NULL,
    \`subdistrict_id\` BIGINT UNSIGNED NULL,
    \`creator_level\` INT UNSIGNED NOT NULL DEFAULT 1,
    \`is_school_admin\` TINYINT(1) NOT NULL DEFAULT 0,
    \`is_admin\` TINYINT(1) NOT NULL DEFAULT 0,
    \`nisn\` VARCHAR(30) NULL,
    \`nip\` VARCHAR(40) NULL,
    \`major\` VARCHAR(120) NULL,
    \`skills\` VARCHAR(255) NULL,
    \`business_name\` VARCHAR(150) NULL,
    \`business_type\` VARCHAR(100) NULL,
    \`company_name\` VARCHAR(160) NULL,
    \`company_sector\` VARCHAR(100) NULL,
    \`company_website\` VARCHAR(255) NULL,
    \`company_nib\` VARCHAR(30) NULL,
    \`company_verified_at\` TIMESTAMP NULL,
    \`student_status\` ENUM('active', 'final_year', 'alumni') NULL,
    \`graduation_year\` INT UNSIGNED NULL,
    \`open_to_work\` TINYINT(1) NOT NULL DEFAULT 0,
    \`open_to_work_since\` TIMESTAMP NULL,
    \`headline\` VARCHAR(140) NULL,
    \`job_preferences\` JSON NULL,
    \`stat_completed_orders\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`stat_avg_rating\` DECIMAL(3, 2) NOT NULL DEFAULT '0.00',
    \`stat_reviews_count\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`stat_certificates_count\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`talent_score\` DECIMAL(6, 2) NOT NULL DEFAULT '0.00',
    \`last_active_at\` TIMESTAMP NULL,
    \`bio\` TEXT NULL,
    \`accepting_orders\` TINYINT(1) NOT NULL DEFAULT 1,
    \`is_verified\` TINYINT(1) NOT NULL DEFAULT 0,
    \`verified_by\` BIGINT UNSIGNED NULL,
    \`verified_at\` TIMESTAMP NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`users_username_unique\` (\`username\`),
    UNIQUE KEY \`users_email_unique\` (\`email\`),
    KEY \`idx_users_school\` (\`school_name\`),
    KEY \`idx_users_school_id\` (\`school_id\`),
    KEY \`idx_users_region_id\` (\`region_id\`),
    KEY \`idx_users_subdistrict_id\` (\`subdistrict_id\`),
    KEY \`idx_users_type\` (\`user_type\`),
    KEY \`idx_users_talent\` (\`user_type\`, \`open_to_work\`),
    CONSTRAINT \`fk_users_school\` FOREIGN KEY (\`school_id\`) REFERENCES \`schools\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_users_region\` FOREIGN KEY (\`region_id\`) REFERENCES \`regions\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_users_subdistrict\` FOREIGN KEY (\`subdistrict_id\`) REFERENCES \`subdistricts\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`sessions\` (
    \`id\` VARCHAR(64) NOT NULL,
    \`user_id\` BIGINT UNSIGNED NOT NULL,
    \`expires_at\` TIMESTAMP NOT NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_sessions_user\` (\`user_id\`),
    CONSTRAINT \`fk_sessions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`categories\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(120) NOT NULL,
    \`slug\` VARCHAR(130) NOT NULL,
    \`icon\` VARCHAR(40) NOT NULL DEFAULT 'sparkles',
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`categories_name_unique\` (\`name\`),
    UNIQUE KEY \`categories_slug_unique\` (\`slug\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`products\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`user_id\` BIGINT UNSIGNED NOT NULL,
    \`school_id\` BIGINT UNSIGNED NULL,
    \`subdistrict_id\` BIGINT UNSIGNED NULL,
    \`type\` ENUM('product', 'service', 'portfolio') NOT NULL DEFAULT 'product',
    \`name\` VARCHAR(200) NOT NULL,
    \`barcode\` VARCHAR(40) NOT NULL,
    \`category_id\` BIGINT UNSIGNED NULL,
    \`description\` TEXT NOT NULL,
    \`image\` VARCHAR(255) NOT NULL,
    \`og_image\` VARCHAR(255) NULL,
    \`cost_price\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    \`cost_breakdown\` JSON NULL,
    \`estimated_hours\` DECIMAL(5, 1) NULL,
    \`price\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    \`price_min\` BIGINT UNSIGNED NULL,
    \`price_max\` BIGINT UNSIGNED NULL,
    \`service_area_type\` ENUM('onsite', 'workshop', 'delivery', 'digital') NOT NULL DEFAULT 'delivery',
    \`max_distance_km\` INT UNSIGNED NULL,
    \`stock\` INT NOT NULL DEFAULT 1,
    \`project_link\` VARCHAR(255) NULL,
    \`likes_count\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`views_count\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`shares_count\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`is_verified_by_teacher\` TINYINT(1) NOT NULL DEFAULT 0,
    \`verified_by\` BIGINT UNSIGNED NULL,
    \`teacher_note\` VARCHAR(255) NULL,
    \`is_tefa\` TINYINT(1) NOT NULL DEFAULT 0,
    \`tefa_unit\` VARCHAR(120) NULL,
    \`status\` ENUM('published', 'archived') NOT NULL DEFAULT 'published',
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`products_barcode_unique\` (\`barcode\`),
    KEY \`idx_products_catalog\` (\`status\`, \`type\`, \`category_id\`),
    KEY \`idx_products_user\` (\`user_id\`),
    KEY \`idx_products_school\` (\`school_id\`, \`status\`),
    KEY \`idx_products_subdistrict\` (\`subdistrict_id\`),
    CONSTRAINT \`fk_products_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_products_school\` FOREIGN KEY (\`school_id\`) REFERENCES \`schools\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_products_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_products_subdistrict\` FOREIGN KEY (\`subdistrict_id\`) REFERENCES \`subdistricts\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`post_likes\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`product_id\` BIGINT UNSIGNED NOT NULL,
    \`actor_key\` VARCHAR(80) NOT NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uq_post_likes_actor\` (\`product_id\`, \`actor_key\`),
    CONSTRAINT \`fk_post_likes_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`job_requests\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`code\` VARCHAR(28) NOT NULL,
    \`user_id\` BIGINT UNSIGNED NOT NULL,
    \`category_id\` BIGINT UNSIGNED NULL,
    \`title\` VARCHAR(140) NOT NULL,
    \`description\` TEXT NOT NULL,
    \`image\` VARCHAR(255) NULL,
    \`budget_type\` ENUM('fixed', 'range', 'negotiable') NOT NULL DEFAULT 'negotiable',
    \`budget_min\` BIGINT UNSIGNED NULL,
    \`budget_max\` BIGINT UNSIGNED NULL,
    \`work_mode\` ENUM('onsite', 'remote', 'dropoff') NOT NULL DEFAULT 'remote',
    \`region_id\` BIGINT UNSIGNED NULL,
    \`location_detail\` VARCHAR(255) NULL,
    \`full_address\` VARCHAR(255) NULL,
    \`needed_by\` TIMESTAMP NULL,
    \`max_proposals\` INT UNSIGNED NOT NULL DEFAULT 10,
    \`status\` ENUM('open', 'assigned', 'completed', 'closed', 'expired', 'hidden') NOT NULL DEFAULT 'open',
    \`assigned_proposal_id\` BIGINT UNSIGNED NULL,
    \`proposals_count\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`views_count\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`expires_at\` TIMESTAMP NOT NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`job_requests_code_unique\` (\`code\`),
    KEY \`idx_job_requests_status\` (\`status\`, \`category_id\`, \`region_id\`),
    KEY \`idx_job_requests_user\` (\`user_id\`),
    CONSTRAINT \`fk_job_requests_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_job_requests_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_job_requests_region\` FOREIGN KEY (\`region_id\`) REFERENCES \`regions\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`job_proposals\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`job_request_id\` BIGINT UNSIGNED NOT NULL,
    \`user_id\` BIGINT UNSIGNED NOT NULL,
    \`message\` TEXT NOT NULL,
    \`offered_price\` BIGINT UNSIGNED NOT NULL,
    \`estimated_days\` INT UNSIGNED NOT NULL,
    \`portfolio_product_id\` BIGINT UNSIGNED NULL,
    \`status\` ENUM('pending', 'accepted', 'rejected', 'withdrawn') NOT NULL DEFAULT 'pending',
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uq_job_proposals_request_user\` (\`job_request_id\`, \`user_id\`),
    KEY \`idx_job_proposals_user\` (\`user_id\`),
    CONSTRAINT \`fk_job_proposals_request\` FOREIGN KEY (\`job_request_id\`) REFERENCES \`job_requests\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_job_proposals_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_job_proposals_portfolio\` FOREIGN KEY (\`portfolio_product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`orders\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`order_code\` VARCHAR(32) NOT NULL,
    \`source\` ENUM('product', 'job_request') NOT NULL DEFAULT 'product',
    \`product_id\` BIGINT UNSIGNED NULL,
    \`job_request_id\` BIGINT UNSIGNED NULL,
    \`seller_id\` BIGINT UNSIGNED NOT NULL,
    \`buyer_id\` BIGINT UNSIGNED NULL,
    \`buyer_name\` VARCHAR(120) NOT NULL,
    \`buyer_phone\` VARCHAR(30) NOT NULL,
    \`buyer_address\` VARCHAR(255) NULL,
    \`buyer_notes\` TEXT NULL,
    \`quantity\` INT UNSIGNED NOT NULL DEFAULT 1,
    \`agreed_price\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    \`unit_cost_snapshot\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    \`status\` ENUM('requested', 'accepted', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'requested',
    \`progress_note\` TEXT NULL,
    \`proof_image\` VARCHAR(255) NULL,
    \`review_token\` VARCHAR(64) NOT NULL,
    \`accepted_at\` TIMESTAMP NULL,
    \`completed_at\` TIMESTAMP NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`orders_order_code_unique\` (\`order_code\`),
    UNIQUE KEY \`orders_review_token_unique\` (\`review_token\`),
    KEY \`idx_orders_seller_status\` (\`seller_id\`, \`status\`),
    KEY \`idx_orders_buyer\` (\`buyer_id\`),
    KEY \`idx_orders_product\` (\`product_id\`),
    KEY \`idx_orders_job_request\` (\`job_request_id\`),
    CONSTRAINT \`fk_orders_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_orders_job_request\` FOREIGN KEY (\`job_request_id\`) REFERENCES \`job_requests\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_orders_seller\` FOREIGN KEY (\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_orders_buyer\` FOREIGN KEY (\`buyer_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`reviews\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`order_id\` BIGINT UNSIGNED NOT NULL,
    \`product_id\` BIGINT UNSIGNED NULL,
    \`seller_id\` BIGINT UNSIGNED NOT NULL,
    \`reviewer_name\` VARCHAR(120) NOT NULL,
    \`rating\` INT UNSIGNED NOT NULL,
    \`comment\` TEXT NOT NULL,
    \`endorsement_tags\` VARCHAR(255) NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`reviews_order_id_unique\` (\`order_id\`),
    KEY \`idx_reviews_seller\` (\`seller_id\`),
    KEY \`idx_reviews_product\` (\`product_id\`),
    CONSTRAINT \`fk_reviews_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_reviews_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_reviews_seller\` FOREIGN KEY (\`seller_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`hiring_invitations\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`company_id\` BIGINT UNSIGNED NOT NULL,
    \`student_id\` BIGINT UNSIGNED NOT NULL,
    \`type\` ENUM('pkl', 'magang', 'kerja', 'freelance') NOT NULL,
    \`position\` VARCHAR(120) NOT NULL,
    \`message\` TEXT NOT NULL,
    \`region_id\` BIGINT UNSIGNED NULL,
    \`salary_info\` VARCHAR(120) NULL,
    \`status\` ENUM('pending', 'accepted', 'declined', 'expired', 'withdrawn') NOT NULL DEFAULT 'pending',
    \`decline_reason\` VARCHAR(255) NULL,
    \`responded_at\` TIMESTAMP NULL,
    \`expires_at\` TIMESTAMP NOT NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_invitations_student\` (\`student_id\`, \`status\`),
    KEY \`idx_invitations_company\` (\`company_id\`, \`status\`),
    CONSTRAINT \`fk_invitations_company\` FOREIGN KEY (\`company_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_invitations_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_invitations_region\` FOREIGN KEY (\`region_id\`) REFERENCES \`regions\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`saved_talents\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`company_id\` BIGINT UNSIGNED NOT NULL,
    \`student_id\` BIGINT UNSIGNED NOT NULL,
    \`note\` VARCHAR(255) NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uq_saved_talents_pair\` (\`company_id\`, \`student_id\`),
    CONSTRAINT \`fk_saved_talents_company\` FOREIGN KEY (\`company_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_saved_talents_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`challenges\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`company_id\` BIGINT UNSIGNED NOT NULL,
    \`slug\` VARCHAR(180) NOT NULL,
    \`title\` VARCHAR(160) NOT NULL,
    \`summary\` VARCHAR(255) NOT NULL,
    \`brief\` TEXT NOT NULL,
    \`requirements\` TEXT NOT NULL,
    \`deliverables\` TEXT NOT NULL,
    \`judging_criteria\` JSON NOT NULL,
    \`category_id\` BIGINT UNSIGNED NULL,
    \`target_majors\` JSON NULL,
    \`cover_image\` VARCHAR(255) NULL,
    \`reward_types\` JSON NOT NULL,
    \`prize_description\` TEXT NOT NULL,
    \`winner_slots\` INT UNSIGNED NOT NULL DEFAULT 3,
    \`submission_deadline\` TIMESTAMP NOT NULL,
    \`announcement_date\` TIMESTAMP NOT NULL,
    \`ip_policy\` ENUM('winner_only', 'none') NOT NULL DEFAULT 'winner_only',
    \`status\` ENUM('draft', 'pending_review', 'open', 'judging', 'finished', 'rejected', 'cancelled') NOT NULL DEFAULT 'draft',
    \`rejection_reason\` VARCHAR(255) NULL,
    \`submissions_count\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`views_count\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`challenges_slug_unique\` (\`slug\`),
    KEY \`idx_challenges_status\` (\`status\`, \`category_id\`),
    KEY \`idx_challenges_company\` (\`company_id\`),
    CONSTRAINT \`fk_challenges_company\` FOREIGN KEY (\`company_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_challenges_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`challenge_submissions\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`challenge_id\` BIGINT UNSIGNED NOT NULL,
    \`user_id\` BIGINT UNSIGNED NOT NULL,
    \`title\` VARCHAR(160) NOT NULL,
    \`description\` TEXT NOT NULL,
    \`images\` JSON NOT NULL,
    \`external_link\` VARCHAR(255) NULL,
    \`is_public_after_finish\` TINYINT(1) NOT NULL DEFAULT 1,
    \`status\` ENUM('submitted', 'shortlisted', 'winner', 'runner_up', 'honorable', 'participant', 'disqualified') NOT NULL DEFAULT 'submitted',
    \`rank\` INT UNSIGNED NULL,
    \`scores\` JSON NULL,
    \`total_score\` DECIMAL(5, 2) NULL,
    \`feedback\` TEXT NULL,
    \`submitted_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uq_challenge_submissions_user\` (\`challenge_id\`, \`user_id\`),
    KEY \`idx_challenge_submissions_user\` (\`user_id\`),
    CONSTRAINT \`fk_submissions_challenge\` FOREIGN KEY (\`challenge_id\`) REFERENCES \`challenges\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_submissions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`certificates\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`code\` VARCHAR(24) NOT NULL,
    \`user_id\` BIGINT UNSIGNED NOT NULL,
    \`challenge_id\` BIGINT UNSIGNED NULL,
    \`submission_id\` BIGINT UNSIGNED NULL,
    \`type\` ENUM('winner', 'runner_up', 'finalist', 'participant') NOT NULL,
    \`title\` VARCHAR(200) NOT NULL,
    \`issuer_name\` VARCHAR(160) NOT NULL,
    \`issued_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`revoked_at\` TIMESTAMP NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`certificates_code_unique\` (\`code\`),
    KEY \`idx_certificates_user\` (\`user_id\`),
    KEY \`idx_certificates_challenge\` (\`challenge_id\`),
    CONSTRAINT \`fk_certificates_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_certificates_challenge\` FOREIGN KEY (\`challenge_id\`) REFERENCES \`challenges\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_certificates_submission\` FOREIGN KEY (\`submission_id\`) REFERENCES \`challenge_submissions\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`notifications\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`user_id\` BIGINT UNSIGNED NOT NULL,
    \`type\` VARCHAR(50) NOT NULL,
    \`title\` VARCHAR(160) NOT NULL,
    \`body\` VARCHAR(255) NOT NULL,
    \`action_url\` VARCHAR(255) NULL,
    \`read_at\` TIMESTAMP NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_notifications_user_read\` (\`user_id\`, \`read_at\`),
    CONSTRAINT \`fk_notifications_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`reports\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`reporter_id\` BIGINT UNSIGNED NULL,
    \`target_type\` ENUM('post', 'request', 'challenge', 'user') NOT NULL,
    \`target_id\` BIGINT UNSIGNED NOT NULL,
    \`reason\` ENUM('penipuan', 'konten_tidak_pantas', 'eksploitasi', 'spam', 'lainnya') NOT NULL,
    \`details\` TEXT NULL,
    \`status\` ENUM('open', 'reviewed', 'actioned', 'dismissed') NOT NULL DEFAULT 'open',
    \`handled_by\` BIGINT UNSIGNED NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_reports_status\` (\`status\`),
    CONSTRAINT \`fk_reports_reporter\` FOREIGN KEY (\`reporter_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_reports_handler\` FOREIGN KEY (\`handled_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`badges\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`slug\` VARCHAR(50) NOT NULL,
    \`name\` VARCHAR(100) NOT NULL,
    \`description\` VARCHAR(255) NOT NULL,
    \`icon\` VARCHAR(40) NOT NULL,
    \`color\` ENUM('emerald', 'blue', 'amber', 'violet') NOT NULL DEFAULT 'blue',
    \`category\` ENUM('work_ethic', 'entrepreneurship', 'quality', 'school') NOT NULL,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`badges_slug_unique\` (\`slug\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`user_badges\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`user_id\` BIGINT UNSIGNED NOT NULL,
    \`badge_id\` BIGINT UNSIGNED NOT NULL,
    \`context_note\` VARCHAR(160) NULL,
    \`awarded_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uq_user_badges_user_badge\` (\`user_id\`, \`badge_id\`),
    CONSTRAINT \`fk_user_badges_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    CONSTRAINT \`fk_user_badges_badge\` FOREIGN KEY (\`badge_id\`) REFERENCES \`badges\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`product_daily_stats\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`product_id\` BIGINT UNSIGNED NOT NULL,
    \`stat_date\` VARCHAR(10) NOT NULL,
    \`views\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`shares\` INT UNSIGNED NOT NULL DEFAULT 0,
    \`orders_created\` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`uq_product_daily_stats_prod_date\` (\`product_id\`, \`stat_date\`),
    KEY \`idx_product_daily_stats_date\` (\`stat_date\`),
    CONSTRAINT \`fk_product_daily_stats_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`project_details\` (
    \`product_id\` BIGINT UNSIGNED NOT NULL,
    \`tagline\` VARCHAR(255) NULL,
    \`major\` VARCHAR(80) NULL,
    \`problem\` TEXT NULL,
    \`process\` TEXT NULL,
    \`result\` TEXT NULL,
    \`role\` VARCHAR(160) NULL,
    \`tools\` JSON NULL,
    \`team_members\` JSON NULL,
    \`demo_url\` VARCHAR(500) NULL,
    \`repo_url\` VARCHAR(500) NULL,
    \`model_url\` VARCHAR(500) NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`product_id\`),
    KEY \`idx_project_details_major\` (\`major\`),
    CONSTRAINT \`fk_project_details_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

  `CREATE TABLE \`project_media\` (
    \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    \`product_id\` BIGINT UNSIGNED NOT NULL,
    \`kind\` ENUM('image', 'video', 'model3d', 'lottie', 'embed', 'pdf') NOT NULL DEFAULT 'image',
    \`url\` VARCHAR(500) NOT NULL,
    \`poster_url\` VARCHAR(500) NULL,
    \`title\` VARCHAR(200) NULL,
    \`caption\` TEXT NULL,
    \`sort_order\` INT NOT NULL DEFAULT 0,
    \`meta\` JSON NULL,
    \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`idx_project_media_product\` (\`product_id\`, \`sort_order\`),
    CONSTRAINT \`fk_project_media_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
];

export async function rebuildDatabaseFromUri(dbUri: string): Promise<void> {
  const parsed = new URL(dbUri);
  const dbName = parsed.pathname.replace(/^\//, '');
  const adminConn = await mysql.createConnection({
    host: parsed.hostname || '127.0.0.1',
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username || 'root'),
    password: decodeURIComponent(parsed.password || '')
  });

  try {
    await adminConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await adminConn.query(`USE \`${dbName}\`;`);
    await adminConn.query('SET FOREIGN_KEY_CHECKS = 0;');

    const [rows] = await adminConn.query<mysql.RowDataPacket[]>('SHOW TABLES;');
    for (const row of rows) {
      const tableName = Object.values(row)[0] as string;
      if (tableName) {
        await adminConn.query(`DROP TABLE IF EXISTS \`${tableName}\`;`);
      }
    }

    for (const stmt of SCHEMA_DDL_STATEMENTS) {
      await adminConn.query(stmt);
    }

    await adminConn.query('SET FOREIGN_KEY_CHECKS = 1;');
  } finally {
    await adminConn.end();
  }
}

async function copyLegacyAssets(): Promise<void> {
  const root = process.cwd();
  await mkdir(join(root, 'public', 'images'), { recursive: true });
  await mkdir(join(root, 'public', 'uploads', 'avatars'), { recursive: true });
  await mkdir(join(root, 'public', 'uploads', 'posts'), { recursive: true });
  await mkdir(join(root, 'public', 'uploads', 'proofs'), { recursive: true });
  await mkdir(join(root, 'public', 'uploads', 'schools'), { recursive: true });
  await mkdir(join(root, 'public', 'uploads', 'requests'), { recursive: true });
  await mkdir(join(root, 'public', 'uploads', 'challenges'), { recursive: true });
  await mkdir(join(root, 'public', 'uploads', 'og'), { recursive: true });

  const mappings: [string, string][] = [
    [
      join(root, '_legacy_laravel', 'public', 'voc-logo.png'),
      join(root, 'public', 'images', 'voc-logo.png')
    ],
    [
      join(root, '_legacy_laravel', 'public', 'voc-market', 'dist', 'image', 'voc-market-logo-login.png'),
      join(root, 'public', 'images', 'voc-market-logo-login.png')
    ],
    [
      join(root, '_legacy_laravel', 'public', 'voc-market', 'dist', 'image', 'voc-market-logo-mobile.png'),
      join(root, 'public', 'images', 'voc-market-logo-mobile.png')
    ]
  ];

  for (const [src, dest] of mappings) {
    if (existsSync(src)) {
      await copyFile(src, dest);
    }
  }
}

if (import.meta.main) {
  const devUrl = process.env.DATABASE_URL || 'mysql://root@127.0.0.1:3306/voc_market';
  const testUrl = process.env.TEST_DATABASE_URL || 'mysql://root@127.0.0.1:3306/voc_market_test';

  console.log('Resetting development database (voc_market)...');
  await rebuildDatabaseFromUri(devUrl);

  console.log('Resetting test database (voc_market_test)...');
  await rebuildDatabaseFromUri(testUrl);

  await copyLegacyAssets();
  console.log('Databases voc_market & voc_market_test are clean and ready!');
}
