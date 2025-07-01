import { useLoaderData, useParams } from "react-router";

export default function RouteDemo() {
    // 1: 获取loader的数据
    let data = useLoaderData();
    console.log('data', data);
    // 2：获取params数据
    let params = useParams();
    console.log('params', params);

    return (
        <div>RouteDemo</div>
    )
}
