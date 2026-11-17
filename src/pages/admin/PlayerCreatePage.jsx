import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPlayer } from '../../api/adminApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import FormFields from './FormFields.jsx';
import { PLAYER_FIELDS } from '../../constants/adminFields.js';
import { filledValues, formatError } from '../../utils/adminForm.js';
import { formatHands } from '../../utils/format.js';
import './AdminPages.css';

const FIELDS = [{ key: 'playerId', label: '선수 ID', type: 'text', required: true }, ...PLAYER_FIELDS];
const EMPTY = Object.fromEntries(FIELDS.map((f) => [f.key, '']));

/**
 * 선수 등록  /admin/players/new
 * 사용 API: POST /api/admin/players (5.4)
 */
export default function PlayerCreatePage() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const problem = formatError(FIELDS, form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const player = await createPlayer(filledValues(FIELDS, form));
      setCreated(player);
      setForm(EMPTY);
    } catch (err) {
      // 400 입력 오류, 409 이미 있는 선수 ID, 403 권한 없음 → 서버가 보낸 이유를 그대로 보여준다
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="선수 등록" description="원본 데이터의 선수 ID로 새 선수를 등록합니다. 시즌 기록은 CSV 적재로 추가합니다." />
      <div className="container page-body admin-body">
        <p className="admin-back">
          <Link to="/admin" className="text-link">
            관리 첫 화면
          </Link>
        </p>

        {created && (
          <div className="form-message is-success" role="status">
            <strong>{created.playerName}</strong> 선수({created.playerId})를 등록했습니다.
            {created.birthDate && ` 생년월일 ${created.birthDate},`} {formatHands(created.throwHand, created.batHand)}
            <Link to={`/admin/players/edit?id=${encodeURIComponent(created.playerId)}`} className="text-link">
              정보 수정하기
            </Link>
          </div>
        )}

        <form className="card" onSubmit={handleSubmit} noValidate>
          <FormFields fields={FIELDS} values={form} onChange={setForm} idPrefix="create" />
          {error && (
            <p className="form-message is-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button type="submit" className="button button--primary" disabled={saving}>
              {saving ? '등록하는 중…' : '선수 등록'}
            </button>
            <button type="button" className="button" onClick={() => setForm(EMPTY)}>
              입력 지우기
            </button>
          </div>
          <p className="form-hint">* 표시는 꼭 입력해야 합니다. 선수 ID는 등록 후 바꿀 수 없습니다.</p>
        </form>
      </div>
    </>
  );
}
