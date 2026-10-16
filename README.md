# Document Verification Portal

A small learning project that replaces "walk the printout from desk to desk" with a web portal.

A student raises a **request application**, attaches files, and routes it to a faculty member.
The faculty member comments, then **approves** (digitally signs every file) or **rejects**.
After a decision the student can **forward** the same application to the next faculty member
(guide → HOD → dean), so signatures pile up on the same files in order.

Signatures are real RSA-2048 / SHA-256 signatures over the file's bytes, not images. Anyone can
paste a signature ID into the public **Verify** page; the server re-reads the file from disk,
recomputes the hash and checks it against the signer's public key. Change one byte of the
file and verification fails.

## Stack

- **Backend:** Node.js + Express, `mysql2/promise` with raw SQL (no ORM), JWT + bcrypt, multer, Node `crypto`
- **Database:** MySQL 8
- **Frontend:** React + Vite, `react-router-dom`, plain CSS

Request flow is strictly `route → controller → service → repository → MySQL`.
SQL only lives in `backend/src/repositories/`; `req`/`res` only in controllers and middleware.

## Prerequisites

- Node.js 18+ and npm
- MySQL 8.0.16+ (for CHECK constraints) running locally

## Setup

### 1. Create the database

```bash
cd backend
mysql -u root -p < schema.sql
```

This drops and recreates `doc_portal` and seeds the users below.

### 2. Start the API

```bash
cd backend
cp .env.example .env    # then edit DB_PASSWORD and JWT_SECRET
npm install
npm start               # http://localhost:4000
```

`.env` variables:

| Variable | Meaning | Default |
|---|---|---|
| `PORT` | API port | `4000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password | *(empty)* |
| `DB_NAME` | database name | `doc_portal` |
| `JWT_SECRET` | secret used to sign login tokens | **required** |

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

The frontend calls `http://localhost:4000/api`; override with `VITE_API_URL` if needed.

## Seeded logins

Password for every account: `password123`

| Role | Name | Email |
|---|---|---|
| Student | Aarav Shah | `aarav@student.edu` |
| Student | Diya Mehta | `diya@student.edu` |
| Faculty (Guide) | Kavita Iyer | `kavita@faculty.edu` |
| Faculty (HOD) | Rajesh Nair | `rajesh@faculty.edu` |
| Faculty (Dean) | Sunita Deshmukh | `sunita@faculty.edu` |
| Admin | Admin Office | `admin@portal.edu` |

## Walkthrough

1. **Raise an application.** Log in as `aarav@student.edu`, click *New application*, enter a
   subject and description, choose *Kavita Iyer*, attach a `.pdf` and a `.txt`, submit.
   Status shows `PENDING WITH Kavita Iyer`.
2. **Discuss.** Log in as `kavita@faculty.edu`; the application is in *Assigned to me*. Open it
   and post a comment. Log back in as Aarav and reply to it.
3. **Approve.** As Kavita, click *Approve & sign*. Step 1 now lists one signature ID per file.
4. **Forward.** As Aarav, use *Forward to…* to send it to *Rajesh Nair*. As Rajesh, approve.
   The timeline now has two approved steps, each with its own signatures on the same files.
5. **Verify.** Open *Verify* (no login needed), paste a signature ID → green **VALID** with the
   file name, signer and timestamp.
6. **Tamper.** Find the stored file and change it:

   ```sql
   SELECT file_name, stored_path FROM doc_portal.documents WHERE request_id = 1;
   ```

   ```bash
   echo "one extra line" >> backend/uploads/<stored file name for the .txt>
   ```

   Verify the same signature ID again → red **INVALID**.

## How signing works

On approval, for every document of the application:

```
content_hash = sha256( file bytes + ":" + request_id + ":" + doc_no + ":" + step_no + ":" + faculty_user_id )
signature    = RSA-SHA256-sign( content_hash, faculty's active private key )
```

Mixing in the ids means a signature is bound to one file, one application, one review step and
one signer — it can't be copied onto another document or replayed on another step.
Verification recomputes the hash from the file currently on disk and checks it with the stored
public key.

## API

```
POST /api/auth/register                 role=student|faculty + role fields
POST /api/auth/login                    -> { token, user: { id, name, role } }
GET  /api/faculty                       faculty list for dropdowns

POST /api/applications                  multipart: subject, description, facultyUserId, files[]
GET  /api/applications/mine             student
GET  /api/applications/assigned         faculty
GET  /api/applications/all              admin
GET  /api/applications/:id              detail (documents, steps + signatures, comments, status)
POST /api/applications/:id/forward      { facultyUserId }
POST /api/applications/:id/comments     { message, parentCommentNo? }

POST /api/reviews/:id/:stepNo/approve
POST /api/reviews/:id/:stepNo/reject    { remark? }   (remark is posted as a comment)

GET  /api/documents/:id/:docNo/download
GET  /api/verify/:signatureId           public
```

This is a demo: private keys are stored in the database in plain text, which a real system
would never do.
