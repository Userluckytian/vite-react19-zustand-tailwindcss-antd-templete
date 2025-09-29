import { useLoaderData, useParams } from "react-router";
import { useNavigate } from "react-router";
export default function RouteDemo() {
    const navigate = useNavigate();
    // 1: 获取loader的数据
    let data = useLoaderData();
    console.log('data', data);
    // 2：获取params数据
    let params = useParams();
    console.log('params', params);

    return (
        <div onClick={() => navigate('/layout')}>点我返回首页</div>
    )
}
