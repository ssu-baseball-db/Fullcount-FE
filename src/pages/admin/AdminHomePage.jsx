import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import SqlConsole from './SqlConsole.jsx';
import './AdminPages.css';

const TABS = [
  { value: 'data', label: '서비스 데이터 관리' },
  { value: 'sql', label: 'SQL 실행' },
];

/**
 * 관리 화면  /admin   (관리자만, RequireAdmin 으로 보호)
 * 탭 두 개:
 *   - 서비스 데이터 관리 (/admin)          : 선수 등록, 선수 정보·시즌 기록 수정 화면으로 이동
 *   - SQL 실행          (/admin?tab=sql)  : SQL 한 문장을 직접 입력해 실행 (POST /api/admin/sql-preview)
 * 고른 탭은 주소(?tab=)에 남겨서 새로고침하거나 주소를 공유해도 같은 탭이 열린다.
 */
export default function AdminHomePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'sql' ? 'sql' : 'data';

  const openTab = (value) => setParams(value === 'data' ? {} : { tab: value });

  return (
    <>
      <PageHeader
        title="관리"
        description={`${user.loginId} 계정(관리자)으로 선수와 시즌 기록을 관리하고, SQL을 직접 실행해 볼 수 있습니다.`}
      />
      <div className="container page-body admin-body">
        <div className="admin-tabs" role="tablist" aria-label="관리 메뉴">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`admin-tab-${item.value}`}
              aria-selected={tab === item.value}
              aria-controls={`admin-panel-${item.value}`}
              className={`admin-tabs__tab ${tab === item.value ? 'is-active' : ''}`}
              onClick={() => openTab(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`admin-panel-${tab}`} aria-labelledby={`admin-tab-${tab}`}>
          {tab === 'sql' ? <SqlConsole onOpenDataTab={() => openTab('data')} /> : <DataMenu />}
        </div>
      </div>
    </>
  );
}

function DataMenu() {
  return (
    <>
      <p className="admin-tabs__desc">실제 서비스 DB의 선수와 시즌 기록을 등록·수정합니다. 저장하면 바로 화면에 반영됩니다.</p>
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
    </>
  );
}
