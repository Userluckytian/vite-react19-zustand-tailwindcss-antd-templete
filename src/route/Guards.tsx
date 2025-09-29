import { useEffect } from "react";;
import { useLocation, useNavigate, useOutlet } from "react-router";
import nprogress from 'nprogress';
import Layout from "@/layout";
import { getLocalInfo } from "@/store/session-store";
import { message } from "antd";

function Guards() {
  const outlet = useOutlet();
  const navigate = useNavigate();
  const location = useLocation();
  const token = getLocalInfo('dmes_token');

  // 顶部进度条
  useEffect(() => {
    nprogress.start();
  }, []);

  useEffect(() => {
    nprogress.done();

    return () => {
      nprogress.start();
    };
  }, [location]);

  useEffect(() => {
    // 无权限退出
    if (location.pathname !== '/login' && !token) {
      const param = location.pathname?.length > 1 ? `?redirect=${location.pathname}${location.search}` : '';
      navigate(`/login${param}`);
      message.error('getout now!')
    }
  }, [location, navigate, token]);

  /** 渲染页面 */
  const renderPage = () => {
    if (token && location.pathname === '/login') {
      return <div>{outlet}</div>;
    }

    return <Layout />;
  };

  return (
    <>{renderPage()}</>
  );
}

export default Guards;
