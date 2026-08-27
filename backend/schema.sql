-- Document Verification Portal: schema derived from the E-R model.
-- Run once: mysql -u root -p < schema.sql   (drops and recreates the database)

DROP DATABASE IF EXISTS doc_portal;
CREATE DATABASE doc_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE doc_portal;

-- ---------- People: one supertype, three disjoint subtypes ----------

CREATE TABLE users (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(50)  NOT NULL,
  middle_name   VARCHAR(50)  NULL,
  last_name     VARCHAR(50)  NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  created_on    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- phone_no is multivalued in the E-R model, so it gets its own table.
CREATE TABLE user_phones (
  user_id  INT         NOT NULL,
  phone_no VARCHAR(15) NOT NULL,
  PRIMARY KEY (user_id, phone_no),
  CONSTRAINT fk_phones_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE students (
  user_id            INT PRIMARY KEY,
  sap_id             VARCHAR(20) NOT NULL UNIQUE,
  department         VARCHAR(80) NOT NULL,
  division           VARCHAR(5)  NOT NULL,
  year_of_graduation SMALLINT    NOT NULL,
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT chk_students_year CHECK (year_of_graduation BETWEEN 2000 AND 2100)
);

CREATE TABLE faculty (
  user_id     INT PRIMARY KEY,
  faculty_id  VARCHAR(20) NOT NULL UNIQUE,
  designation VARCHAR(60) NOT NULL,
  department  VARCHAR(80) NOT NULL,
  CONSTRAINT fk_faculty_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE admins (
  user_id  INT PRIMARY KEY,
  admin_id VARCHAR(20) NOT NULL UNIQUE,
  CONSTRAINT fk_admins_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ---------- Faculty signing keys ----------

CREATE TABLE key_pairs (
  key_id          INT AUTO_INCREMENT PRIMARY KEY,
  faculty_user_id INT      NOT NULL,
  public_key      TEXT     NOT NULL,
  private_key     TEXT     NOT NULL,
  generated_on    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active       BOOLEAN  NOT NULL DEFAULT TRUE,
  algorithm       VARCHAR(30) NOT NULL DEFAULT 'RSA-SHA256',
  CONSTRAINT fk_keys_faculty FOREIGN KEY (faculty_user_id) REFERENCES faculty(user_id)
);

-- ---------- Applications and their weak entities ----------

-- No status column: status is derived from the latest review step.
CREATE TABLE request_applications (
  request_id      INT AUTO_INCREMENT PRIMARY KEY,
  student_user_id INT          NOT NULL,
  subject         VARCHAR(150) NOT NULL,
  description     TEXT         NOT NULL,
  created_on      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_student FOREIGN KEY (student_user_id) REFERENCES students(user_id)
);
