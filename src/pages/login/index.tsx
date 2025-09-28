import { App, Button, Checkbox, Flex, Form, Input, message } from "antd";
import "./index.scss"
import { LockOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";

import logo from "@/assets/images/logo.png"
import bgPng from "@/assets/images/bg.png"
import { createVCode, type VCodeType } from "@/utils/valid-code"
import { useEffect, useState } from "react";
// import userCenterService, { LoginUser } from "@/services/impl/userCenterService";
// import { uesAppDispatch } from "@/store/hooks";
import { useNavigate } from "react-router";

const Login = ({ }) => {
    const isProd = process.env.NODE_ENV === "production";
    const navigate = useNavigate()
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const dispatch = uesAppDispatch();
    const [loading, setLoading] = useState(false);
    const [vCodeInfo, setVCodeInfo] = useState<VCodeType>({
        code: "",
        dataURL: ""
    })
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
            const loginParams: LoginUser = {
                userName: values.username,
                password: values.password,
            };
            userCenterService.login(loginParams).then((res: any) => {
                if (res.status === 200) {
                    // 0：存储token，接口请求需要
                    localStorage.setItem("dmes_token", res.data.userToken);
                    // 1：存储用户信息
                    // dispatch(setCurUser(res.data));
                    // 2： 导航到对应位置
                    navigate("/layout");
                    // 3： 在其他地方---获取用户信息的方式： 
                    // import { useAppSelector } from "@/store/hooks";
                    // const userInfo = useAppSelector((state) => state.user.account); // 用户信息
                } else {
                    message.error(res.message);
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
    useEffect(() => {
        createNewVCode()
    }, [])
    return (
        <div className="login-container">
            <div className="login-name">
                <img src={logo} />
                {webConfig.systemTitle}
            </div>
            <div className="contents">
                <div className="bg-content">
                    <img src={bgPng} alt="" />
                </div>
                <div className="login-content">
                    <div className="login-form">
                        <span className="login-title">欢迎登录</span>
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
                                help={isProd ? undefined  : 'tip: 开发环境无需输入验证码'}
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
