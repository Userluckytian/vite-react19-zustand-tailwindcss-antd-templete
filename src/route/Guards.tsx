// 拔插组件按道理来说是不用增加login和register路由的处理逻辑的，因为一般也不会写道哪些上面，所以下面的逻辑实际还可以迭代!
import { useEffect, useState, type JSX } from "react";
import { useLocation, useNavigate, useOutlet, useSearchParams } from "react-router";
import { getLocalInfo } from "@/store/session-store";
import NProgress from "@/route/npprogress";
import NoAuthPage from "@/components/NoAuthPage";

function Guards({ children }: { children: JSX.Element }) {
  const outlet = useOutlet();
  const navigate = useNavigate();
  const location = useLocation();
  // 单点登录时，需要获取参数
  const [searchParams] = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  console.log('====');

  const token: string = getLocalInfo('dmes_token');

  const validToken = async (token: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 这里应该是实际的 token 验证逻辑
        resolve(!!token); // 简单示例：有 token 就认为有效
      }, 1000);
    });
  };

  useEffect(() => {
    const checkAuth = async () => {
      console.log('5');
      NProgress.start();
      setIsLoading(true);

      try {
        // 逻辑1：如果是登录、注册页面且没有token，直接放行
        if (['/login', '/register'].includes(location.pathname) && !token) {
          setIsAuthorized(true);
          setAuthChecked(true);
          return;
        }

        // 逻辑2：尝试获取 token（从 URL 参数或本地存储，优先从 URL 参数获取）
        let currentToken = searchParams.get("token");
        if (!currentToken) {
          currentToken = token;
        }

        // 逻辑3：验证 token
        if (currentToken) {
          const isValid = await validToken(currentToken);
          console.log('3');

          setIsAuthorized(isValid);

          // 如果有 token 但访问登录页，重定向到首页
          if (isValid && ['/login', '/register'].includes(location.pathname)) {
            navigate('/', { replace: true });
            return;
          }
        } else {
          // 没有 token 且不是登录页，重定向到登录页
          if (!['/login', '/register'].includes(location.pathname)) {
            const param = location.pathname?.length ? `?redirect=${location.pathname}${location.search}` : '';
            navigate(`/login${param}`, { replace: true });
            return;
          }
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthorized(false);
      } finally {
        setAuthChecked(true);
        setIsLoading(false);
        NProgress.done();
      }
    };

    checkAuth();
  }, [location.pathname, token, navigate, searchParams]);

  // 显示加载状态
  if (isLoading) {
    console.log('1');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">权限验证中...</p>
        </div>
      </div>
    );
  }

  // 未授权且已完成验证
  if (authChecked && !isAuthorized) {
    console.log('2');
    return <NoAuthPage />;
  }

  // 授权通过，渲染子组件
  if (authChecked && isAuthorized) {
    console.log('4');
    // 如果是登录/注册页面且有 token，显示 outlet（会被重定向）
    if (['/login', '/register'].includes(location.pathname) && token) {
      return <div>{outlet}</div>;
    }
    return children;
  }

  // 默认情况
  return null;
}

export default Guards;