import type { BaseEditor } from "../edit/BaseEditor";
import { PolygonEditorState } from "../types";


class EditorRegistry {
    private static instance: EditorRegistry;
    private editors: Set<BaseEditor> = new Set();
    private currentEditingEditor: BaseEditor | null = null;

    public static getInstance(): EditorRegistry {
        if (!EditorRegistry.instance) {
            EditorRegistry.instance = new EditorRegistry();
        }
        return EditorRegistry.instance;
    }

    // 注册编辑器实例
    public registerEditor(editor: BaseEditor): void {
        this.editors.add(editor);
        
        // 监听编辑器的状态变化
        editor.onStateChange((state) => {
            if (state === PolygonEditorState.Editing) {
                // 自动停用其他正在编辑的编辑器
                this.setEditingEditor(editor);
            } else if (state === PolygonEditorState.Idle && this.currentEditingEditor === editor) {
                // 当前编辑的编辑器退出编辑状态
                this.currentEditingEditor = null;
            }
        });
    }

    // 注销编辑器
    public unregisterEditor(editor: BaseEditor): void {
        this.editors.delete(editor);
        if (this.currentEditingEditor === editor) {
            this.currentEditingEditor = null;
        }
    }

    // 设置当前编辑的编辑器（自动停用其他）
    private setEditingEditor(editor: BaseEditor): void {
        if (this.currentEditingEditor === editor) return;

        // 停用之前正在编辑的编辑器
        if (this.currentEditingEditor) {
            this.currentEditingEditor.commitEdit();
        }

        // 设置新的编辑编辑器
        this.currentEditingEditor = editor;
        
        // 停用所有其他编辑器的编辑状态
        this.editors.forEach(e => {
            if (e !== editor && e.getCurrentState() === PolygonEditorState.Editing) {
                e.commitEdit();
            }
        });
    }

    // 获取当前正在编辑的编辑器
    public getCurrentEditingEditor(): BaseEditor | null {
        return this.currentEditingEditor;
    }

    // 停用所有编辑器的编辑状态
    public deactivateAllEditors(): void {
        this.editors.forEach(editor => {
            if (editor.getCurrentState() === PolygonEditorState.Editing) {
                editor.commitEdit();
            }
        });
        this.currentEditingEditor = null;
    }
}

export const editorRegistry = EditorRegistry.getInstance();