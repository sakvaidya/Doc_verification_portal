import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getSession } from '../api/client';
import Card from '../components/Card';
import Field from '../components/Field';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import FileList from '../components/FileList';

export default function ApplicationDetail() {
  const { id } = useParams();
  const user = getSession().user;
  const [app, setApp] = useState(null);
  const [faculty, setFaculty] = useState([]);
  const [error, setError] = useState('');

  const load = () => api.get(`/applications/${id}`).then(setApp).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    if (user.role === 'student') api.get('/faculty').then(setFaculty);
  }, [id]);

  // Runs an action, then reloads the page data.
  async function run(fn) {
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!app) return <Card>{error ? <p className="error">{error}</p> : <p className="muted">Loading…</p>}</Card>;

  const latest = app.steps[app.steps.length - 1];
  const isOwner = user.role === 'student' && user.id === app.student_user_id;
  const canForward = isOwner && latest && latest.decision !== 'PENDING';
  const canComment = isOwner || user.role === 'faculty';

  return (
    <>
      <Card title={`#${app.request_id} ${app.subject}`} actions={<StatusBadge status={app.status} />}>
        <p className="pre">{app.description}</p>
        <p className="muted small">By {app.student_name} on {app.created_on}</p>
        {error && <p className="error">{error}</p>}
      </Card>

      <Card title="Documents">
        <FileList requestId={app.request_id} documents={app.documents} />
      </Card>

      <Card title="Review steps">
        <ol className="timeline">
          {app.steps.map((s) => (
            <ReviewStep key={s.step_no} step={s} user={user} requestId={app.request_id} run={run} />
          ))}
        </ol>
        {canForward && <ForwardForm faculty={faculty} onForward={(fid) =>
          run(() => api.post(`/applications/${app.request_id}/forward`, { facultyUserId: fid }))} />}
      </Card>

      <Card title="Comments">
        <CommentThread
          comments={app.comments}
          canComment={canComment}
          onPost={(message, parentCommentNo) =>
            run(() => api.post(`/applications/${app.request_id}/comments`, { message, parentCommentNo }))}
        />
      </Card>
    </>
  );
}

function ReviewStep({ step, user, requestId, run }) {
  const [remark, setRemark] = useState('');
  const mine = user.role === 'faculty' && user.id === step.faculty_user_id && step.decision === 'PENDING';
  const base = `/reviews/${requestId}/${step.step_no}`;

  return (
    <li className="step">
      <div className="row">
        <strong>Step {step.step_no}: {step.faculty_name}</strong>
        <span className="muted small">{step.designation}</span>
        <StatusBadge status={step.decision} />
      </div>
      <p className="muted small">
        Assigned {step.assigned_on}
        {step.decided_on && ` · decided ${step.decided_on}`}
        {step.prev_step_no && ` · forwarded from step ${step.prev_step_no}`}
      </p>
      {step.signatures.length > 0 && (
        <ul className="list small">
          {step.signatures.map((g) => (
            <li key={g.signature_id}>
              Signature <code className="code-break">{g.content_hash}</code> on {g.file_name} —{' '}
              <Link to={`/verify/${g.content_hash}`}>verify</Link>
            </li>
          ))}
        </ul>
      )}
      {mine && (
        <div className="inline-form">
          <Button onClick={() => run(() => api.post(`${base}/approve`))}>Approve &amp; sign</Button>
          <Field label="Remark (optional)" value={remark} onChange={(e) => setRemark(e.target.value)} />
          <Button variant="danger" onClick={() => run(() => api.post(`${base}/reject`, { remark }))}>Reject</Button>
        </div>
      )}
    </li>
  );
}

function ForwardForm({ faculty, onForward }) {
  const [fid, setFid] = useState('');
  return (
    <div className="inline-form">
      <Field label="Forward to" as="select" value={fid} onChange={(e) => setFid(e.target.value)}>
        <option value="">Choose a faculty member</option>
        {faculty.map((f) => <option key={f.user_id} value={f.user_id}>{f.name} ({f.designation})</option>)}
      </Field>
      <Button disabled={!fid} onClick={() => onForward(fid)}>Forward</Button>
    </div>
  );
}

function CommentThread({ comments, canComment, onPost }) {
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  async function submit(e) {
    e.preventDefault();
    await onPost(message, replyTo);
    setMessage('');
    setReplyTo(null);
  }

  // Render replies under their parent, indented.
  const renderLevel = (parent) =>
    comments.filter((c) => c.parent_comment_no === parent).map((c) => (
      <li key={c.comment_no} className="comment">
        <div className="row">
          <strong>{c.author_name}</strong>
          <span className="muted small">{c.posted_on}</span>
          {canComment && <button className="btn btn-link" onClick={() => setReplyTo(c.comment_no)}>Reply</button>}
        </div>
        <p className="pre">{c.message}</p>
        <ul className="replies">{renderLevel(c.comment_no)}</ul>
      </li>
    ));

  return (
    <>
      {comments.length === 0 ? <p className="muted">No comments yet.</p> : <ul className="thread">{renderLevel(null)}</ul>}
      {canComment && (
        <form onSubmit={submit} className="form">
          {replyTo && (
            <p className="muted small">
              Replying to comment #{replyTo}{' '}
              <button type="button" className="btn btn-link" onClick={() => setReplyTo(null)}>cancel</button>
            </p>
          )}
          <Field label="Add a comment" as="textarea" rows={2} value={message}
            onChange={(e) => setMessage(e.target.value)} required />
          <div><Button type="submit">Post</Button></div>
        </form>
      )}
    </>
  );
}
