import React, { useState } from 'react';
import './index.scss';
import CustomIcon from '@/components/custom-icon';

const FunctionPanel = () => {
    const [isExpanded, setIsExpanded] = useState(true);

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
                            <li className="completed">✔ 【裁剪-clip】选择一个或者多个图层，绘制一条穿过它们的折线，拆分图层</li>
                            <li className="completed">✔ 【合并-union】选择多个图层，点击合并按钮，实现图层的合并操作</li>
                            <li className="pending">【整形要素工具： Reshape Feature】</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FunctionPanel;