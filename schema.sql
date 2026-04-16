-- HostelDesk Database Schema
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS hostel_complaints CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hostel_complaints;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  roll_number VARCHAR(30),
  room_number VARCHAR(20),
  block VARCHAR(10),
  phone VARCHAR(15),
  role ENUM('student', 'staff', 'admin') DEFAULT 'student',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- OTP table
CREATE TABLE IF NOT EXISTS otp_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  otp CHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_otp (email),
  INDEX idx_expires (expires_at)
);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category ENUM('Water', 'WiFi', 'Mess', 'Electricity', 'Maintenance', 'Sanitation', 'Security', 'Other') NOT NULL,
  priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
  status ENUM('Pending', 'In Progress', 'Resolved', 'Rejected', 'Duplicate') DEFAULT 'Pending',
  location VARCHAR(200),
  block VARCHAR(10),
  room_number VARCHAR(20),
  image_url VARCHAR(500),
  image_public_id VARCHAR(200),
  assigned_to INT,
  is_spam BOOLEAN DEFAULT FALSE,
  spam_score FLOAT DEFAULT 0,
  ai_category VARCHAR(50),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  resolved_at TIMESTAMP NULL,
  estimated_hours INT DEFAULT NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_priority (priority),
  INDEX idx_created (created_at)
);

-- Upvotes table
CREATE TABLE IF NOT EXISTS upvotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_upvote (complaint_id, user_id),
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  is_official BOOLEAN DEFAULT FALSE,
  parent_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL,
  INDEX idx_complaint (complaint_id)
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL UNIQUE,
  user_id INT NOT NULL,
  stars TINYINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Status history table
CREATE TABLE IF NOT EXISTS status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  changed_by INT NOT NULL,
  old_status VARCHAR(30),
  new_status VARCHAR(30) NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('status_update', 'comment', 'upvote', 'assigned', 'resolved') NOT NULL,
  complaint_id INT,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE SET NULL,
  INDEX idx_user_unread (user_id, is_read)
);

-- Seed: default admin user
INSERT IGNORE INTO users (name, email, role, room_number)
VALUES ('Admin', 'admin@hostel.edu', 'admin', 'ADMIN');

-- Seed: sample student
INSERT IGNORE INTO users (name, email, roll_number, room_number, block)
VALUES ('Demo Student', 'student@hostel.edu', '2024CS001', '204', 'A');
