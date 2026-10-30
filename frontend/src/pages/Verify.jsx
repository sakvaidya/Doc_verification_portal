import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import Card from '../components/Card';
import Field from '../components/Field';
import Button from '../components/Button';

export default function Verify() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(code || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    setResult(null);
    setError('');
    api.get(`/verify/${code}`).then(setResult).catch((e) => setError(e.message));
  }, [code]);

  function submit(e) {
    e.preventDefault();
    navigate(`/verify/${input.trim()}`);
  }

  return (
    <Card title="Verify a signature">
      <form onSubmit={submit} className="inline-form">
        <Field label="Verification code" value={input} onChange={(e) => setInput(e.target.value)} required />
        <Button type="submit">Verify</Button>
      </form>
      {error && <p className="error">{error}</p>}
      {result && (
        <div className={`result ${result.valid ? 'result-valid' : 'result-invalid'}`}>
          <strong>{result.valid ? 'VALID' : 'INVALID'}</strong>
          <p>{result.valid
            ? 'The file is unchanged since it was signed.'
            : 'The file on record no longer matches this signature.'}</p>
          <dl className="details">
            <dt>File</dt><dd>{result.fileName}</dd>
            <dt>Signed by</dt><dd>{result.signer} ({result.designation})</dd>
            <dt>Signed on</dt><dd>{result.signedOn}</dd>
            <dt>Application / step</dt><dd>#{result.requestId} / step {result.stepNo}</dd>
            <dt>Algorithm</dt><dd>{result.algorithm}</dd>
          </dl>
          {result.valid && (
            <Button onClick={() => api.download(`/verify/${code}/download`, result.fileName).catch((e) => setError(e.message))}>
              Download signed file
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
