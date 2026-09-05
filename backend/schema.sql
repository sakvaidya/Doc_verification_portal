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

CREATE TABLE documents (
  request_id  INT          NOT NULL,
  doc_no      INT          NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  stored_path VARCHAR(255) NOT NULL,
  file_hash   CHAR(64)     NOT NULL,
  uploaded_on DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id, doc_no),
  CONSTRAINT fk_docs_app FOREIGN KEY (request_id) REFERENCES request_applications(request_id),
  CONSTRAINT chk_docs_no CHECK (doc_no > 0)
);

CREATE TABLE comments (
  request_id        INT      NOT NULL,
  comment_no        INT      NOT NULL,
  author_user_id    INT      NOT NULL,
  message           TEXT     NOT NULL,
  posted_on         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  parent_comment_no INT      NULL,
  PRIMARY KEY (request_id, comment_no),
  CONSTRAINT fk_comments_app    FOREIGN KEY (request_id) REFERENCES request_applications(request_id),
  CONSTRAINT fk_comments_author FOREIGN KEY (author_user_id) REFERENCES users(user_id),
  -- composite self-reference: a reply can only point at a comment of the SAME application
  CONSTRAINT fk_comments_parent FOREIGN KEY (request_id, parent_comment_no)
    REFERENCES comments(request_id, comment_no),
  CONSTRAINT chk_comments_parent CHECK (parent_comment_no IS NULL OR parent_comment_no < comment_no)
);

CREATE TABLE reviews (
  request_id      INT      NOT NULL,
  step_no         INT      NOT NULL,
  faculty_user_id INT      NOT NULL,
  assigned_on     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decision        ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  decided_on      DATETIME NULL,
  PRIMARY KEY (request_id, step_no),
  CONSTRAINT fk_reviews_app     FOREIGN KEY (request_id) REFERENCES request_applications(request_id),
  CONSTRAINT fk_reviews_faculty FOREIGN KEY (faculty_user_id) REFERENCES faculty(user_id),
  CONSTRAINT chk_reviews_decided CHECK ((decision = 'PENDING') = (decided_on IS NULL))
);

-- An approved step and the key it was signed with. Kept out of signatures because
-- every document of a step is signed with the same key (key_id depends on the step only).
CREATE TABLE approvals (
  request_id INT NOT NULL,
  step_no    INT NOT NULL,
  key_id     INT NOT NULL,
  PRIMARY KEY (request_id, step_no),
  CONSTRAINT fk_approvals_review FOREIGN KEY (request_id, step_no) REFERENCES reviews(request_id, step_no),
  CONSTRAINT fk_approvals_key    FOREIGN KEY (key_id) REFERENCES key_pairs(key_id)
);

-- Relationship between an approved review step and a document.
CREATE TABLE signatures (
  signature_id    INT AUTO_INCREMENT PRIMARY KEY,
  request_id      INT      NOT NULL,
  step_no         INT      NOT NULL,
  doc_no          INT      NOT NULL,
  content_hash    CHAR(64) NOT NULL,
  signature_value TEXT     NOT NULL,
  -- referencing approvals (not reviews) means a rejected step can never hold signatures
  CONSTRAINT fk_sig_approval FOREIGN KEY (request_id, step_no) REFERENCES approvals(request_id, step_no),
  CONSTRAINT fk_sig_doc      FOREIGN KEY (request_id, doc_no)  REFERENCES documents(request_id, doc_no),
  CONSTRAINT uq_sig_step_doc UNIQUE (request_id, step_no, doc_no)
);

-- ---------- Disjoint specialisation: a user is in exactly one subtype ----------

DELIMITER //
CREATE TRIGGER trg_students_disjoint BEFORE INSERT ON students FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM faculty WHERE user_id = NEW.user_id)
     OR EXISTS (SELECT 1 FROM admins WHERE user_id = NEW.user_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User already has a different role';
  END IF;
END//
CREATE TRIGGER trg_faculty_disjoint BEFORE INSERT ON faculty FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM students WHERE user_id = NEW.user_id)
     OR EXISTS (SELECT 1 FROM admins WHERE user_id = NEW.user_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User already has a different role';
  END IF;
END//
CREATE TRIGGER trg_admins_disjoint BEFORE INSERT ON admins FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM students WHERE user_id = NEW.user_id)
     OR EXISTS (SELECT 1 FROM faculty WHERE user_id = NEW.user_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User already has a different role';
  END IF;
END//

-- An approval must be for an APPROVED step and use a key of the faculty member assigned to it.
CREATE TRIGGER trg_approvals_check BEFORE INSERT ON approvals FOR EACH ROW
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM reviews r JOIN key_pairs k ON k.faculty_user_id = r.faculty_user_id
    WHERE r.request_id = NEW.request_id AND r.step_no = NEW.step_no
      AND r.decision = 'APPROVED' AND k.key_id = NEW.key_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Approval must use the assigned faculty key on an approved step';
  END IF;
END//
DELIMITER ;
