import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBox.css';

/**
 * 선수·팀 검색창. 검색하면 /search?q=검색어 로 이동한다.
 * size: 'large'(메인 화면) | 'small'(헤더)
 */
export default function SearchBox({ size = 'large' }) {
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault(); // 폼 기본 동작(새로고침) 막기
    const trimmed = keyword.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form className={`search-box search-box--${size}`} onSubmit={handleSubmit} role="search">
      <label htmlFor={`search-${size}`} className="visually-hidden">
        선수 또는 팀 검색
      </label>
      <input
        id={`search-${size}`}
        type="search"
        placeholder="선수 이름이나 팀 이름"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        autoComplete="off"
      />
      <button type="submit">검색</button>
    </form>
  );
}
