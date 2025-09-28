import type { AxiosRequestConfig } from "axios";
import axiosInstance from "./axios";
import { debounce } from "@/utils/utils";


interface customRequestOptions extends AxiosRequestConfig<any> {
    debounce?: boolean; // 是否开启防抖动
    debounceTime?: number; // 防抖动时间
    throttle?: boolean; // 是否开启节流
    throttleTime?: number; // 节流时间
    canAbort?: boolean; // 是否可以取消请求
};

function GET(url: string, options: customRequestOptions) {
    const apiRequest = axiosInstance.get(url, options)
    if (options.debounce) {
        debounce(()=>{
            return apiRequest;
        }, options.debounceTime)
    } else if (options.throttle) {
        // 节流逻辑
        
    } else if (options.canAbort) {
        const controller = new AbortController();
    }else {
        // 直接发起请求逻辑
    }

}
function POST() {

}

function UPDATE() {

}

// 小写的delete是保留字，所以这里用大写的DELETE
function DELETE() {

}