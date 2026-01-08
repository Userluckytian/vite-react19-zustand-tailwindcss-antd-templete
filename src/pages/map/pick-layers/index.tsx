import React, { use, useEffect } from "react";
import "./index.scss";
import CustomIcon from "@/components/custom-icon";

interface DrawLayer {
  id: string;
  name: string;
  layer: any;
  visible: boolean;
  type: string;
}

interface MapLayerPanelProps {
  drawLayers: DrawLayer[];
  onToggleLayer: (id: string) => void;
  onRemoveLayer: (id: string) => void;
  onHoverLayer: (id: string) => void;
  onLeaveLayer: () => void;
}

const MapLayerPanel = ({
  drawLayers,
  onToggleLayer,
  onRemoveLayer,
  onHoverLayer,
  onLeaveLayer,
}: MapLayerPanelProps) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const togglePanel = () => {
    setIsExpanded(!isExpanded);
  };
  useEffect(() => {
    console.log(isExpanded);
  }, [isExpanded]);
  return (
    <div className={`layers-panel ${isExpanded ? "expanded" : "collapsed"}`}>
      <div className="panel-header" onClick={togglePanel}>
        <h3>绘制图形面板</h3>
        <span className="toggle-icon">{isExpanded ? "▲" : "▼"}</span>
      </div>
      {isExpanded && (
        <div className="panel-content">
          {drawLayers.length === 0 ? (
            <div className="no-layers">暂无绘制图形</div>
          ) : (
            <div className="layer-list">
              {drawLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="layer-item"
                  onMouseEnter={() => onHoverLayer(layer.id)}
                  onMouseLeave={onLeaveLayer}
                >
                  <div className="layer-name">{layer.name}</div>
                  <div className="layer-actions">
                    <button
                      className={`action-btn toggle-btn ${layer.visible ? "visible" : "hidden"
                        }`}
                      onClick={() => onToggleLayer(layer.id)}
                      title={layer.visible ? "隐藏" : "显示"}
                    >
                      {layer.visible ? "隐藏" : "显示"}
                    </button>
                    <button
                      className="action-btn remove-btn"
                      onClick={() => onRemoveLayer(layer.id)}
                      title="移除"
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapLayerPanel;
