import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useApi from '../../hooks/useApi.js';
import { fetchPlayerSeasonStats } from '../../api/playerApi.js';
import { updatePlayer, updateSeasonRecord } from '../../api/adminApi.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import PlayerPicker from '../../components/common/PlayerPicker.jsx';
import StatusMessage from '../../components/common/StatusMessage.jsx';
import { SegmentedTabs, OptionSelect } from '../../components/common/Controls.jsx';
import FormFields from './FormFields.jsx';
import { PLAYER_FIELDS, RECORD_FIELDS, RECORD_RULES } from '../../constants/adminFields.js';
import { PLAYER_TYPES } from '../../constants/stats.js';
import { toFormValues, changedValues, formatError } from '../../utils/adminForm.js';
import { formatStat } from '../../utils/format.js';
import { withParams } from '../../utils/params.js';
import './AdminPages.css';

/**
 * 선수 정보·시즌 기록 수정  /admin/players/edit?id=선수ID&type=batter&year=2024
 * 사용 API:
 *   GET   /api/players/{id}/season-stats?type=batter|pitcher   (현재 값 불러오기)
 *   PATCH /api/admin/players/{id}                              (5.4 기본 정보 수정)
 *   PATCH /api/admin/players/{id}/batting-stats/{year}         (5.3 타자 시즌 기록 수정)
 *   PATCH /api/admin/players/{id}/pitching-stats/{year}        (5.3 투수 시즌 기록 수정)
 */
export default function PlayerEditPage() {
  const [params, setParams] = useSearchParams();
  const playerId = params.get('id');
  const update = (changes) => setParams(withParams(params, changes));

  // 저장할 때마다 숫자를 올려서 현재 값을 다시 불러온다
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  const batting = useApi(() => fetchPlayerSeasonStats(playerId, 'batter'), [playerId, version], { enabled: !!playerId });
  const pitching = useApi(() => fetchPlayerSeasonStats(playerId, 'pitcher'), [playerId, version], { enabled: !!playerId });

  const player = batting.data?.player ?? pitching.data?.player;
  const seasonsByType = { batter: batting.data?.seasons ?? [], pitcher: pitching.data?.seasons ?? [] };

  // 기록 유형: 주소에 있으면 그것, 없으면 기록이 있는 쪽 (둘 다 있으면 타자)
  const type =
    params.get('type') === 'pitcher' || params.get('type') === 'batter'
      ? params.get('type')
      : seasonsByType.batter.length === 0 && seasonsByType.pitcher.length > 0
        ? 'pitcher'
        : 'batter';
  const seasons = seasonsByType[type];
  const years = seasons.map((s) => s.season).sort((a, b) => b - a);
  const year = years.includes(Number(params.get('year'))) ? Number(params.get('year')) : years[0];
  const record = seasons.find((s) => s.season === year);

  const loading = batting.loading || pitching.loading;
  const loadError = batting.error ?? pitching.error;
  const lastSeason = [...seasonsByType.batter, ...seasonsByType.pitcher].sort((a, b) => b.season - a.season)[0];

  return (
    <>
      <PageHeader
        title="선수 정보·시즌 기록 수정"
        description="바꾼 칸만 서버로 보냅니다. 기록 사이의 규칙(타수 ≤ 타석 등)은 서버가 저장 전에 검사하고, 어긋나면 저장하지 않습니다."
      />

      <div className="container page-body admin-body">
        <p className="admin-back">
          <Link to="/admin" className="text-link">
            관리 첫 화면
          </Link>
        </p>

        {/* 1. 선수 고르기 */}
        <section className="section">
          <PlayerPicker
            label="수정할 선수"
            type="all"
            selected={
              playerId && {
                playerId,
                playerName: player?.playerName ?? (loading ? '불러오는 중…' : playerId),
                detail: lastSeason ? `ID ${playerId}, ${lastSeason.teamName} ${lastSeason.season}` : `ID ${playerId}`,
              }
            }
            onSelect={(p) => setParams({ id: p.playerId })}
            onClear={() => setParams({})}
          />
        </section>

        {playerId && (
          <StatusMessage
            loading={loading && !player}
            error={loadError}
            notFound="선수를 찾을 수 없습니다. 선수 ID를 확인해 주세요."
          />
        )}

        {player && (
          <>
            {/* 2. 기본 정보 */}
            <section className="section">
              <div className="section__head">
                <h2>기본 정보</h2>
                <Link to={`/players/${encodeURIComponent(playerId)}?type=${type}`} className="text-link">
                  선수 화면에서 보기
                </Link>
              </div>
              <PlayerInfoForm key={playerId} player={player} onSaved={reload} />
            </section>

            {/* 3. 시즌 기록 */}
            <section className="section">
              <div className="section__head">
                <h2>시즌 기록</h2>
              </div>

              <div className="toolbar">
                <SegmentedTabs
                  label="기록 유형"
                  options={PLAYER_TYPES.map((t) => ({ ...t, label: `${t.label} 기록` }))}
                  value={type}
                  onChange={(value) => update({ type: value, year: null })}
                />
                {years.length > 0 && (
                  <OptionSelect
                    label="시즌"
                    value={String(year)}
                    options={seasons
                      .slice()
                      .sort((a, b) => b.season - a.season)
                      .map((s) => ({ value: String(s.season), label: `${s.season} (${s.teamName})` }))}
                    onChange={(value) => update({ year: value })}
                  />
                )}
              </div>

              {years.length === 0 ? (
                <StatusMessage
                  empty
                  emptyText={`이 선수의 ${type === 'pitcher' ? '투수' : '타자'} 시즌 기록이 없습니다. 시즌 기록은 CSV 적재로 추가합니다.`}
                />
              ) : (
                <RecordForm
                  key={`${playerId}-${type}-${year}`}
                  playerId={playerId}
                  type={type}
                  record={record}
                  onSaved={reload}
                />
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

// ---------- 기본 정보 수정 폼 ----------
function PlayerInfoForm({ player, onSaved }) {
  const original = toFormValues(player, PLAYER_FIELDS);
  const [form, setForm] = useState(original);
  const [result, setResult] = useState(null); // { ok: boolean, text }
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const problem = formatError(PLAYER_FIELDS, form);
    if (problem) return setResult({ ok: false, text: problem });

    const changes = changedValues(PLAYER_FIELDS, form, player);
    if (Object.keys(changes).length === 0) return setResult({ ok: false, text: '바꾼 항목이 없습니다.' });

    setSaving(true);
    try {
      await updatePlayer(player.playerId, changes);
      setResult({ ok: true, text: `저장했습니다. (바꾼 항목: ${Object.keys(changes).length}개)` });
      onSaved();
    } catch (err) {
      setResult({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <FormFields fields={PLAYER_FIELDS} values={form} onChange={setForm} original={original} idPrefix="info" />
      <FormResult result={result} />
      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? '저장하는 중…' : '기본 정보 저장'}
        </button>
        <button type="button" className="button" onClick={() => setForm(original)}>
          되돌리기
        </button>
      </div>
      <p className="form-hint">선수 ID({player.playerId})는 바꿀 수 없습니다. 칸을 비우고 저장하면 그 값이 지워집니다.</p>
    </form>
  );
}

// ---------- 시즌 기록 수정 폼 ----------
function RecordForm({ playerId, type, record, onSaved }) {
  const fields = RECORD_FIELDS[type];
  const original = toFormValues(record, fields);
  const [form, setForm] = useState(original);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  // 다른 시즌을 고르면 메시지를 지운다
  useEffect(() => setResult(null), [record.season]);

  async function handleSubmit(event) {
    event.preventDefault();
    const problem = formatError(fields, form);
    if (problem) return setResult({ ok: false, text: problem });

    const changes = changedValues(fields, form, record);
    if (Object.keys(changes).length === 0) return setResult({ ok: false, text: '바꾼 기록이 없습니다.' });

    setSaving(true);
    try {
      // 서버가 기존 기록 + 바꾼 값으로 규칙을 검사한 뒤 저장하고, 비율을 다시 계산한 기록을 돌려준다
      const saved = await updateSeasonRecord(playerId, type, record.season, changes);
      const rates =
        type === 'pitcher'
          ? `평균자책점 ${formatStat('era', saved.era)}, WHIP ${formatStat('whip', saved.whip)}`
          : `타율 ${formatStat('avg', saved.avg)}, OPS ${formatStat('ops', saved.ops)}`;
      setResult({ ok: true, text: `${record.season} 시즌 기록을 저장했습니다. 다시 계산된 기록: ${rates}` });
      onSaved();
    } catch (err) {
      // 예) 400 "타수는 타석 이하여야 합니다." — DB 저장 전 서버 검증에서 막힌 경우
      setResult({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const rateNow =
    type === 'pitcher'
      ? `평균자책점 ${formatStat('era', record.era)}, WHIP ${formatStat('whip', record.whip)}`
      : `타율 ${formatStat('avg', record.avg)}, 출루율 ${formatStat('obp', record.obp)}, OPS ${formatStat('ops', record.ops)}`;

  return (
    <form className="card" onSubmit={handleSubmit} noValidate>
      <p className="record-now">
        {record.season} {record.teamName}, 현재 {rateNow}
      </p>
      <FormFields fields={fields} values={form} onChange={setForm} original={original} idPrefix={`rec-${type}`} />
      <FormResult result={result} />
      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? '저장하는 중…' : '시즌 기록 저장'}
        </button>
        <button type="button" className="button" onClick={() => setForm(original)}>
          되돌리기
        </button>
      </div>
      <p className="form-hint">서버가 검사하는 규칙: {RECORD_RULES[type].join(', ')}.</p>
    </form>
  );
}

function FormResult({ result }) {
  if (!result) return null;
  return (
    <p className={`form-message ${result.ok ? 'is-success' : 'is-error'}`} role={result.ok ? 'status' : 'alert'}>
      {result.text}
    </p>
  );
}
