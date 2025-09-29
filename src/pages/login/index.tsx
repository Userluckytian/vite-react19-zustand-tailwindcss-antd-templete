import { App, Button, Checkbox, Flex, Form, Input, message } from "antd";
import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";

import logo from "@/assets/images/logo.png"
import bgPng from "@/assets/images/bg.png"
import { createVCode, type VCodeType } from "@/utils/valid-code"
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { setLocalInfo } from "@/store/session-store";
import { useUserStoreSample } from "@/store/zustand-store/userStore_sample";
const Login = ({ }) => {
    const isProd = process.env.NODE_ENV === "production";
    const navigate = useNavigate()
    const { search } = useLocation()
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [vCodeInfo, setVCodeInfo] = useState<VCodeType>({
        code: "",
        dataURL: ""
    })
    const { setUserInfo_sample } = useUserStoreSample()
    const onFinish = (values: any) => {
        form.validateFields().then(() => {
            if (isProd) {
                if (vCodeInfo.code.toLowerCase() !== values.code.toLowerCase()) {
                    message.error("验证码错误，请重新输入")
                    createNewVCode();
                    return;
                }
            }
            setLoading(true);
            const loginParams: any = {
                userName: values.username,
                password: values.password,
            };
            Promise.resolve().then((res: any) => {
                const newRes: any = {
                    status: 200,
                    data: {
                        userToken: '123',
                        userInfo: {
                            id: 1,
                            username: '222333',
                            email: '123@163.com',
                            phone: '13843838438',
                        }
                    },
                    message: '成功'
                }
                if (newRes.status === 200) {
                    // 0：存储token，接口请求需要
                    setLocalInfo('dmes_token', newRes.data.userToken);
                    // 1：存储用户信息
                    setUserInfo_sample({ ...newRes.data.userInfo });
                    // 2：如果存在重定向, 导航到对应位置
                    if (search?.includes('?redirect=')) {
                        const url = getRedirectUrl();
                        if (url) {
                            navigate(url);
                            return;
                        }
                    } else {
                        navigate("/layout");
                    }
                } else {
                    message.error(newRes.message);
                    createNewVCode();
                }
            }).finally(() => {
                setLoading(false);
            })
        })
    };
    const createNewVCode = () => {
        const info = createVCode()
        setVCodeInfo({
            ...info
        })
    }

    /** 获取重定向路由 */
    const getRedirectUrl = () => {
        const key = '?redirect=';
        const start = search.includes(key) ? search.indexOf(key) + 10 : 0;
        const end = search.includes('&') ? search.indexOf('&') : search.length;
        return search.substring(start, end);
    };

    useEffect(() => {
        createNewVCode()
    }, [])
    return (
        <div className="w-full h-full flex relative">
            <div className="absolute flex items-center text-2xl p-[20px] font-bold text-gray-100">
                <img src={logo} className="w-21 h-full" />
                {webConfig.systemTitle}
            </div>
            <div className="w-full h-full min-w-[1280px] overflow-hidden flex  bg-gradient-to-br from-[#256bc1] to-[#071d95]">
                <div className="flex-1 flex-shrink-0 basis-3/5 flex-grow-0 w-3/5 flex items-center justify-center">
                    <img src={bgPng} alt="" className="w-4/5 h-auto" /> {/* 修正图片类名 */}
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="bg-white w-[400px] h-[400px] flex flex-col items-center justify-center shadow-lg rounded">
                        <span className="mb-5 font-bold text-xl">欢迎登录</span>
                        <Form
                            form={form}
                            name="login"
                            initialValues={{ remember: true }}
                            style={{ width: "85%" }}
                            onFinish={onFinish}
                            autoComplete="off"
                        >
                            <Form.Item
                                name="username"
                                rules={[{ required: true, message: '请输入用户名' }]}
                            >
                                <Input size="large" prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="用户名" />
                            </Form.Item>
                            <Form.Item
                                name="password"
                                rules={[{ required: true, message: '请输入密码' }]}
                            >
                                <Input.Password size="large" prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="密码" />
                            </Form.Item>
                            <Form.Item
                                name="code"
                                rules={[{ required: isProd ? true : false, message: '请输入验证码' }]}
                                help={isProd ? undefined : 'tip: 开发环境无需输入验证码'}
                            >
                                <Input
                                    placeholder="验证码"
                                    prefix={<SafetyCertificateOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                                    suffix={
                                        <img src={vCodeInfo.dataURL} alt="" onClick={createNewVCode} />
                                    }
                                />

                            </Form.Item>
                            <Form.Item>
                                <Button block size="large" type="primary" htmlType="submit" loading={loading}>
                                    {loading ? '正 在 登 录' : '登 录'}
                                </Button>
                            </Form.Item>
                        </Form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
