import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import './AdminPages.css';

/**
 * 관리 첫 화면  /admin   (관리자만, RequireAdmin 으로 보호)
 */
export default function AdminHomePage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader title="관리" description={`${user.loginId} 계정(관리자)으로 선수와 시즌 기록을 관리합니다.`} />
      <div className="container page-body">
        <ul className="admin-menu">
          <li>
            <Link to="/admin/players/new" className="admin-menu__item">
              <span className="admin-menu__title">선수 등록</span>
              <span className="admin-menu__desc">원본 선수 ID와 이름으로 새 선수를 등록합니다.</span>
              <span className="admin-menu__api">POST /api/admin/players</span>
            </Link>
          </li>
          <li>
            <Link to="/admin/players/edit" className="admin-menu__item">
              <span className="admin-menu__title">선수 정보·시즌 기록 수정</span>
              <span className="admin-menu__desc">
                선수를 찾아 기본 정보(생년월일, 키 등)와 타자·투수 시즌 누적 기록을 고칩니다. 타율·ERA 같은 비율은 저장 후
                다시 계산됩니다.
              </span>
              <span className="admin-menu__api">
                PATCH /api/admin/players/&#123;id&#125;, …/batting-stats/&#123;year&#125;, …/pitching-stats/&#123;year&#125;
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}
