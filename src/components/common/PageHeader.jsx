import './PageHeader.css';

/**
 * 페이지 맨 위 녹색 띠 (메인 화면의 전광판과 같은 색)
 * title: 페이지 제목, description: 한 줄 설명, children: 제목 아래에 넣을 추가 정보
 */
export default function PageHeader({ title, description, aside, children }) {
  return (
    <section className="page-header">
      <div className="container page-header__inner">
        <div>
          <h1>{title}</h1>
          {description && <p className="page-header__desc">{description}</p>}
          {children}
        </div>
        {aside && <div className="page-header__aside">{aside}</div>}
      </div>
    </section>
  );
}
