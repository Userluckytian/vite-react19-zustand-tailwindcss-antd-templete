import React, { useState } from 'react';
import './index.scss';
import CustomIcon from '@/components/custom-icon';

const FunctionPanel = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    const togglePanel = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className={`function-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="panel-header" onClick={togglePanel}>
                <h3>图形编辑功能说明</h3>
                <span className="toggle-icon">
                    {isExpanded ? '▲' : '▼'}
                </span>
            </div>

            {isExpanded && (
                <div className="panel-content">
                    <h3 className='text-xl font-bold mb-2'>功能模块1：绘制、测量功能</h3>
                    <div className="function-section">
                        <ul className="function-list">
                            <li className="completed">✔ 绘制marker点 <CustomIcon type='icon-biaodian_1' /></li>
                            <li className="completed">✔ 绘制线 <CustomIcon type='icon-biaoxian_1' /></li>
                            <li className="completed">✔ 绘制矩形 <CustomIcon type='icon-huajuxing_0' /></li>
                            <li className="completed">✔ 绘制圆形 <CustomIcon type='icon-huayuan_0' /></li>
                            <li className="completed">✔ 绘制多边形面 <CustomIcon type='icon-biaomian_0' /></li>
                            <li className="completed">✔ 距离测量 <CustomIcon type='icon-ceju_0' /></li>
                            <li className="completed">✔ 面积测量 <CustomIcon type='icon-cemian_0' /></li>
                        </ul>
                    </div>

                    <h3 className='text-xl font-bold mb-2'>功能模块2：图形编辑功能</h3>
                    <div className="function-section">
                        <div className="instruction-section">
                            <h4>操作说明：</h4>
                            <ol className="instruction-list">
                                {/* <li><strong>点击：</strong> <CustomIcon type='icon-huizhiduobianxing1-copy' />、<CustomIcon type='icon-juxinghuizhi1-copy' />开始绘制可以被编辑的多边形（仅支持单面的多边形的编辑）</li> */}
                                <li><strong>点击：</strong> <CustomIcon type='icon-huizhiduobianxing1' />、<CustomIcon type='icon-juxinghuizhi1' />开始绘制可以被编辑的多边形。（除了支持单多边形的编辑外，还支持外部传入多面、环形挖孔等复杂多边形的编辑）</li>
                                <li><strong>双击</strong>刚才绘制的多边形，激活编辑功能（需要手动点击保存按钮保存更改）</li>
                            </ol>
                        </div>
                        <ul className="function-list">
                            <li className="completed">✔ 【编辑点】拖动顶点，以及右键实现顶点移除</li>
                            <li className="completed">✔ 【中点插入】点击线中间的点，实现添加新的点</li>
                            <li className="completed">✔ 【拖动面】可以拖动整个面移动</li>
                            <li className="completed">✔ 【快捷键】关联键盘事件</li>
                            <li className="completed">✔ 【撤销】撤销刚才的操作</li>
                            <li className="completed">✔ 【重做】恢复刚才的操作</li>
                        </ul>
                    </div>
                    <h3 className='text-xl font-bold mb-2'>功能模块3：图形拓扑功能</h3>
                    <div className="function-section">
                        <ul className="function-list">
                            <li className="completed">✔ 【裁剪-clip】选择一个或者多个图层，绘制一条穿过它们的折线，拆分图层（结果仅在控制台输出）</li>
                            <li className="completed">✔ 【合并-union】选择多个图层，点击合并按钮，实现图层的合并操作（结果仅在控制台输出）</li>
                            <li className="doing">🌀 【整形要素工具： Reshape Feature】参见： <a href="https://pro.arcgis.com/en/pro-app/latest/help/editing/reshape-a-feature.htm?utm_source=copilot.com" target="Reshape-Feature-page">Reshape a line or polygon feature</a>
                                <ul className='text-amber-600'>原则上应该要支持以下内容：
                                    <li>①：支持线、面的重塑处理。（目前：仅支持面）</li>
                                    <li>②：【Allow reshaping without a selection】允许无选择重塑。（目前：仅支持先选择再重塑）</li>
                                    <li>③：【Show Preview】实时预览reshape效果，便于判断结果是否符合预期。（目前：不支持）</li>
                                    <li>④：【Reshape with single intersection】仅限线要素，允许单一交叉点重塑。（目前：我们暂时只做了支持面，暂时项目中不怎么用，先不做）</li>
                                    <li>⑤：【Choose result on finish】完成后，由用户来选择要保留的部分。（目前：自动保留周长最大的特征，用户想要自己选择保留的部分）</li>
                                </ul>
                            </li>
                            <li className="pending">【magic魔棒选择要素工具】</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FunctionPanel;