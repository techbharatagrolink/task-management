-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 18, 2025 at 08:47 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `inhouse_management`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(255) NOT NULL,
  `module` varchar(100) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `user_id`, `action`, `module`, `details`, `ip_address`, `created_at`) VALUES
(1, 1, 'login', 'auth', 'User logged in from ::1', NULL, '2025-12-18 18:57:54'),
(2, 1, 'login', 'auth', 'User logged in from ::1', NULL, '2025-12-18 18:58:21'),
(3, 1, 'login', 'auth', 'User logged in from ::1', NULL, '2025-12-18 19:03:59'),
(4, 1, 'nda_accepted', 'nda', 'User accepted NDA', NULL, '2025-12-18 19:11:09'),
(5, 1, 'logout', 'auth', 'User logged out', NULL, '2025-12-18 19:11:17'),
(6, 1, 'logout', 'auth', 'User logged out', NULL, '2025-12-18 19:46:38');

-- --------------------------------------------------------

--
-- Table structure for table `appreciation_badges`
--

CREATE TABLE `appreciation_badges` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `badge_type` varchar(100) NOT NULL,
  `badge_description` text DEFAULT NULL,
  `awarded_by` int(11) NOT NULL,
  `awarded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `login_time` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `logout_time` timestamp NULL DEFAULT NULL,
  `total_hours` decimal(5,2) DEFAULT 0.00,
  `date` date NOT NULL,
  `status` enum('present','absent','half_day') DEFAULT 'present',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`id`, `user_id`, `login_time`, `logout_time`, `total_hours`, `date`, `status`, `created_at`) VALUES
(1, 1, '2025-12-18 19:46:38', '2025-12-18 19:46:38', 0.00, '2025-12-18', 'present', '2025-12-18 18:57:54');

-- --------------------------------------------------------

--
-- Table structure for table `digital_traffic`
--

CREATE TABLE `digital_traffic` (
  `id` int(11) NOT NULL,
  `traffic_date` date NOT NULL,
  `unique_visitors` int(11) DEFAULT 0,
  `campaign_traffic` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `instagram_posts`
--

CREATE TABLE `instagram_posts` (
  `id` int(11) NOT NULL,
  `post_date` date NOT NULL,
  `post_type` enum('post','reel','banner') NOT NULL,
  `description` text DEFAULT NULL,
  `post_link` varchar(500) DEFAULT NULL,
  `view_count` int(11) DEFAULT 0,
  `follow_count` int(11) DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leaves`
--

CREATE TABLE `leaves` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `leave_type` enum('paid','unpaid','sick','casual') DEFAULT 'casual',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `logistics_orders`
--

CREATE TABLE `logistics_orders` (
  `id` int(11) NOT NULL,
  `order_id` varchar(100) NOT NULL,
  `status` enum('confirmed','dispatched','out_for_delivery','delivered','rto') DEFAULT 'confirmed',
  `order_date` date NOT NULL,
  `dispatch_date` date DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `rto_date` date DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `logistics_stats`
--

CREATE TABLE `logistics_stats` (
  `id` int(11) NOT NULL,
  `date` date NOT NULL,
  `confirmed_count` int(11) DEFAULT 0,
  `dispatched_count` int(11) DEFAULT 0,
  `out_for_delivery_count` int(11) DEFAULT 0,
  `delivered_count` int(11) DEFAULT 0,
  `rto_count` int(11) DEFAULT 0,
  `rto_percentage` decimal(5,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketing_ads`
--

CREATE TABLE `marketing_ads` (
  `id` int(11) NOT NULL,
  `ad_date` date NOT NULL,
  `daily_roas` decimal(10,2) DEFAULT 0.00,
  `spend` decimal(10,2) DEFAULT 0.00,
  `generated_revenue` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `marketing_leads`
--

CREATE TABLE `marketing_leads` (
  `id` int(11) NOT NULL,
  `lead_date` date NOT NULL,
  `lead_count` int(11) DEFAULT 0,
  `channel` enum('facebook','instagram','google','other') DEFAULT 'other',
  `conversion_percentage` decimal(5,2) DEFAULT 0.00,
  `roas` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `monthly_performance`
--

CREATE TABLE `monthly_performance` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `month` year(4) DEFAULT NULL,
  `year` int(11) NOT NULL,
  `score` decimal(5,2) DEFAULT 0.00,
  `tasks_completed` int(11) DEFAULT 0,
  `on_time_delivery` decimal(5,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ndas`
--

CREATE TABLE `ndas` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `accepted` tinyint(1) DEFAULT 0,
  `accepted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `ndas`
--

INSERT INTO `ndas` (`id`, `user_id`, `accepted`, `accepted_at`, `created_at`) VALUES
(1, 1, 1, '2025-12-18 19:11:09', '2025-12-18 19:11:09');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(500) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subtasks`
--

CREATE TABLE `subtasks` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `title` varchar(500) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('pending','in_progress','completed') DEFAULT 'pending',
  `progress` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `title` varchar(500) NOT NULL,
  `description` text DEFAULT NULL,
  `priority` enum('low','medium','high','critical') DEFAULT 'medium',
  `status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  `deadline` date DEFAULT NULL,
  `progress` int(11) DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_assignments`
--

CREATE TABLE `task_assignments` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `assigned_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_comments`
--

CREATE TABLE `task_comments` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_ratings`
--

CREATE TABLE `task_ratings` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `rated_by` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` >= 1 and `rating` <= 5),
  `feedback` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_reports`
--

CREATE TABLE `task_reports` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `report_text` text NOT NULL,
  `working_links` text DEFAULT NULL,
  `completion_files` text DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `department` varchar(100) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `profile_photo` varchar(500) DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `salary` decimal(10,2) DEFAULT NULL,
  `access_permissions` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `department`, `designation`, `profile_photo`, `joining_date`, `salary`, `access_permissions`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Super Admin', 'admin@bharatagrolink.com', '$2b$10$NwDRbCN6LBI6H1h8GP8TGuGExfhAx3LCIW.VG0Xr.7ik.k1IqpXm2', 'Super Admin', NULL, NULL, NULL, NULL, NULL, NULL, 1, '2025-12-18 18:54:48', '2025-12-18 18:54:48');

-- --------------------------------------------------------

--
-- Table structure for table `youtube_vlogs`
--

CREATE TABLE `youtube_vlogs` (
  `id` int(11) NOT NULL,
  `vlog_date` date NOT NULL,
  `title` varchar(500) NOT NULL,
  `description` text DEFAULT NULL,
  `vlog_link` varchar(500) DEFAULT NULL,
  `view_count` int(11) DEFAULT 0,
  `subscriber_impact` int(11) DEFAULT 0,
  `created_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_module` (`module`);

--
-- Indexes for table `appreciation_badges`
--
ALTER TABLE `appreciation_badges`
  ADD PRIMARY KEY (`id`),
  ADD KEY `awarded_by` (`awarded_by`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_date` (`user_id`,`date`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_attendance_user_date` (`user_id`,`date`);

--
-- Indexes for table `digital_traffic`
--
ALTER TABLE `digital_traffic`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_traffic_date` (`traffic_date`),
  ADD KEY `idx_traffic_date` (`traffic_date`);

--
-- Indexes for table `instagram_posts`
--
ALTER TABLE `instagram_posts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_post_date` (`post_date`),
  ADD KEY `idx_post_type` (`post_type`);

--
-- Indexes for table `leaves`
--
ALTER TABLE `leaves`
  ADD PRIMARY KEY (`id`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_dates` (`start_date`,`end_date`);

--
-- Indexes for table `logistics_orders`
--
ALTER TABLE `logistics_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_id` (`order_id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_order_date` (`order_date`),
  ADD KEY `idx_logistics_status_date` (`status`,`order_date`);

--
-- Indexes for table `logistics_stats`
--
ALTER TABLE `logistics_stats`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_date` (`date`),
  ADD KEY `idx_date` (`date`);

--
-- Indexes for table `marketing_ads`
--
ALTER TABLE `marketing_ads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ad_date` (`ad_date`);

--
-- Indexes for table `marketing_leads`
--
ALTER TABLE `marketing_leads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_lead_date` (`lead_date`),
  ADD KEY `idx_channel` (`channel`),
  ADD KEY `idx_marketing_lead_date_channel` (`lead_date`,`channel`);

--
-- Indexes for table `monthly_performance`
--
ALTER TABLE `monthly_performance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_month_year` (`user_id`,`month`,`year`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_month_year` (`month`,`year`);

--
-- Indexes for table `ndas`
--
ALTER TABLE `ndas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `subtasks`
--
ALTER TABLE `subtasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `idx_deadline` (`deadline`),
  ADD KEY `idx_tasks_status_deadline` (`status`,`deadline`),
  ADD KEY `idx_tasks_created_by` (`created_by`);

--
-- Indexes for table `task_assignments`
--
ALTER TABLE `task_assignments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_task_user` (`task_id`,`user_id`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_task_assignments_user` (`user_id`);

--
-- Indexes for table `task_comments`
--
ALTER TABLE `task_comments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `task_ratings`
--
ALTER TABLE `task_ratings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_task_user_rated` (`task_id`,`user_id`,`rated_by`),
  ADD KEY `rated_by` (`rated_by`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `task_reports`
--
ALTER TABLE `task_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_department` (`department`);

--
-- Indexes for table `youtube_vlogs`
--
ALTER TABLE `youtube_vlogs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_vlog_date` (`vlog_date`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `appreciation_badges`
--
ALTER TABLE `appreciation_badges`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `digital_traffic`
--
ALTER TABLE `digital_traffic`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `instagram_posts`
--
ALTER TABLE `instagram_posts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leaves`
--
ALTER TABLE `leaves`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `logistics_orders`
--
ALTER TABLE `logistics_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `logistics_stats`
--
ALTER TABLE `logistics_stats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketing_ads`
--
ALTER TABLE `marketing_ads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `marketing_leads`
--
ALTER TABLE `marketing_leads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `monthly_performance`
--
ALTER TABLE `monthly_performance`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ndas`
--
ALTER TABLE `ndas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `sessions`
--
ALTER TABLE `sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subtasks`
--
ALTER TABLE `subtasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `task_assignments`
--
ALTER TABLE `task_assignments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `task_comments`
--
ALTER TABLE `task_comments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `task_ratings`
--
ALTER TABLE `task_ratings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `task_reports`
--
ALTER TABLE `task_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `youtube_vlogs`
--
ALTER TABLE `youtube_vlogs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `appreciation_badges`
--
ALTER TABLE `appreciation_badges`
  ADD CONSTRAINT `appreciation_badges_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appreciation_badges_ibfk_2` FOREIGN KEY (`awarded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `instagram_posts`
--
ALTER TABLE `instagram_posts`
  ADD CONSTRAINT `instagram_posts_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `leaves`
--
ALTER TABLE `leaves`
  ADD CONSTRAINT `leaves_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `leaves_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `logistics_orders`
--
ALTER TABLE `logistics_orders`
  ADD CONSTRAINT `logistics_orders_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `monthly_performance`
--
ALTER TABLE `monthly_performance`
  ADD CONSTRAINT `monthly_performance_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `ndas`
--
ALTER TABLE `ndas`
  ADD CONSTRAINT `ndas_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sessions`
--
ALTER TABLE `sessions`
  ADD CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subtasks`
--
ALTER TABLE `subtasks`
  ADD CONSTRAINT `subtasks_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_assignments`
--
ALTER TABLE `task_assignments`
  ADD CONSTRAINT `task_assignments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_assignments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_comments`
--
ALTER TABLE `task_comments`
  ADD CONSTRAINT `task_comments_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_ratings`
--
ALTER TABLE `task_ratings`
  ADD CONSTRAINT `task_ratings_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_ratings_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_ratings_ibfk_3` FOREIGN KEY (`rated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_reports`
--
ALTER TABLE `task_reports`
  ADD CONSTRAINT `task_reports_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_reports_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `youtube_vlogs`
--
ALTER TABLE `youtube_vlogs`
  ADD CONSTRAINT `youtube_vlogs_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
