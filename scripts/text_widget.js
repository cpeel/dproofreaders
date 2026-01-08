/* global Quill actionButton makeLabel makeCheckBox makeRadio */
/* eslint no-use-before-define: "warn" */
/* eslint camelcase: "off" */

import { FormatPreviewPlugin } from "./format_preview.js";
import { WordCheckPlugin } from "./word_check.js";
import { makeValidator } from "./validator.js";
import translate from "./gettext.js";

const fonts = {
    dp_sans_mono: {
        name: "DP Sans Mono",
        face: "'DP Sans Mono', monospace",
    },
    dejavu_sans_mono: {
        name: "DejaVu Sans Mono",
        face: "'DejaVu Sans Mono', monospace",
    },
    default: {
        name: translate.gettext("Browser default"),
        face: "monospace",
    },
};

function convertPunctuation(string) {
    const conversionMap = {
        "‘": "'",
        "“": '"',
        "’": "'",
        "”": '"',
        "—": "--",
        "…": "...",
    };

    return [...string]
        .map((character) => {
            const conversion = conversionMap[character] || character;
            return conversion;
        })
        .join("");
}

function convertDiacriticalMarkup(string) {
    const above = {
        "=": "\u0304", // macron
        ":": "\u0308", // diaeresis
        ".": "\u0307", // dot
        "`": "\u0300", // grave
        "'": "\u0301", // acute
        "^": "\u0302", // circumflex
        ")": "\u0306", // breve
        "~": "\u0303", // tilde
        v: "\u030C", // caron
        "*": "\u030A", // ring
        "(": "\u0311", // inverted breve
    };

    const below = {
        "=": "\u0331", // macron
        ":": "\u0324", // diaeresis
        ".": "\u0323", // dot
        "`": "\u0316", // grave
        "'": "\u0317", // acute
        "^": "\u032D", // circumflex
        ")": "\u032E", // breve
        "~": "\u0330", // tilde
        ",": "\u0327", // cedilla
        v: "\u032C", // caron
        "*": "\u0325", // ring
        "(": "\u032F", // inverted breve
    };

    const ligatures = {
        ae: "\u00e6",
        AE: "\u00c6",
        oe: "\u0153",
        OE: "\u0152",
    };

    // if it's not a valid diacritical markup string, bail early
    if (string.length !== 4 || string[0] !== "[" || string[3] !== "]") {
        return string;
    }

    var replaceChar = ligatures[string.slice(1, 3)];
    if (replaceChar) {
        return replaceChar;
    }

    let char1 = string[1];
    let char2 = string[2];
    var code = above[char1];
    if (code) {
        replaceChar = char2 + code;
    } else {
        code = below[char2];
        if (code) {
            replaceChar = char1 + code;
        }
    }

    if (replaceChar) {
        // TODO: confirm that the normalized character is a valid one
        // for the project
        return replaceChar.normalize("NFC");
    } else {
        return string;
    }
}

function surroundSelection(quill, before, after, ignoreSpace = false) {
    // in the following "user" disables when not enabled
    let { index, length } = quill.getSelection(true);
    if (ignoreSpace) {
        // move end fwd if spaces at end
        while (length > 0 && quill.getText(index + length - 1, 1) === " ") {
            length -= 1;
        }
        if (length === 0) {
            return;
        }
    }

    // do in two parts so undo buffer does not need to hold so much
    quill.insertText(index + length, after, "user");
    quill.insertText(index, before, "user");
    quill.setSelection(index, length + before.length + after.length, "user");
}

class BasicTextWidget {
    constructor(editBox, userSettings) {
        this.editBox = editBox;
        this.quill = this.buildQuill(this.editBox);
        this.qlEditor = this.editBox.firstChild;

        this.userSettings = userSettings;
        this.userSettings.fontSize ?? (this.userSettings.fontSize = "12pt");
        this.userSettings.textWrap ?? (this.userSettings.textWrap = false);
        this.userSettings.fontId ?? (this.userSettings.fontId = "dp_sans_mono");
    }

    buildQuill() {
        const quill = new Quill(this.editBox, {
            modules: {
                toolbar: false,
                keyboard: {
                    bindings: this.getKeyboardBindings(),
                },
            },
            history: {
                delay: 0,
                maxStack: 500,
                userOnly: true,
            },
        });

        quill.root.setAttribute("spellcheck", false);

        quill.on("text-change", (delta, oldDelta, source) => {
            if (source == "user") {
                var retain = 0;
                [...delta.ops].map((op) => {
                    if (Object.hasOwn(op, "retain")) {
                        retain = op.retain;
                    } else if (Object.hasOwn(op, "insert")) {
                        // check if we should attempt diacritical conversion, we only support
                        // the user typing this in so the op.insert will always end with ]
                        if ([...op.insert].reverse()[0] == "]") {
                            // find the start and end of our markup, we can treat
                            // this as basic ASCII since all of our diacritical
                            // markup is basic ASCII
                            var maybeMarkupStartIndex = Math.max(0, retain + [...op.insert].length - 4);
                            var maybeMarkup = quill.getText(maybeMarkupStartIndex, 4);
                            const converted = convertDiacriticalMarkup(maybeMarkup);
                            if (maybeMarkup != converted) {
                                quill.deleteText(maybeMarkupStartIndex, 4);
                                quill.insertText(maybeMarkupStartIndex, converted);
                                setTimeout(() => quill.setSelection(maybeMarkupStartIndex + [...converted].length, 0), 0);
                            }
                        }
                        // if not, see if we need to convert any punctuation
                        else {
                            const converted = convertPunctuation(op.insert);
                            if (op.insert != converted) {
                                quill.deleteText(retain, [...op.insert].length);
                                quill.insertText(retain, converted);
                                if ([...op.insert].length != [...converted].length) {
                                    setTimeout(() => quill.setSelection(retain + [...converted].length, 0), 0);
                                }
                            }
                        }
                    }
                });
            }
        });

        return quill;
    }

    getKeyboardBindings() {
        return {
            bold: {
                key: "b",
                shortKey: true,
                // eslint-disable-next-line no-unused-vars
                handler(range, context) {
                    surroundSelection(this.quill, "<b>", "</b>");
                },
            },
            italic: {
                key: "i",
                shortKey: true,
                // eslint-disable-next-line no-unused-vars
                handler(range, context) {
                    surroundSelection(this.quill, "<i>", "</i>");
                },
            },
            underline: {
                key: "u",
                shortKey: true,
                // eslint-disable-next-line no-unused-vars
                handler(range, context) {
                    surroundSelection(this.quill, "<u>", "</u>");
                },
            },
        };
    }

    setFontSize(fontSize) {
        this.userSettings.fontSize = fontSize ?? this.userSettings.fontSize;
        this.qlEditor.style.fontSize = this.userSettings.fontSize;
    }

    setFontFace(fontId) {
        this.userSettings.fontId = fontId ?? this.userSettings.fontId;
        this.qlEditor.style.fontFamily = fonts[this.userSettings.fontId].face;
    }

    setWrap(wrap) {
        this.userSettings.textWrap = wrap ?? this.userSettings.textWrap;
        this.qlEditor.style.whiteSpace = this.userSettings.textWrap ? "pre-wrap" : "pre";
    }

    surroundSelection(before, after) {
        surroundSelection(this.quill, before, after, true);
    }

    transformSelection(func) {
        const { index, length } = this.quill.getSelection(true);
        const selectedText = this.quill.getText(index, length);
        const transformedText = func(selectedText);
        this.quill.deleteText(index, length, "user");
        this.quill.insertText(index, transformedText, "user");
        this.quill.setSelection(index, transformedText.length, "user");
    }

    replaceSelection(text) {
        const { index, length } = this.quill.getSelection(true);
        // HACK to make Quill undo work correctly do not delete zero length
        // otherwise it combines inserts into one operation
        if (0 !== length) {
            this.quill.deleteText(index, length, "user");
        }
        this.quill.insertText(index, text, "user");
        this.quill.setSelection(index + text.length, 0, "user");
    }

    getText() {
        return this.quill.getText();
    }

    setText(text) {
        this.quill.setText(text);
    }
}

export class QuizTextWidget extends BasicTextWidget {
    constructor(editBox, userSettings) {
        super(editBox, userSettings);

        this.setFontSize();
        this.setFontFace();
        this.setWrap();
    }
}

export class TextWidget extends BasicTextWidget {
    constructor(container, userSettings) {
        const editBox = document.createElement("div");
        editBox.classList.add("stretch-box", "overflow-hidden");

        super(editBox, userSettings);

        this.container = container;

        this.controlBar = document.createElement("div");
        this.controlBar.classList.add("pane_settings_bar");

        this.viewSettingsDialog = document.createElement("dialog");
        this.viewSettingsDialog.id = "settings_dialog";
        const dialogTitle = document.createElement("div");
        dialogTitle.id = "settings_title";
        dialogTitle.innerHTML = translate.gettext("Settings");
        this.viewSettingsDialog.appendChild(dialogTitle);
        this.container.append(this.viewSettingsDialog);

        const commonSettings = document.createElement("div");
        commonSettings.classList.add("settings_row");

        // Set up settings dialog & controls
        this.extraSettings = document.createElement("div");
        this.extraSettings.classList.add("settings_row");

        this.onSettings = new Set();
        const settingsButton = actionButton(translate.gettext("Settings"));
        settingsButton.classList.add("bordered_button");
        settingsButton.addEventListener("click", this.openSettingsDialog.bind(this));

        this.onDoneSettings = new Set();
        const doneButton = actionButton(translate.gettext("Done"));
        doneButton.addEventListener("click", this.closeSettingsDialog.bind(this));

        this.viewSettingsDialog.append(commonSettings, this.extraSettings, doneButton);
        this.controlBar.append(settingsButton);

        // set up the line numbering column
        this.numberColumn = document.createElement("div");
        this.numberColumn.classList.add("fixed-box");
        this.numberColumn.id = "page_line_number";

        const numberText = document.createElement("div");
        numberText.classList.add("stretch-box", "row_flex");

        numberText.append(this.numberColumn, this.editBox);

        this.container.append(this.controlBar, numberText);

        this.qlEditor.addEventListener("scroll", this.numberLines.bind(this));

        // for polytonic greek
        this.qlEditor.style.padding = "0 0 0 0.6em";

        this.userSettings.lineHeight ?? (this.userSettings.lineHeight = 1.6);
        this.setParaSpacing(this.userSettings.lineHeight);

        const fontFaceSelector = document.createElement("select");
        for (const fontId of Object.keys(fonts)) {
            fontFaceSelector.add(new Option(fonts[fontId].name, fontId));
        }

        fontFaceSelector.addEventListener(
            "change",
            function (fontFaceSelector) {
                this.setFontFace(fontFaceSelector.value);
                this.numberLines();
            }.bind(this, fontFaceSelector),
        );

        const fontControl = makeLabel([translate.gettext("Font") + ": ", fontFaceSelector]);

        const fontSizeSelector = document.createElement("select");
        const fontSizes = [10, 12, 14, 17, 20, 24, 30, 36, 44];
        fontSizes.forEach(function (fontSize) {
            fontSizeSelector.add(new Option(`${fontSize}pt`, `${fontSize}pt`));
        });

        fontSizeSelector.addEventListener(
            "change",
            function (fontSizeSelector) {
                this.setFontSize(fontSizeSelector.value);
            }.bind(this, fontSizeSelector),
        );

        const fontSizeControl = makeLabel([translate.gettext("Size") + ": ", fontSizeSelector]);

        const wrapCheck = makeCheckBox();
        wrapCheck.addEventListener(
            "change",
            function (wrapCheck) {
                this.setWrap(wrapCheck.checked);
            }.bind(this, wrapCheck),
        );
        const wrapControl = makeLabel([wrapCheck, translate.gettext("Wrap")]);

        commonSettings.append(fontControl, fontSizeControl, wrapControl);

        fontSizeSelector.value = this.userSettings.fontSize;
        fontFaceSelector.value = this.userSettings.fontId;
        wrapCheck.checked = this.userSettings.textWrap;
        this.setFontSize();
        this.setFontFace();
        this.setWrap();
    }

    closeSettingsDialog() {
        for (const func of this.onDoneSettings) {
            func();
        }
        this.viewSettingsDialog.close();
    }

    openSettingsDialog() {
        for (const func of this.onSettings) {
            func();
        }
        this.viewSettingsDialog.showModal();
    }

    setFontSize(fontSize) {
        super.setFontSize(fontSize);
        this.numberColumn.style.fontSize = fontSize;
        this.numberLines();
    }

    setWrap(wrap) {
        super.setWrap(wrap);
        this.numberLines();
    }

    setText(text) {
        super.setText(text);
        this.numberLines();
    }

    numberLines() {
        this.numberColumn.innerHTML = "";
        let lineNumber = 1;
        for (const child of this.qlEditor.children) {
            const para = child.getBoundingClientRect();
            const pnumb = document.createElement("p");
            this.numberColumn.append(pnumb);
            pnumb.textContent = lineNumber;
            pnumb.style.top = `${para.top}px`;
            lineNumber += 1;
        }
    }

    setParaSpacing(lineHeight) {
        this.qlEditor.style.lineHeight = lineHeight;
        this.numberColumn.style.lineHeight = lineHeight;
        this.numberLines();
    }

    setup(splitVertical) {
        if (this.container.contains(this.controlBar)) {
            this.container.removeChild(this.controlBar);
        }
        if (splitVertical) {
            this.container.prepend(this.controlBar);
            // top right bottom left
            this.controlBar.style.borderWidth = "0 0 1px 0";
        } else {
            this.container.append(this.controlBar);
            this.controlBar.style.borderWidth = "1px 0 0 0";
        }
    }

    reLayout() {
        this.numberLines();
    }
}

export class ProofTextWidget extends TextWidget {
    constructor(container, projectId, userSettings, languagesWithDictionaries, projectLanguages) {
        super(container, userSettings);
        const Parchment = Quill.import("parchment");
        const config = { scope: Parchment.Scope.INLINE };

        const qTitle = new Parchment.Attributor("title", "title", config);
        Quill.register(qTitle);

        config.whiteList = ["italic"];
        const qfontStyle = new Parchment.StyleAttributor("fontStyle", "font-style", config);
        Quill.register(qfontStyle);

        const qfontWeight = new Parchment.StyleAttributor("fontWeight", "font-weight", config);
        Quill.register(qfontWeight);

        const qfontVariant = new Parchment.StyleAttributor("fontVariant", "font-variant", config);
        Quill.register(qfontVariant);

        const qTextTransform = new Parchment.StyleAttributor("textTransform", "text-transform", config);
        Quill.register(qTextTransform);

        const qLetterSpacing = new Parchment.StyleAttributor("letterSpacing", "letter-spacing", config);
        Quill.register(qLetterSpacing);

        const qMarginRight = new Parchment.StyleAttributor("marginRight", "margin-right", config);
        Quill.register(qMarginRight);

        const qTextDecoration = new Parchment.StyleAttributor("textDecoration", "text-decoration", config);
        Quill.register(qTextDecoration);

        config.whiteList = ["none"];
        const qHide = new Parchment.StyleAttributor("display", "display", config);
        Quill.register(qHide);

        const Embed = Quill.import("blots/embed");
        class DFormula extends Embed {
            static blotName = "dformula";
            static className = "ql-dformula";
            static tagName = "SPAN";

            static create(value) {
                // @ts-expect-error
                if (window.katex == null) {
                    throw new Error("Formula module requires KaTeX.");
                }
                const node = super.create(value);
                if (typeof value === "string") {
                    // @ts-expect-error
                    window.katex.render(value, node, {
                        throwOnError: false,
                        errorColor: "#f00",
                        displayMode: true,
                        // output: "mathml",
                    });
                    node.setAttribute("data-value", value);
                }
                return node;
            }

            static value(domNode) {
                return domNode.getAttribute("data-value");
            }

            html() {
                const { dformula } = this.value();
                return `<span>${dformula}</span>`;
            }
        }

        Quill.register(DFormula);

        const lineSpacerUnit = document.createElement("label");
        lineSpacerUnit.innerHTML = translate.gettext("Spacing") + ":";

        const lineSpacer = document.createElement("input");
        lineSpacer.classList.add("line-spacer");
        lineSpacer.type = "range";
        lineSpacer.classList.add("middle-align");
        lineSpacer.min = "1.5";
        lineSpacer.max = "3";
        lineSpacer.step = "0.01";
        lineSpacer.width = "5em";
        lineSpacer.title = translate.gettext("Adjust the line spacing");
        lineSpacer.value = this.userSettings.lineHeight;
        lineSpacer.addEventListener("input", (event) => {
            const lineHeight = event.target.value;
            this.setParaSpacing(lineHeight);
            this.userSettings.lineHeight = lineHeight;
        });
        lineSpacerUnit.appendChild(lineSpacer);

        this.oldScroll = this.qlEditor.scrollTop;
        this.scrollListeners = new Set();
        this.qlEditor.addEventListener("scroll", this.scroll.bind(this));

        this.leave = this.leaveText;

        this.wordChecker = new WordCheckPlugin(
            this.quill,
            this.extraSettings,
            this.onDoneSettings,
            this.editBox,
            this.scrollListeners,
            projectId,
            languagesWithDictionaries,
            projectLanguages,
        );

        this.statSpan = document.createElement("span");

        // userSettings.formatting ??= {}; // needs chrome 85, FF 79, Safari 14
        this.userSettings.formatting ?? (this.userSettings.formatting = {});
        this.formatter = new FormatPreviewPlugin(this.quill, this.extraSettings, this.userSettings.formatting, this.statSpan);

        this.textOnlyRadio = makeRadio("viewMode");
        this.textOnlyRadio.checked = true;
        this.textOnlyRadio.addEventListener("click", this.enterTextOnly.bind(this));
        const textOnlyControl = makeLabel([this.textOnlyRadio, translate.gettext("Text")]);

        const wordCheckRadio = makeRadio("viewMode");
        wordCheckRadio.addEventListener("click", this.enterWordCheck.bind(this));
        const wordCheckControl = makeLabel([wordCheckRadio, translate.gettext("WordCheck")]);

        const formatPreviewRadio = makeRadio("viewMode");
        formatPreviewRadio.addEventListener("click", this.enterFormatPreview.bind(this));
        const formatPreviewControl = makeLabel([formatPreviewRadio, translate.gettext("Format Preview")]);

        const spacer = document.createElement("span");
        spacer.classList.add("spacer");
        this.controlBar.prepend(textOnlyControl, wordCheckControl, formatPreviewControl, this.statSpan, spacer.cloneNode(), lineSpacerUnit, spacer.cloneNode());

        this.validator = makeValidator(projectId, this.quill);
    }

    enterTextOnly() {
        if (this.leave != this.leaveText) {
            this.leave();
            this.leave = this.leaveText;
        }
    }

    enterWordCheck() {
        this.leave();
        this.wordChecker.enter.bind(this.wordChecker)();
        this.leave = this.wordChecker.leave.bind(this.wordChecker);
    }

    enterFormatPreview() {
        this.leave();
        this.formatter.enter.bind(this.formatter)();
        this.leave = this.formatter.leave.bind(this.formatter);
    }

    scroll() {
        const newScroll = this.qlEditor.scrollTop;
        const deltaScroll = newScroll - this.oldScroll;
        this.oldScroll = newScroll;
        this.scrollListeners.forEach(function (scrollCallBack) {
            scrollCallBack(deltaScroll);
        });
    }

    leaveText() {}

    showValidate() {
        this.validator.enter();
    }

    toTextMode() {
        this.enterTextOnly();
        this.textOnlyRadio.checked = true;
    }

    getWCStatus() {
        return this.wordChecker.getWCStatus();
    }

    getFPStatus() {
        return this.formatter.getFPStatus();
    }

    initWordCheck() {
        this.wordChecker.initialise();
    }
}
