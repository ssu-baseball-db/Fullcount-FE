import { useEffect, useState } from 'react';

/**
 * API를 불러오고 { data, loading, error } 를 돌려주는 커스텀 훅.
 *
 * 사용 예)
 *   const { data, loading, error } = useApi(() => fetchStandings(year), [year]);
 *
 * deps 배열 안의 값(예: year)이 바뀔 때마다 다시 불러온다.
 * { enabled: false } 를 넘기면 요청하지 않는다. (예: 선수 두 명을 다 고르기 전)
 */
export default function useApi(requestFn, deps, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    // 응답이 늦게 도착했는데 그 사이 조건(시즌 등)을 바꿨다면, 늦은 응답은 무시한다.
    let ignore = false;

    setLoading(true);
    setError(null);

    requestFn()
      .then((result) => {
        if (!ignore) setData(result);
      })
      .catch((err) => {
        if (!ignore) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, loading, error };
}
