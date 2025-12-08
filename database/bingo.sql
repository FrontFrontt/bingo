-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 06, 2025 at 12:02 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 7.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `bingo`
--

-- --------------------------------------------------------

--
-- Table structure for table `gameround`
--

CREATE TABLE `gameround` (
  `round_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `play_time` datetime DEFAULT NULL,
  `ticket_price` decimal(10,2) NOT NULL,
  `prize_amount` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `winning_number` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `gameround`
--

INSERT INTO `gameround` (`round_id`, `title`, `start_time`, `end_time`, `play_time`, `ticket_price`, `prize_amount`, `is_active`, `winning_number`, `created_at`) VALUES
(1, 'ทดสอบรอบที่ 1', '2025-11-16 01:00:00', '2025-11-16 01:25:00', NULL, 10.00, 1000.00, 1, NULL, '2025-11-14 17:09:45'),
(2, 'ทดสอบ เช้า 22', '2025-11-22 09:00:00', '2025-11-22 10:00:00', NULL, 30.00, 300.00, 1, NULL, '2025-11-20 07:07:20'),
(3, 'เทสรอบ 3', '2025-11-01 00:00:00', '2025-11-30 00:00:00', NULL, 100.00, 1000.00, 1, NULL, '2025-11-26 09:19:21'),
(4, 'เทสรอบ 4', '2025-11-15 00:00:00', '2025-12-15 00:00:00', NULL, 200.00, 2000.00, 1, NULL, '2025-11-26 17:33:14'),
(5, 'เทสเกม01', '2025-12-05 00:00:00', '2025-12-05 23:59:00', NULL, 10.00, 1000.00, 1, NULL, '2025-12-06 08:52:02'),
(6, 'เทสเกม02', '2025-12-01 16:05:00', '2025-12-05 16:05:00', '2025-12-06 16:20:00', 10.00, 1000.00, 1, NULL, '2025-12-06 09:05:47'),
(7, 'เทสเกม03', '2025-12-01 16:06:00', '2025-12-06 16:30:00', '2025-12-06 16:50:00', 10.00, 1000.00, 1, NULL, '2025-12-06 09:06:32'),
(8, 'เทสเกม04', '2025-12-01 16:20:00', '2025-12-06 16:35:00', '2025-12-06 16:34:00', 10.00, 1000.00, 1, NULL, '2025-12-06 09:21:19'),
(9, 'เทส05', '2025-12-01 16:36:00', '2025-12-06 16:37:00', '2025-12-05 16:39:00', 10.00, 1000.00, 1, NULL, '2025-12-06 09:36:34'),
(10, 'เทสเกม06', '2025-12-01 17:19:00', '2025-12-06 17:21:00', '2025-12-06 17:25:00', 10.00, 1000.00, 1, NULL, '2025-12-06 10:20:03'),
(11, 'เทสเกม07', '2025-12-01 17:33:00', '2025-12-06 17:47:00', '2025-12-06 17:50:00', 100.00, 1000.00, 1, NULL, '2025-12-06 10:34:10');

-- --------------------------------------------------------

--
-- Table structure for table `gamerounds`
--

CREATE TABLE `gamerounds` (
  `round_id` int(11) NOT NULL,
  `round_name` varchar(255) NOT NULL,
  `bet_amount` decimal(10,2) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` enum('pending','active','completed','cancelled') NOT NULL DEFAULT 'pending',
  `winning_numbers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`winning_numbers`)),
  `total_winnings_paid` decimal(10,2) DEFAULT 0.00,
  `total_bets_collected` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `transaction_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `round_id` int(11) DEFAULT NULL,
  `transaction_type` enum('deposit','withdrawal','bet','win') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `proof_image_url` varchar(255) DEFAULT NULL,
  `admin_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `approved_at` timestamp NULL DEFAULT NULL,
  `processed_by` int(11) DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`transaction_id`, `user_id`, `round_id`, `transaction_type`, `amount`, `status`, `proof_image_url`, `admin_notes`, `created_at`, `approved_at`, `processed_by`, `processed_at`) VALUES
(1, 1, 3, 'deposit', 100.00, 'approved', '/uploads/1-1764149949481-687050725.jpg', NULL, '2025-11-26 09:39:09', NULL, 2, '2025-11-26 16:43:30'),
(4, 1, 3, 'bet', 100.00, 'approved', NULL, NULL, '2025-11-26 10:03:50', NULL, NULL, NULL),
(5, 3, 3, 'deposit', 200.00, 'approved', '/uploads/3-1764152677617-942855729.jfif', NULL, '2025-11-26 10:24:37', NULL, 2, '2025-11-26 17:25:02'),
(6, 3, 3, 'bet', 100.00, 'approved', NULL, NULL, '2025-11-26 10:26:01', NULL, NULL, NULL),
(7, 1, 4, 'deposit', 200.00, 'approved', '/uploads/1-1765003110771-893578796.jpg', NULL, '2025-12-06 06:38:30', NULL, 2, '2025-12-06 13:42:20'),
(8, 1, 4, 'bet', 200.00, 'approved', NULL, NULL, '2025-12-06 06:42:49', NULL, NULL, NULL),
(9, 5, 4, 'deposit', 200.00, 'approved', '/uploads/5-1765004457953-80753493.jfif', NULL, '2025-12-06 07:00:57', NULL, 2, '2025-12-06 14:04:58'),
(10, 5, 4, 'bet', 200.00, 'approved', NULL, NULL, '2025-12-06 07:05:25', NULL, NULL, NULL),
(11, 5, 7, 'deposit', 10.00, 'approved', '/uploads/5-1765012604778-18136713.png', NULL, '2025-12-06 09:16:44', NULL, 2, '2025-12-06 16:17:06'),
(19, 5, 8, 'bet', 10.00, 'approved', NULL, NULL, '2025-12-06 09:24:08', NULL, NULL, NULL),
(20, 5, 7, 'deposit', 10.00, 'approved', '/uploads/5-1765013124418-295415232.jpg', NULL, '2025-12-06 09:25:24', NULL, 2, '2025-12-06 16:26:11'),
(21, 5, 7, 'bet', 10.00, 'approved', NULL, NULL, '2025-12-06 09:26:21', NULL, NULL, NULL),
(22, 5, 9, 'deposit', 10.00, 'approved', '/uploads/5-1765013811271-163604228.png', NULL, '2025-12-06 09:36:51', NULL, 2, '2025-12-06 16:37:00'),
(23, 5, 10, 'bet', 10.00, 'approved', NULL, NULL, '2025-12-06 10:20:17', NULL, NULL, NULL),
(24, 5, 11, 'deposit', 1000.00, 'approved', '/uploads/5-1765017288144-187403133.png', NULL, '2025-12-06 10:34:48', NULL, 2, '2025-12-06 17:35:03'),
(25, 5, 11, 'bet', 100.00, 'approved', NULL, NULL, '2025-12-06 10:35:35', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `userbingocards`
--

CREATE TABLE `userbingocards` (
  `card_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `round_id` int(11) NOT NULL,
  `card_numbers` varchar(255) DEFAULT NULL,
  `is_winner` tinyint(1) NOT NULL DEFAULT 0,
  `winning_claim_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `win_amount` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `userbingocards`
--

INSERT INTO `userbingocards` (`card_id`, `user_id`, `round_id`, `card_numbers`, `is_winner`, `winning_claim_status`, `win_amount`, `created_at`) VALUES
(3, 1, 3, '[\"21\",\"92\",\"47\",\"06\",\"08\",\"32\",\"12\",\"33\",\"05\",\"39\",\"44\",\"04\",\"03\",\"11\",\"07\",\"09\",\"86\",\"40\",\"75\",\"54\",\"15\",\"81\",\"20\",\"42\",\"16\"]', 0, 'pending', 0.00, '2025-11-26 10:03:50'),
(4, 3, 3, '[\"06\",\"63\",\"64\",\"74\",\"95\",\"68\",\"66\",\"89\",\"77\",\"57\",\"15\",\"27\",\"75\",\"81\",\"24\",\"22\",\"96\",\"48\",\"61\",\"98\",\"07\",\"67\",\"47\",\"71\",\"70\"]', 0, 'pending', 0.00, '2025-11-26 10:26:01'),
(5, 1, 4, '[\"29\",\"98\",\"33\",\"34\",\"18\",\"13\",\"76\",\"94\",\"65\",\"21\",\"16\",\"78\",\"07\",\"39\",\"26\",\"24\",\"66\",\"70\",\"91\",\"15\",\"69\",\"25\",\"32\",\"81\",\"74\"]', 0, 'pending', 0.00, '2025-12-06 06:42:49'),
(6, 5, 4, '[\"55\",\"57\",\"89\",\"73\",\"28\",\"01\",\"56\",\"41\",\"30\",\"76\",\"59\",\"02\",\"17\",\"60\",\"04\",\"48\",\"85\",\"34\",\"80\",\"66\",\"67\",\"14\",\"18\",\"15\",\"23\"]', 0, 'pending', 0.00, '2025-12-06 07:05:25'),
(7, 5, 8, '[\"01\",\"21\",\"55\",\"90\",\"45\",\"02\",\"28\",\"46\",\"22\",\"27\",\"03\",\"56\",\"FREE\",\"11\",\"85\",\"04\",\"42\",\"32\",\"86\",\"15\",\"05\",\"51\",\"52\",\"53\",\"54\"]', 0, 'pending', 0.00, '2025-12-06 09:24:08'),
(8, 5, 7, NULL, 0, 'pending', 0.00, '2025-12-06 09:26:21'),
(9, 5, 10, NULL, 0, 'pending', 0.00, '2025-12-06 10:20:17'),
(10, 5, 11, '[\"22\",\"33\",\"25\",\"54\",\"66\",\"14\",\"21\",\"26\",\"32\",\"67\",\"75\",\"68\",\"FREE\",\"13\",\"77\",\"95\",\"62\",\"35\",\"57\",\"58\",\"2\",\"11\",\"42\",\"34\",\"43\"]', 0, 'pending', 0.00, '2025-12-06 10:35:35');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `phone_number` varchar(15) DEFAULT NULL,
  `bank_account_info` text DEFAULT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `wallet_balance` decimal(10,2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `username`, `password_hash`, `full_name`, `phone_number`, `bank_account_info`, `role`, `is_active`, `created_at`, `wallet_balance`) VALUES
(1, 'test01', '123456', 'test01 001', '0857485764', NULL, 'user', 1, '2025-11-14 13:00:41', 0.00),
(2, 'admin01', '111111', 'admin01 001', '0987456754', NULL, 'admin', 1, '2025-11-14 16:26:48', 0.00),
(3, 'test02', '$2b$10$o.kP5TGQLG5zrQF3MgjYjubn3gHg8dRTwb7q4yvx2b3ZnluqaQdwO', 'test02 002', '0969696857', NULL, 'user', 1, '2025-11-26 10:24:17', 100.00),
(4, 'test03', '333333', 'test03 003', '0874584758', NULL, 'user', 1, '2025-11-26 17:31:07', 0.00),
(5, 'test04', '444444', 'test04 444', '0857594444', '0857594444', 'user', 1, '2025-12-06 06:58:15', 900.00);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `gameround`
--
ALTER TABLE `gameround`
  ADD PRIMARY KEY (`round_id`);

--
-- Indexes for table `gamerounds`
--
ALTER TABLE `gamerounds`
  ADD PRIMARY KEY (`round_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `userbingocards`
--
ALTER TABLE `userbingocards`
  ADD PRIMARY KEY (`card_id`),
  ADD UNIQUE KEY `user_id` (`user_id`,`round_id`),
  ADD KEY `userbingocards_ibfk_round_fix` (`round_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `gameround`
--
ALTER TABLE `gameround`
  MODIFY `round_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `gamerounds`
--
ALTER TABLE `gamerounds`
  MODIFY `round_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `userbingocards`
--
ALTER TABLE `userbingocards`
  MODIFY `card_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `userbingocards`
--
ALTER TABLE `userbingocards`
  ADD CONSTRAINT `userbingocards_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `userbingocards_ibfk_round_fix` FOREIGN KEY (`round_id`) REFERENCES `gameround` (`round_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
