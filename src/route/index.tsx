import { createBrowserRouter } from "react-router";


import { lazy } from "react";
import LazyLoadComp from "./lazyLoadComp";
import RouteDemo from "@/pages/route-demo";
import { sleep } from "@/utils/utils";


const router = createBrowserRouter(
    [
        {
            path: '',
            element: LazyLoadComp(lazy(() => import("@/layout"))),
            children: [
                { index: true, element: LazyLoadComp(lazy(() => import("@/pages/home"))) },
                {
                    path: "/teams/:teamId",
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
                    element: LazyLoadComp(lazy(()=>import('@/pages/route-demo')))
                },
                { path: "404", element: LazyLoadComp(lazy(() => import("@/components/NotFoundPage"))) }
            ]
        }
    ]
);

export default router;