import { createHashRouter, Navigate } from "react-router";
import { lazy, type ReactElement } from "react";
import LazyLoadComp from "./lazyLoadComp";
import { sleep } from "@/utils/utils";
import Guards from "./Guards";
const router = createHashRouter(
    [
        // path为空时，重定向到layout
        { path: '', element: <Navigate to="/welcome" /> },
        // 使用LazyLoadComp动态加载页面
        {
            path: '/login',
            element: LazyLoadComp(lazy(() => import("@/pages/login"))),
        },
        {
            path: '/welcome',
            element: LazyLoadComp(lazy(() => import("@/pages/welcome"))),
        },
        {
            path: '/layout',
            element: <Guards>{LazyLoadComp(lazy(() => import("@/layout"))) as ReactElement}</Guards>,
            children: [
                { index: true, element: LazyLoadComp(lazy(() => import("@/pages/home"))) },
                {
                    path: "teams/:teamId", // 这里要么写的时候不带/，如果带了/，就要把/layout也带上，即写完整
                    action: async ({ params }) => {
                        await sleep(3000);
                        let team = await Promise.resolve({ age: 18, name: 'xiao', teamId: params.teamId });
                        return team;
                    },
                    loader: async ({ params }) => {
                        await sleep(3000);
                        let team = await Promise.resolve({ age: 18, name: 'xiao', teamId: params.teamId });
                        return team;
                    },
                    // loader: ({ params }) => {
                    //     return { age: 18, name: 'xiao ming', teamId: params.teamId };
                    // },
                    // Component: RouteDemo,
                    element: LazyLoadComp(lazy(() => import('@/pages/demos/route-demo')))
                },
                { path: "demoOne", element: LazyLoadComp(lazy(() => import("@/pages/demos/demo1"))) },
                { path: "demoTwo", element: LazyLoadComp(lazy(() => import("@/pages/demos/demo2"))) },
                { path: "demoThree", element: LazyLoadComp(lazy(() => import("@/pages/demos/scroll-load-from-comp"))) },
                { path: "404", element: LazyLoadComp(lazy(() => import("@/components/NotFoundPage"))) }
            ]
        },
        {
            path: "/*",
            element: LazyLoadComp(lazy(() => import("@/components/NotFoundPage"))),
        }
    ]
);

export default router;