class A {

    // #region 编辑点marker的配置信息

    /**
     * 更新编辑配置
     * @param options 编辑配置
     */
    public updateEditOptions(options: EditOptionsExpends): void {
        // 深度合并配置
        this.mergeEditOptions(options);

        // 如果正在编辑，需要重新渲染
        if (this.currentState === EditorState.Editing) {
            const currentCoords = this.getCurrentMarkerCoords();
            this.reBuildMarkerAndRender(currentCoords);
        }
    }

    /** 强制停用编辑状态（但不改变激活状态）
     *
     */
    protected forceExitEditMode(): void {
        // console.log('强制退出编辑模式:', this.constructor.name);
        this.exitEditMode();
        if (this.currentState === EditorState.Editing) {
            this.updateAndNotifyStateChange(EditorState.Idle);
        }
        this.isDraggingPolygon = false;
        this.dragStartLatLng = null;
    }

    /**
     * 设置是否启用编辑
     * @param enabled 是否启用
     */
    public setEditEnabled(enabled: boolean): void {
        const oldEnabled = this.polygonEditOptions.enabled;

        if (oldEnabled !== enabled) {
            this.polygonEditOptions.enabled = enabled;

            // 如果从启用变为禁用，且正在编辑，强制退出编辑模式
            if (oldEnabled && !enabled && this.currentState === EditorState.Editing) {
                this.forceExitEditMode();
            }

            // // 如果从禁用变为启用，且当前是空闲状态，可以重新激活（可选）
            // if (!oldEnabled && enabled && this.currentState === EditorState.Idle) {
            //     // 这里可以根据需求决定是否自动进入编辑模式
            //     console.log('编辑功能已启用，双击图形可进入编辑模式');
            // }
        }
    }
 

    // #endregion


}