import { createBrowserRouter } from "react-router";


import { lazy } from "react";
import LazyLoadComp from "./lazyLoadComp";


const router = createBrowserRouter(
    [
        {
            path: '',
            element: LazyLoadComp(lazy(() => import("../layout"))),
            children: [
                { index: true },
                { path: "home", element: LazyLoadComp(lazy(() => import("../pages/home"))) },
                { path: "404", element: LazyLoadComp(lazy(() => import("../components/NotFoundPage"))) }
            ]
        }
    ]
);

export default router;