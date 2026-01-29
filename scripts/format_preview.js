/*global makeCheckBox makeLabel */

import { TextWidgetPlugin } from "./text_widget_plugin.js";
import { analyse, getILTags } from "./analyse_format.js";
import translate from "./gettext.js";

const tagNames = {
    i: translate.gettext("Italic"),
    b: translate.gettext("Bold"),
    g: translate.gettext("Gesperrt"),
    sc: translate.gettext("Small caps"),
    f: translate.gettext("Font change"),
    etc: translate.gettext("Other tags"),
    err: translate.gettext("Issues"),
    hlt: translate.gettext("Poss. Issues"),
    "#": translate.gettext("Block quote"),
    "*": translate.gettext("No wrap"),
};

export class FormatPreviewPlugin extends TextWidgetPlugin {
    anlaysis;
    ok;
    pageText = "";
    wasRun = false;

    constructor(quill, settingsElement, formatting, fpControls) {
        super(quill, settingsElement);

        this.formatting = formatting;
        this.fpControls = fpControls;

        // These are the default values. If the user changes anything the new
        // styles are saved in local storage and reloaded next time.
        // An empty color string means use default color.
        this.formatting.colors ??
            (this.formatting.colors = {
                err: { background: "#ff0000", color: "" },
                hlt: { background: "#ceff09", color: "" },
                i: { background: "", color: "#0000ff" },
                b: { background: "", color: "#c55a1b" },
                g: { background: "", color: "#8a2be2" },
                sc: { background: "", color: "#009700" },
                f: { background: "", color: "#ff0000" },
                "#": { background: "#fecafe", color: "" },
                "*": { background: "#d1fcff", color: "" },
                etc: { background: "#ffcaaf", color: "" },
            });

        this.formatting.allowUnderline ?? (this.formatting.allowUnderline = false);
        this.formatting.colorMarkup ?? (this.formatting.colorMarkup = true);
        this.formatting.hideTags ?? (this.formatting.hideTags = true);
        this.formatting.allowMathPreview ?? (this.formatting.allowMathPreview = false);

        this.formatStyles = {
            i: { fontStyle: "italic" },
            b: { fontWeight: "bold" },
            g: { letterSpacing: "0.25em", marginRight: "-0.25em" },
            sc: { fontVariant: "small-caps" },
            f: { fontStyle: "normal" },
            u: { textDecoration: "underline" },
        };

        const colorMarkupCheck = makeCheckBox();
        const colorMarkupControl = makeLabel([colorMarkupCheck, translate.gettext("Color markup")]);

        const hideTagsCheck = makeCheckBox();
        const hideTagsControl = makeLabel([hideTagsCheck, translate.gettext("Hide tags")]);

        const allowUnderlineCheck = makeCheckBox();
        const allowUnderlineControl = makeLabel([allowUnderlineCheck, translate.gettext("Allow <u> for underline")]);

        const allowMathCheck = makeCheckBox();
        const allowMathControl = makeLabel([allowMathCheck, translate.gettext("Preview Math")]);

        this.settingsGrid = document.createElement("div");
        this.settingsGrid.classList.add("grid-2col");
        this.settingsGrid.append(allowMathControl, allowUnderlineControl);

        // Construct the color table for each tag
        this.colorChoices = document.createElement("fieldset");
        const colorChoicesLegend = document.createElement("legend");
        colorChoicesLegend.innerHTML = translate.gettext("Color Choices");
        this.colorChoices.append(colorChoicesLegend);

        const colorTable = document.createElement("table");
        colorTable.id = "color_table";

        let dataRow = document.createElement("tr");
        const tdBlank = document.createElement("th");
        const tdText = document.createElement("th");
        tdText.innerHTML = translate.gettext("Text");
        tdText.colSpan = 2;

        const tdBackground = document.createElement("th");
        tdBackground.innerHTML = translate.gettext("Background");
        tdBackground.colSpan = 2;

        dataRow.append(tdBlank, tdText, tdBackground);
        colorTable.append(dataRow);

        Object.keys(tagNames).forEach(function (tag) {
            let dataRow = document.createElement("tr");
            const rowLabel = document.createElement("td");
            rowLabel.innerHTML = tagNames[tag];
            dataRow.append(rowLabel);
            ["color", "background"].forEach(function (ground) {
                const hideColor = "" === this.formatting.colors[tag][ground];

                const checkBox = document.createElement("input");
                checkBox.type = "checkbox";
                checkBox.checked = !hideColor;
                checkBox.dataset.tag = tag;
                checkBox.dataset.ground = ground;
                checkBox.addEventListener(
                    "change",
                    function (colorCheckbox) {
                        const colorInput = document.getElementById(colorCheckbox.dataset.tag + "_" + colorCheckbox.dataset.ground);
                        if (colorCheckbox.checked) {
                            colorInput.style.display = "";
                            this.setTagColor(colorCheckbox.dataset.tag, colorCheckbox.dataset.ground, colorInput.value);
                        } else {
                            colorInput.style.display = "none";
                            this.setTagColor(colorCheckbox.dataset.tag, colorCheckbox.dataset.ground, "");
                        }
                    }.bind(this, checkBox),
                );
                const checkBoxCell = document.createElement("td");
                checkBoxCell.append(checkBox);

                let colorInput = document.createElement("input");
                colorInput.id = tag + "_" + ground;
                colorInput.type = "color";
                colorInput.value = this.formatting.colors[tag][ground];
                colorInput.dataset.tag = tag;
                colorInput.dataset.ground = ground;
                if (hideColor) {
                    colorInput.style.display = "none";
                }
                colorInput.addEventListener(
                    "change",
                    function (colorField) {
                        this.setTagColor(colorField.dataset.tag, colorField.dataset.ground, colorField.value);
                    }.bind(this, colorInput),
                );
                const colorInputCell = document.createElement("td");
                colorInputCell.append(colorInput);

                dataRow.append(checkBoxCell, colorInputCell);
            }, this);
            colorTable.append(dataRow);
        }, this);
        this.colorChoices.append(colorTable);

        this.settingsElement.append(this.settingsGrid, this.colorChoices);

        this.issuesBox = document.createElement("span");
        this.issuesBox.classList.add("bold");

        this.possIssBox = document.createElement("span");
        this.possIssBox.classList.add("bold");

        this.optGrid = document.createElement("div");
        this.optGrid.classList.add("grid-3col");
        const issuesStatus = document.createElement("div");
        const span1 = document.createElement("span");
        span1.innerHTML = translate.gettext("Issues:") + " ";
        const span2 = document.createElement("span");
        span2.innerHTML = " (+";
        const span3 = document.createElement("span");
        span3.innerHTML = " " + translate.gettext("potential") + ")";
        issuesStatus.append(span1, this.issuesBox, span2, this.possIssBox, span3);
        this.optGrid.append(colorMarkupControl, hideTagsControl, issuesStatus);
        this.fpControls.append(this.optGrid);

        colorMarkupCheck.addEventListener(
            "change",
            function (colorMarkupCheck) {
                this.formatting.colorMarkup = colorMarkupCheck.checked;
                this.showStyle();
            }.bind(this, colorMarkupCheck),
        );
        colorMarkupCheck.checked = this.formatting.colorMarkup;

        hideTagsCheck.addEventListener(
            "change",
            function (hideTagsCheck) {
                this.formatting.hideTags = hideTagsCheck.checked;
                this.showStyle();
            }.bind(this, hideTagsCheck),
        );
        hideTagsCheck.checked = this.formatting.hideTags;

        allowMathCheck.addEventListener(
            "change",
            function (allowMathCheck) {
                this.formatting.allowMathPreview = allowMathCheck.checked;
                this.markFormat();
            }.bind(this, allowMathCheck),
        );
        allowMathCheck.checked = this.formatting.allowMathPreview;

        allowUnderlineCheck.addEventListener(
            "change",
            function (allowUnderlineCheck) {
                this.formatting.allowUnderline = allowUnderlineCheck.checked;
                this.markFormat();
            }.bind(this, allowUnderlineCheck),
        );
        allowUnderlineCheck.checked = this.formatting.allowUnderline;
    }

    setTagColor(tag, ground, color) {
        this.formatting.colors[tag][ground] = color;
        this.markFormat();
    }

    showInlineStyle(text) {
        // the way html treats small cap text is different to the dp convention
        // so if sc-marked text is all upper-case transform to lower
        function checkAllCap(scString) {
            // remove tags such as <i> within the string so that all
            // uppercase string is correctly identified
            scString = scString.replace(/<\/?.{1,2}>/g, "");
            return scString === scString.toUpperCase();
        }

        const ILTags = getILTags(this.formatting);
        const reStartTag = new RegExp(`<(${ILTags})>`, "g");
        let result;
        while ((result = reStartTag.exec(text)) !== null) {
            const start = result.index;
            // find the matching closing tag
            const tagStyle = result[1];
            const closeTag = `</${tagStyle}>`;
            const end = text.indexOf(closeTag, start);
            const attributes = {};
            Object.assign(attributes, this.formatStyles[tagStyle]);
            if ("sc" === tagStyle) {
                if (checkAllCap(text.slice(start, end))) {
                    attributes.textTransform = "lowercase";
                }
            }
            if (this.formatting.colorMarkup) {
                Object.assign(attributes, this.formatting.colors[tagStyle]);
            }
            this.quill.formatText(start, end - start + closeTag.length, attributes, "silent");
        }
        if (this.formatting.hideTags) {
            const reAnyTag = new RegExp(`</?(?:${ILTags})>`, "g");
            while ((result = reAnyTag.exec(text)) !== null) {
                this.quill.formatText(result.index, result[0].length, "display", "none", "silent");
            }
        }
    }

    showOolStyle(text) {
        if (!this.formatting.colorMarkup) {
            return;
        }
        // out-of-line tags can be nested
        let nestLevel = 0;
        const reOolStart = /\/([#*])/g;
        const reOolAny = /(\/)[#*]|[#*]\//g;
        let result;
        while ((result = reOolStart.exec(text)) !== null) {
            // find following open or close tags
            const blockStart = result.index;
            reOolAny.lastIndex = blockStart + 2;
            let anyTagResult;
            while ((anyTagResult = reOolAny.exec(text)) !== null) {
                if (anyTagResult[1]) {
                    // open tag
                    nestLevel += 1;
                } else {
                    // closing tag
                    if (nestLevel === 0) {
                        // found the corresponding tag
                        // mark the range
                        this.quill.formatText(blockStart, anyTagResult.index - blockStart + 2, this.formatting.colors[result[1]], "silent");
                        break;
                    } else {
                        nestLevel -= 1;
                    }
                }
            }
        }
    }

    showSubSuper(startHere, text) {
        const reSubSuper = /(_|\^)\{.+?\}/g;
        // ^. ideally not [^x] or [x^]
        const reSingleSuper = /\^[^\]{]/g;

        let result;
        const attributes = {};
        if (this.formatting.colorMarkup) {
            Object.assign(attributes, this.formatting.colors["etc"]);
        }
        reSubSuper.lastIndex = startHere;
        while ((result = reSubSuper.exec(text)) !== null) {
            attributes.script = result[1] === "_" ? "sub" : "super";
            const start = result.index;
            const length = result[0].length;
            this.quill.formatText(start, length, attributes, "silent");
            if (this.formatting.hideTags) {
                this.quill.formatText(start, 2, "display", "none", "silent");
                this.quill.formatText(start + length - 1, 1, "display", "none", "silent");
            }
        }
        // single char superscript
        attributes.script = "super";
        reSingleSuper.lastIndex = startHere;
        while ((result = reSingleSuper.exec(text)) !== null) {
            const start = result.index;
            this.quill.formatText(start, 2, attributes, "silent");
            if (this.formatting.hideTags) {
                this.quill.formatText(start, 1, "display", "none", "silent");
            }
        }
    }

    showEtc(text) {
        // thought break
        if (this.formatting.colorMarkup) {
            let index = 0;
            while ((index = text.indexOf("<tb>", index)) >= 0) {
                this.quill.formatText(index, 4, this.formatting.colors["etc"], "silent");
                index += 4;
            }
        }

        // processes the text by showSubSuper but in math mode only outside math markup
        if (!this.formatting.allowMathPreview) {
            this.showSubSuper(0, text);
        } else {
            // find whole math strings \[ ... \] or \( ... \)
            let txtOut = "";
            let mathRegex = /\\\[[^]*?\\\]|\\\([^]*?\\\)/g;
            let result;
            let startIndex = 0;
            while ((result = mathRegex.exec(text)) !== null) {
                // process from beginning or end of previous math to start of math
                this.showSubSuper(startIndex, text.slice(0, result.index));
                startIndex = mathRegex.lastIndex;
                let formula = result[0];
                const index = result.index;
                // display or inline style
                const formulaStyle = "[" === formula.charAt(1) ? "dformula" : "formula";
                // remove start and end tags
                formula = formula.slice(2, -2);
                // replace first character and hide the rest
                const hideLength = mathRegex.lastIndex - index - 1;
                this.quill.deleteText(index, 1);
                this.quill.insertEmbed(index, formulaStyle, formula);
                this.quill.formatText(index + 1, hideLength, "display", "none", "silent");
            }
            // no more found, process to end
            this.showSubSuper(startIndex, text);
            return txtOut;
        }
    }

    // Attempt to make an approximate representation of formatted text.
    // Remove proofers' notes.
    // Treat illustration, footnote, sidenote like ordinary text.
    // Re-wrap except for no-wrap markup.
    // First-line indent paragraphs except for continuation at start of page.
    // Extra indent for each block-quote markup.
    // Centre and embolden headings and sub-headings, except for a
    // sub-heading in block-quote or no-wrap. (subsequent sub-headings will
    // be centred).
    // Mark thought breaks by a horizontal line.

    // use quill.getContents to get formatting markup, process it. remove
    // single newlines to rewrap.
    // if this is implemented quill text will change so have to use a new
    // getText function to use if saving from here

    reWrap(txt) {
        let mode = "para";
        const ops = [];
        const lines = txt.split("\n");
        for (const line of lines) {
            switch (mode) {
                case "para":
                    if (line === "/*") {
                        mode = "nowrap";
                        ops.push({ insert: "\n\n" });
                    } else {
                        ops.push({ insert: line + " " });
                    }
                    break;
                case "nowrap":
                    if (line === "*/") {
                        ops.push({ insert: "\n" });
                        mode = "para";
                    } else {
                        ops.push({ insert: line + "\n" });
                    }
                    break;
            }
        }
        this.quill.setContents({ ops: ops }, "silent");
    }

    markFormat() {
        this.analysis = analyse(this.pageText, this.formatting);
        // so insert notes from end
        this.analysis.noteArray.reverse();
        let issArray = this.analysis.issues;
        let nIssues = 0;
        let possIss = 0;
        issArray.forEach(function (issue) {
            if (issue.type === 1) {
                nIssues += 1;
            } else {
                possIss += 1;
            }
        });
        // ok true if no errors which would cause showstyle() or reWrap() to fail
        this.ok = nIssues === 0;
        this.issuesBox.innerHTML = nIssues;
        this.possIssBox.innerHTML = possIss;
        this.showStyle();
    }

    showStyle() {
        const noNoteText = this.analysis.text;
        let reWrapMode = false;
        if (this.ok && reWrapMode) {
            this.reWrap(noNoteText);
            return;
        }

        this.quill.setText(noNoteText, "silent");
        if (this.ok) {
            this.showOolStyle(noNoteText);
            this.showInlineStyle(noNoteText);
            this.showEtc(noNoteText);
        }
        // mark issues after style so don't get hidden
        for (const issue of this.analysis.issues) {
            const attributes = {};
            attributes.title = issue.text;
            Object.assign(attributes, issue.type === 0 ? this.formatting.colors.hlt : this.formatting.colors.err);
            this.quill.formatText(issue.start, issue.len, attributes, "silent");
        }

        // then insert notes from end
        const noteFormat = {
            background: "white",
            color: "black",
            fontStyle: "normal",
            fontWeight: "normal",
            letterSpacing: "normal",
            marginRight: 0,
            fontVariant: "normal",
        };
        for (const note of this.analysis.noteArray) {
            this.quill.insertText(note.start, note.text, noteFormat, "silent");
        }
    }

    getFPStatus() {
        return this.wasRun;
    }

    enter() {
        this.quill.enable(false);
        // save text so can restore when leave formatting mode
        this.pageText = this.quill.getText();
        this.markFormat();
        this.wasRun = true;
    }

    leave() {
        // restore text with no marking.
        this.quill.setText(this.pageText, "silent");
        // it should be possible to suspend history while in preview
        // since text is unchanged by using "silent" but doesn't work
        this.quill.history.clear();
        this.quill.enable();
    }
}
