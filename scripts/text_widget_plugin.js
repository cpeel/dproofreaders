export class TextWidgetPlugin {
    constructor(quill, settingsElement, onDoneSettings, editBox, scrollListeners) {
        this.quill = quill;
        this.settingsElement = settingsElement;
        this.onDoneSettings = onDoneSettings;
        this.editBox = editBox;
        this.scrollListeners = scrollListeners;
    }

    enter() {}

    leave() {}
}
