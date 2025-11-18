export type InteractionMode =
  | 'idle'       // 空闲状态
  | 'draw'       // 绘制面
  | 'edit'       // 编辑模式（激活后才显示编辑工具条）
  | 'topo'       // 拓扑模式（裁剪、合并）
  | 'delete';    // 删除当前绘制图形

class InteractionModeManager {
  private static instance: InteractionModeManager;
  private mode: InteractionMode = 'idle';
  private listeners: Set<(mode: InteractionMode) => void> = new Set();

  private constructor() {}

  static getInstance(): InteractionModeManager {
    if (!InteractionModeManager.instance) {
      InteractionModeManager.instance = new InteractionModeManager();
    }
    return InteractionModeManager.instance;
  }

  /** 设置当前模式，并通知所有监听者 */
  public setMode(mode: InteractionMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.listeners.forEach(fn => fn(this.mode));
  }

  /** 获取当前模式 */
  public getMode(): InteractionMode {
    return this.mode;
  }

  /** 重置为 idle 模式 */
  public reset(): void {
    this.setMode('idle');
  }

  /** 添加模式监听器 */
  public onModeChange(callback: (mode: InteractionMode) => void): void {
    this.listeners.add(callback);
    callback(this.mode); // 立即触发一次
  }

  /** 移除监听器 */
  public offModeChange(callback: (mode: InteractionMode) => void): void {
    this.listeners.delete(callback);
  }

  /** 清空所有监听器 */
  public clearListeners(): void {
    this.listeners.clear();
  }
}

export const modeManager = InteractionModeManager.getInstance();
