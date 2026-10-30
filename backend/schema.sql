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
  mis_id             VARCHAR(20) NOT NULL UNIQUE,
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
  CONSTRAINT fk_keys_faculty FOREIGN KEY (faculty_user_id) REFERENCES faculty(user_id),
  INDEX idx_keys_faculty_active (faculty_user_id, is_active)
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
  CONSTRAINT chk_reviews_decided CHECK ((decision = 'PENDING') = (decided_on IS NULL)),
  INDEX idx_reviews_faculty (faculty_user_id)
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

-- ---------- Read-only audit view (handy in the MySQL shell) ----------

CREATE VIEW v_signature_audit AS
SELECT s.signature_id, s.request_id, a.subject, s.step_no, d.file_name,
       CONCAT(u.first_name, ' ', u.last_name) AS signed_by, r.decided_on AS signed_on, ap.key_id
FROM signatures s
JOIN request_applications a ON a.request_id = s.request_id
JOIN documents d  ON d.request_id = s.request_id AND d.doc_no = s.doc_no
JOIN approvals ap ON ap.request_id = s.request_id AND ap.step_no = s.step_no
JOIN reviews r    ON r.request_id = s.request_id AND r.step_no = s.step_no
JOIN users u     ON u.user_id = r.faculty_user_id;

-- ---------- Seed data (password for everyone: password123) ----------

SET @pw = '$2b$10$tb0QYAxyZp0GvWGwN8PEjOncxWhvw3ZEA/6Uc89RYSr4coibHTs92';
SET @pub1 = '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtY/upPQmQtWQUDqeiapQ
9UHsv+vE44bNhuseHRbhiPuKhpONgRwcB8EADEcoE560SyDIc4qcpecG0xyeP/Xp
VNn4OVTygVuu2u5oXmX4TWlgt7QvjNeM7iSzGl9QhnJMgwPyBDOKIz5EumWXiN1+
NFq3iIaWPRIHabDBD84fqVLGZrNUKAgw4yHAgxzrkp9DG4eCmrWStFBnt8cYsqk+
QaFFx91DGry5xjmu9/SWW4l4EuNNyzUPx5K7KXSl5boF6us7xMOXhWbSG89dk682
1sI64zcNDD2nj8EGwElc+zBWzSKy2FtPD90QryNSAiwzIFy6LcV0vhDbDO3b4iqP
oQIDAQAB
-----END PUBLIC KEY-----';
SET @priv1 = '-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC1j+6k9CZC1ZBQ
Op6JqlD1Qey/68Tjhs2G6x4dFuGI+4qGk42BHBwHwQAMRygTnrRLIMhzipyl5wbT
HJ4/9elU2fg5VPKBW67a7mheZfhNaWC3tC+M14zuJLMaX1CGckyDA/IEM4ojPkS6
ZZeI3X40WreIhpY9EgdpsMEPzh+pUsZms1QoCDDjIcCDHOuSn0Mbh4KatZK0UGe3
xxiyqT5BoUXH3UMavLnGOa739JZbiXgS403LNQ/HkrspdKXlugXq6zvEw5eFZtIb
z12TrzbWwjrjNw0MPaePwQbASVz7MFbNIrLYW08P3RCvI1ICLDMgXLotxXS+ENsM
7dviKo+hAgMBAAECggEAFL5v4e1aNL8hSKVV6T0qGEdytP/LREKp100kKOctGAFD
U7pmi7aKNlGU/5IesFUs3LuPY3IWETdq1nJ52y1tvgnUXDqKJYDz4qQkDQsB+lg8
mmiOGT2kZq4PP4dd1CqZdsub2mKIGRw7bn9+d3709SbbOtBDuJEHg0oUWMmwYOA4
rK/qqr7uT54EzP7nY/aZqdlpx1+0GVlYnP3XHMQyFlxtyFyOfQDcGvRU8MIFV8VG
K/QFaySKbKrhvctni8DL2KIkm4/CZRYVj0daVe7VBnJAMP1APv+76VNh7uvhhEtn
zmEsX5EJDBrBqbpLig3olpDBAoFUYMdt+4NnVayS0QKBgQDeTHfbrI6/jHo87vlE
tornMLrp0U5URknzoT47p/FqkJg+SXsRGaOgH/TgSBXWV1K2CeEwfUGCS7B4oEAV
5ywM+lko7po0pKqmy4OXnhnvMUiwlKEHL6Duqh8hU1za1vsT1mzZyLCHnIo8E95x
Q8alt/gmAJ2y6jnAdT/MZhJkqQKBgQDRFnW3hYf8/+e3K22MCvY1WoBMntsANCUS
N/BkrNu2pVm+uHwqyc+QaXT5l2IpSJRncXVI++7VD3WgfYZU0xjUD4DtkmlsjwYM
CQXpjryBPLFOgHyyoNMWCxosZE5VkeGLwoNBoQ9IaELy8zAdrrs1Xx2tKxnUPBKR
J2pEv7K2OQKBgQC5lK0bP1uMngIOjJKcwqgDibMBMDNsN6HVOm9x7iqlBEGU/lM3
W2g2bXdJJeTVI+FxB55vlKHz3Kxeh6n4nx0vWHDGsysZd77fsFcTZHHSNhqxD+O+
1AxOMsf6UlXafE7vqLsGtXxqOk1NCmlRtXtJLeSEFU+R5eiAu2GfijcgwQKBgQCS
r+kiOaIwEvDjhqoyJ7aXs8hy+Le4Kt0fLPOQDd2PA+40aYVjF3ZxYCrauCP7xpmn
AOhBrc3e2Buz3pyRgg/XJpFTGvavXJ/nbaUiOCtzl7rk0iupvj6ZJmzUXALA8bmE
rZAcSPxJ1iux+n71NBLO3M4bITPbu9Fi2H4rgTnFsQKBgBdispguOUp58JUhG5sj
3m1WWgBHScpqK6mm8R87W7C7yLcocouCfbZRGBQdiv39U0eXK44FaBc5wZal2xzB
1a5KLzrzxVQd1ahnVxHFpOIcu4EpCM0OsJVyxLK7M9VJeEeltbzCPR9nAIR2Fhi4
1WqoD1O8BCje3I/13GHDG2Dv
-----END PRIVATE KEY-----';
SET @pub2 = '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyJ7TkC7Uekd0FA4Nu6L3
lTOXQ9SxS0J5BVoy5jZZD0nX+9C4LTe9egNDO6HjSLB95K7ePx7dT2c4LRRaOHds
Pczk8dZ4aB72/lpJW6mOf8o+XqZmVY0wsdaBVxI8lEEdEyWfhsJbjUihjbasVC97
fxwKWOWi5/zSQmcKUuRmrMw/CgeZCWb8q15UhNBzhqsb9ER/YtyULgcdIdGa3F8v
R0Bsn0zsSJn9dvnIOwkT72uJeVUKSBMK+8q6KpAkJHxulFsjgxJ5Z6MEJ0pxp9uR
3MjKPpFoqfXouPSLqOYXtHg/DGXf804v5nFDUPaPhaEVxmGE/+VrFjm3rVTTvAMK
hQIDAQAB
-----END PUBLIC KEY-----';
SET @priv2 = '-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDIntOQLtR6R3QU
Dg27oveVM5dD1LFLQnkFWjLmNlkPSdf70LgtN716A0M7oeNIsH3krt4/Ht1PZzgt
FFo4d2w9zOTx1nhoHvb+WklbqY5/yj5epmZVjTCx1oFXEjyUQR0TJZ+GwluNSKGN
tqxUL3t/HApY5aLn/NJCZwpS5GaszD8KB5kJZvyrXlSE0HOGqxv0RH9i3JQuBx0h
0ZrcXy9HQGyfTOxImf12+cg7CRPva4l5VQpIEwr7yroqkCQkfG6UWyODEnlnowQn
SnGn25HcyMo+kWip9ei49Iuo5he0eD8MZd/zTi/mcUNQ9o+FoRXGYYT/5WsWObet
VNO8AwqFAgMBAAECggEAJ27um0nVKmbWlmWPxfi5rPpLyoGpSqd5dbedxxnaJhLn
8P984ChzZiLziWpf7CcCy9siZKpKqmOZy2STekNhA4G9Y5q6Jo8lkefJwQpiL9Sf
L0gKV9kNf/svh5+WSDbHQf70bQ7RY4Mp/Bqyo0aFAf5PO1uBypMrefFaemIaG28d
het47L914tfAFlPh8zAOZLCSajO6lAbOiAWhbp2dFZ9XnB6SEy244SFmu4+Bz4f8
96xHRvTJuNt1jsSL2NkG+KJ3Q2Bi/Zmq8L+m0pwmY3eWOnZe1P1ltcAx025zB3rW
tsdTHdspqhJYZE6wBYHd4Gbyb+x1ngrCoe/ux9EQaQKBgQD7m8BpuYOfKRojqMMN
SAh5FCkjKwKlzczq8c54nuYzGJXJOsdnu3+jrmRraweEb3lhvLR6ruLLYDsjdAXY
S0t81OZCTpNZev1xc6crbQmfVmHrGE95wKFKMGPqyqTgB6Bo+bq22/qpSkevgBgu
rEMyZbSMhZSLSPgtqvdeMp08fQKBgQDMHz92VYT8QQFk1MJwBppgmo/N77gXd+S7
ERdrjAjxEYyKc+UPBtv/bvroIOZP6P++U6rpK+9YLEDO/nqLah+BG+mOe0bKydS5
4M/7fKUu7ANsRGXoWJ7ER4g+0mUedSgKRGj+xI8t7oLjQqzbpqDHPzaBZBXAQhop
fybbxhVMqQKBgAeNOi4yKjgptKYjV49bfR2dNErg7JhrX94hWdAW/NPFxiEfCYMc
ho00G8F5meUor1z2m/geraHrBnte7Rn70I0zmqGc2CFUZqz0Cq1r/WDx58h1l1UR
KgYfA7C1WlN7Bx5/eFIqshBIsXQcBR3Jf87QbKXXEIlJrGE6g2gpXrzFAoGAWjyG
JZ3wyENEhnq36iZBIOuzHusWiulpqHkJzXV+jnOfmaVaYaY6o1VAflXs+u6aAF2k
dKgDiwslK1y8d91WSBE60s4UoZlP/UwxJZAYxgF4Eei61Fg497RXus3v/eL07HUJ
pXbnhPqnyiezmvaypOKBCfpg0zllr2qSlx2eVOECgYEAysHlgDD4h8PS0WzV5BeS
VuI3xRa1pG9Qab1w5SOI0wD44Bc6Qo+0VtPBj5n5FwvsRN5bcBgJCTgj8GvY4/hN
TZ80b/wSZYV9DWXwTU22PBXvTJpbOZkFeZL/RM1lfVI3cRsRvDGpxIaDue32X+Pd
obQgYHGnh1c/xZY57MhAjsM=
-----END PRIVATE KEY-----';
SET @pub3 = '-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuMif0u1rVtHBB0sgixsC
+yyuwm3JqXlJyjkBwW4k9iwHZFZeqZt3KD9B5h6nD0JcfeYTgjiOemJVAtM6CEVU
8b10uA0GjUxkj8tL9AABSUeIG6+QhgNF8QWbYvQLkPgkbO62KcSZJWOB41uKj2wu
d/kIqSEN8HFMMOF/827ByJSEonKNqDDMjmS51EmA5g2cX5t8a3T4V1tKvVVoVCMb
iUaOIf0FubVV37a6NyZ/whPEQ8D+TCenF+YJB8VPE+A2u+B7s9aiOChjv5mYawAf
vHTug41Jxo/NcEc74UIXQ+suw00s3PECO9D1A1E5ItBo+RZ5ilcS8pSI+eOpSw5L
AwIDAQAB
-----END PUBLIC KEY-----';
SET @priv3 = '-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC4yJ/S7WtW0cEH
SyCLGwL7LK7CbcmpeUnKOQHBbiT2LAdkVl6pm3coP0HmHqcPQlx95hOCOI56YlUC
0zoIRVTxvXS4DQaNTGSPy0v0AAFJR4gbr5CGA0XxBZti9AuQ+CRs7rYpxJklY4Hj
W4qPbC53+QipIQ3wcUww4X/zbsHIlISico2oMMyOZLnUSYDmDZxfm3xrdPhXW0q9
VWhUIxuJRo4h/QW5tVXftro3Jn/CE8RDwP5MJ6cX5gkHxU8T4Da74Huz1qI4KGO/
mZhrAB+8dO6DjUnGj81wRzvhQhdD6y7DTSzc8QI70PUDUTki0Gj5FnmKVxLylIj5
46lLDksDAgMBAAECggEANSDh6wh+U0ENyeYM3lIO4l7vhFGCqOqJj84iNhZQJEN2
gJ/gqc1cTkMZ1Gs9x0JiS4SKWWefd4qsPJq01cnxaWv6kiyUlK3BQCLInMgflo0t
kiBBYnawdmMRUTsv1Ce0eWmNEKdJDRn2L4OTbDdDiRUeK1qoolhA+tDrM/fFWcDz
mR6AYoTRU2AEZw52XA5BDemXOWaUMmux/iWx4cK5bngA0GuO6mZWZWeStn6nZ+iW
EzGJD72spUVOgClqBrkEeefsBtJzzjEdwXNFgKZCM3X+BBMuZoesL2mQ2TkGaaWX
evQMYadYaLZXe+YZYNlt2ZVMLYPmRMg5h8pyZMGueQKBgQD7hJkr3TAXXUiE1TOv
6leEbLD4E0ctqzhvwyNrUoqGX4xNgCub91g9qWHsCigGvPlMi3pBR9AQTt9Hgrta
0JVaSfZaO7wZWVPMTBWLgxJwJq24sypTEtNCj2lsXwQWSmxHRRr4RBBWe2GSaTQu
KfzjNYVZspR8eOc5iGsderb67wKBgQC8E5ckxzkeZhc5V8oqBLzUp8pl3wybT9I0
Heq+Qpi3RlHvi6CKN3UeB9A7a2AvKLnRRI53+6aWBnL4mrWqFOxJYM3w2Tkbq+Ja
2aeUC+TKA3fuAuj4EIqF3TAjS9GQ07oKy6D7EJLSlF2csTcY0RcJAQcYK1b9cpCZ
VkWqDarBLQKBgH6osKXZNj2d2UYjQ2skPLxQK/JRavfBkKMfhremEmJGvZXNpKhf
L82lfc1q8+sowPZeCsvTCSEdRu1xFT5PadbVBj08daXiSQPJkNP3xpI5uCQZ/Ydm
JIMRS0qqspkzE0H0t/cr93pFmcYsOn3A4TveGPApsQLZs79SRnbK9Fh7AoGAbtnR
FMFDXjJn78lZg4iFT4WR2pcrlALo7wTPDdKstiEBPAH83lovckLCrbLs3v7O/pO8
sOUm23fznal590QbvGgNGa6+ZRva7xcoGS8laxe+QQ+ABm2hZ6Lls3gFjantFl3M
hQ3Qq8L8pdUhl0PtosXzS4CH5hv3NBlQOBmUEgUCgYEAmaEHARITC7qxO71rAWdq
hREKmlVw5z43IY+/5KNXCOdMQltQeR7oCJhP1lMPu3P52w81eFJUOdFuEtgbRdej
zLC/0pJbJctoUYoSf4W9Xw+rMqhKY6+8t8IZz+vpMCqicyXz3FDT9Q9T6qtXQHvo
Jpj5gy4BjGXyUMhbK4sIF5s=
-----END PRIVATE KEY-----';

INSERT INTO users (user_id, first_name, middle_name, last_name, email, password_hash) VALUES
  (1, 'Aarav',  NULL, 'Shah',     'aarav@student.edu',  @pw),
  (2, 'Diya',   'R',  'Mehta',    'diya@student.edu',   @pw),
  (3, 'Kavita', NULL, 'Iyer',     'kavita@faculty.edu', @pw),
  (4, 'Rajesh', 'K',  'Nair',     'rajesh@faculty.edu', @pw),
  (5, 'Sunita', NULL, 'Deshmukh', 'sunita@faculty.edu', @pw),
  (6, 'Admin',  NULL, 'Office',   'admin@portal.edu',   @pw);

INSERT INTO user_phones (user_id, phone_no) VALUES
  (1, '9000000001'), (1, '9000000011'), (2, '9000000002'),
  (3, '9000000003'), (4, '9000000004'), (5, '9000000005');

INSERT INTO students (user_id, mis_id, department, division, year_of_graduation) VALUES
  (1, '60001220001', 'Computer Engineering', 'A', 2027),
  (2, '60001220002', 'Information Technology', 'B', 2026);

INSERT INTO faculty (user_id, faculty_id, designation, department) VALUES
  (3, 'FAC001', 'Assistant Professor (Guide)', 'Computer Engineering'),
  (4, 'FAC002', 'Head of Department', 'Computer Engineering'),
  (5, 'FAC003', 'Dean', 'Engineering');

INSERT INTO admins (user_id, admin_id) VALUES (6, 'ADM001');

INSERT INTO key_pairs (faculty_user_id, public_key, private_key) VALUES
  (3, @pub1, @priv1),
  (4, @pub2, @priv2),
  (5, @pub3, @priv3);
