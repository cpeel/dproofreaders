/* global hide */

import { TextWidgetPlugin } from "./text_widget_plugin.js";
import translate from "./gettext.js";
import { ajax } from "./api.js";

const WC_WORLD = 1;
const puncCharacters = ".,;:?!*/()#@%+=[]{}<>\"$|_¬¢£¥©®§°±¶·'´¸º×¦¡¿-»«¯÷¹²³¼½¾¤";

export class WordCheckPlugin extends TextWidgetPlugin {
    acceptedWords = [];
    wordChecked = false;
    caretPos = 0;
    acceptableWord = "";
    pageText = "";
    enableOnChange = false;

    // on change, delay, then reload. If change again restart delay.
    // Avoid caret misplaced after reload:
    timerID = null;

    constructor(quill, extraSettings, onDoneSettings, editBox, scrollListeners, projectId, languagesWithDictionaries, projectLanguages) {
        super(quill, extraSettings, onDoneSettings, editBox, scrollListeners);
        this.projectId = projectId;
        this.languagesWithDictionaries = languagesWithDictionaries;
        this.projectLanguages = projectLanguages;

        this.languages = [projectLanguages[0]];

        // Build the dictionaries listing for the Settings dialog
        this.dictGrid = document.createElement("div");
        this.dictGrid.classList.add("grid-3col");
        let dictColumn = document.createElement("div");
        let dictsPerColumn = Math.ceil(Object.values(languagesWithDictionaries).length / 3);
        let dictIndex = 0;
        for (const language of Object.values(languagesWithDictionaries)) {
            if (dictIndex != 0 && dictIndex % dictsPerColumn == 0) {
                this.dictGrid.append(dictColumn);
                dictColumn = document.createElement("div");
            }

            const cBox = document.createElement("input");
            cBox.type = "checkbox";
            if (language === projectLanguages[0]) {
                cBox.checked = true;
            }
            const label = document.createElement("label");
            label.classList.add("nowrap");
            label.append(cBox, language);
            dictColumn.append(label);
            dictColumn.append(document.createElement("br"));
            dictIndex += 1;
        }
        this.dictGrid.append(dictColumn);
        this.dictionaries = document.createElement("div");
        this.dictionaries.append(translate.gettext("Dictionaries") + ":");
        this.dictionaries.appendChild(this.dictGrid);

        this.acceptButton = document.createElement("button");
        this.acceptButton.type = "button";
        this.acceptButton.classList.add("wc_accept_button");
        this.acceptButton.innerText = translate.gettext("Accept");
        this.acceptButton.addEventListener("click", this.acceptWord.bind(this));
        this.acceptButton.addEventListener("keydown", this.keyAcceptWord.bind(this));
        this.editBox.append(this.acceptButton);

        this.scrollListeners.add(this.maybeShowAcceptButton.bind(this));
    }

    setLanguages() {
        this.languages.length = 0;
        const langCheckBoxes = this.dictGrid.getElementsByTagName("input");
        for (const box of langCheckBoxes) {
            if (box.checked) {
                this.languages.push(box.nextSibling.textContent);
            }
        }
        this.wordCheck();
    }

    splitText(text) {
        //const base = "\\w{1,2}";    // pattern for: markable base character
        //const mark = '[=:.`\'v)(~,^*]'; // pattern for: diacritical mark
        //const bracketedCharacterPattern = `\\[(?:oe|OE|${mark}${base}|${base}${mark})\\]`;
        //const charPattern = `(?:\\p{L}\\p{M}*|${bracketedCharacterPattern})`;
        const charPattern = "(?:\\p{L}\\p{M}*)";
        // This is used when splitting a text into words.
        const wordPattern = new RegExp(`${charPattern}+(?:'${charPattern}+)*`, "ug");
        //        const wordPattern = /(?:\w\p{M}*)+/gu;
        let result;
        let wordsWithOffsets = [];
        while ((result = wordPattern.exec(text)) !== null) {
            // string, start index, end index
            wordsWithOffsets.push([result[0], result.index, wordPattern.lastIndex]);
        }
        return wordsWithOffsets;
    }

    maybeShowAcceptButton() {
        // show accept button for suggestible word when caret is in it
        const selection = this.quill.getSelection(false);
        if (!selection) {
            return;
        }
        const { index, length } = selection;
        if (length !== 0) {
            return;
        }
        const format = this.quill.getFormat(index);
        if (format.underline) {
            // it is an acceptable word
            const [leaf] = this.quill.getLeaf(index);
            this.acceptableWord = leaf.text;
            const bounds = this.quill.getBounds(index);
            this.acceptButton.style.top = `${bounds.top + bounds.height}px`;
            this.acceptButton.style.left = `${bounds.left}px`;
            this.acceptButton.style.display = "block";
        } else {
            hide(this.acceptButton);
        }
    }

    // when a change occurs submit a wordcheck request, but to avoid several
    // in quick succession, set or reset a timer on each. When it times out
    // no changes have occured for e.g. 2 seconds, submit a request.
    triggerReload() {
        clearTimeout(this.timerID);
        this.timerID = setTimeout(this.wordCheck.bind(this), 2000);
    }

    checkPunc(index, end) {
        while (index < end) {
            const char = this.pageText.charAt(index);
            if (puncCharacters.includes(char)) {
                this.quill.formatText(index, 1, { background: "yellow" }, "silent");
            }
            index += 1;
        }
    }

    showWordCheck(wcData) {
        // check that text and cursor pos. has not changed while waiting
        // for response.
        const { index: newCaretPos } = this.quill.getSelection(false);
        const newText = this.quill.getText();
        if (newCaretPos !== this.caretPos || newText !== this.pageText) {
            // another change has happened since we submitted wordcheck
            this.caretPos = newCaretPos;
            this.pageText = newText;
            this.triggerReload();
            return;
        }

        const badWords = wcData.bad_words;
        const wordsWithOffsets = this.splitText(this.pageText);
        this.quill.setText(this.pageText, "silent");

        let puncIndex = 0;
        for (const [word, startOffset, endOffset] of wordsWithOffsets) {
            // look for punc between words
            this.checkPunc(puncIndex, startOffset);
            puncIndex = endOffset;
            // must not just check badWords[word] because object prototype
            // could have a property 'word', e.g. array has property 'values'
            // this avoids eslint error from "badWords.hasOwnProperty(word))"
            if (Object.prototype.hasOwnProperty.call(badWords, word)) {
                const attributes = badWords[word] === WC_WORLD ? { underline: true } : { strike: true };
                this.quill.formatText(startOffset, endOffset - startOffset, attributes, "silent");
            }
        }
        // process text after last word
        this.checkPunc(puncIndex, this.pageText.length);
        // silent so don't scroll caret into view
        this.quill.setSelection(this.caretPos, 0, "silent");
        this.maybeShowAcceptButton();
    }

    async wordCheck() {
        this.wordChecked = true;
        // save pageText and caretPos so we can check if they have changed
        // before redrawing the page
        this.pageText = this.quill.getText();
        // Focus the editor, but don't scroll
        this.quill.focus({ preventScroll: true });
        ({ index: this.caretPos } = this.quill.getSelection(false));
        try {
            const wcData = await ajax(
                "PUT",
                `v1/projects/${this.projectId}/wordcheck`,
                {},
                // eslint-disable-next-line camelcase
                { text: this.pageText, accepted_words: this.acceptedWords, languages: this.languages },
            );
            this.showWordCheck(wcData);
        } catch (error) {
            alert(error.message);
        }
    }

    acceptWord(event) {
        event.stopPropagation();
        this.acceptedWords.push(this.acceptableWord);
        hide(this.acceptButton);
        // resubmit so all same words will be unmarked
        this.wordCheck();
    }

    // if accept button is activated by keyboard we do not want the key
    // to propagate up to the text div
    keyAcceptWord(event) {
        event.preventDefault();
        if (event.key === "Enter" || event.key === " ") {
            this.acceptWord(event);
        }
    }

    onChange() {
        if (!this.enableOnChange) {
            return;
        }

        const { index } = this.quill.getSelection(false);
        let [leaf, offset] = this.quill.getLeaf(index);
        const format = this.quill.getFormat(index);
        if (format.underline || format.strike) {
            // unmark it
            this.quill.removeFormat(index - offset, leaf.text.length, "silent");
        }
        this.triggerReload();
    }

    initialise() {
        this.acceptedWords = [];
        this.wordChecked = false;
    }

    getWCStatus() {
        return [this.wordChecked, this.acceptedWords];
    }

    enter() {
        // assume this.quill shows text.
        this.quill.on("text-change", this.onChange.bind(this));
        this.editBox.addEventListener("click", this.maybeShowAcceptButton.bind(this));
        this.editBox.addEventListener("keyup", this.maybeShowAcceptButton.bind(this));
        this.quill.enable();
        this.extraSettings.append(this.dictionaries);
        this.onDoneSettingsAction = this.setLanguages.bind(this);
        this.onDoneSettings.add(this.onDoneSettingsAction);
        this.wordCheck();
        this.enableOnChange = true;
    }

    leave() {
        // we use this.enableOnChange to prevent onChange from being fired from
        // Quill during WC shutdown. This shouldn't be necessary if we're
        // removing the text-change event, but that doesn't seem to work "fast
        // enough" in some cases.
        this.enableOnChange = false;
        this.quill.off("text-change", this.onChange.bind(this));
        clearTimeout(this.timerID);
        hide(this.acceptButton);
        this.editBox.removeEventListener("click", this.maybeShowAcceptButton.bind(this));
        this.editBox.removeEventListener("keyup", this.maybeShowAcceptButton.bind(this));

        // remove any marking
        this.pageText = this.quill.getText();
        this.quill.setText(this.pageText, "silent");
        this.quill.history.clear();
        this.extraSettings.replaceChildren();
        this.onDoneSettings.delete(this.onDoneSettingsAction);
    }
}
