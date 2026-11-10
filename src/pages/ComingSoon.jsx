import { Link } from 'react-router-dom';

// 아직 만들지 않은 화면에 임시로 보여주는 페이지
export default function ComingSoon({ title }) {
  return (
    <div className="container" style={{ padding: '64px 24px' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: '1.75rem' }}>{title}</h1>
      <p style={{ color: 'var(--muted)' }}>이 화면은 준비 중입니다.</p>
      <Link to="/" style={{ textDecoration: 'underline' }}>
        메인 화면으로 돌아가기
      </Link>
    </div>
  );
}
