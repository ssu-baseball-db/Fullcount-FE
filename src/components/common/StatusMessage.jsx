import './StatusMessage.css';

/**
 * API 에러를 사람이 읽을 문장으로 바꾼다.
 * notFound: 404 일 때 보여줄 문장 (예: '선수를 찾을 수 없습니다.')
 */
export function errorText(error, { notFound } = {}) {
  if (!error) return '';
  if (error.status === 404 && notFound) return notFound;
  return error.message || '기록을 불러오지 못했습니다.';
}

/**
 * 불러오는 중 / 에러 / 빈 결과 안내를 한 가지 모양으로 보여준다.
 * 보여줄 것이 없으면 null 을 돌려주므로 페이지에서 그냥 넣어 두면 된다.
 *   <StatusMessage loading={loading} error={error} empty={rows.length === 0} emptyText="기록이 없습니다." />
 */
export default function StatusMessage({ loading, error, empty, emptyText, notFound, loadingText = '불러오는 중…' }) {
  if (error) {
    return (
      <p className="status status--error" role="alert">
        {errorText(error, { notFound })}
      </p>
    );
  }
  if (loading) return <p className="status">{loadingText}</p>;
  if (empty) return <p className="status">{emptyText}</p>;
  return null;
}
