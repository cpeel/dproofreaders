export class TextWidgetPlugin {
    constructor(quill, extraSettings, onDoneSettings, editBox, scrollListeners) {
        this.quill = quill;
        this.extraSettings = extraSettings;
        this.onDoneSettings = onDoneSettings;
        this.editBox = editBox;
        this.scrollListeners = scrollListeners;
    }

    enter() {}

    leave() {}
}
