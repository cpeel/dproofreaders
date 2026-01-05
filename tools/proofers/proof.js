/*global codeUrl makeUrl */
/* eslint no-use-before-define: "warn" */
/* eslint camelcase: "off" */

import { ajax } from "../../scripts/api.js";
import { ProofTextWidget } from "../../scripts/text_widget.js";
import { makeProofImageWidget } from "../../scripts/image_widget.js";
import { viewSplitter } from "../../scripts/view_splitter.js";
import { constructToolBox } from "../../scripts/toolbox.js";
import translate from "../../scripts/gettext.js";

window.addEventListener("DOMContentLoaded", async () => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const projectId = params.get("projectid");
    const projectState = params.get("proj_state");
    let pageName = params.get("imagefile");
    let pageState = params.get("page_state");
    const topDiv = document.getElementById("proofreading_interface");
    const forumURL = JSON.parse(topDiv.dataset.forum_url);

    function setUrl() {
        url.search = params;
        window.history.replaceState(null, "", url.href);
    }

    const imageTextDiv = document.getElementById("image_text");
    const imageContainer = document.getElementById("image_container");
    const container = document.getElementById("text_container");

    const docMap = {
        proofreading: "proofreading_guidelines.php",
        formatting: "formatting_guidelines.php",
    };

    try {
        // Load the project title and URL immediately
        const projectInfo = await ajax("GET", `v1/projects/${projectId}`, { field: ["title", "languages", "round_type"] });
        const roundType = projectInfo.round_type;
        document.getElementById("project_title").href = makeUrl(`${codeUrl}/project.php`, { id: projectId, expected_state: projectState }, "project-comments");
        document.getElementById("project_title").textContent = projectInfo.title;

        // Load user's prefs to build out the image widget
        const proofSettings = await ajax("GET", `v1/storage/newpi`);
        const imageWidget = makeProofImageWidget(imageContainer, proofSettings);

        // Now site dictionaries to construct the text pane and build the page
        const dictionaries = await ajax("GET", "v1/dictionaries");

        function syncScroll(s) {
            imageWidget.setScroll(s);
        }

        const textWidget = new ProofTextWidget(container, projectId, proofSettings, dictionaries, projectInfo.languages);
        const theSplitter = viewSplitter(imageTextDiv, proofSettings);
        theSplitter.mainSplit.onResize.add(textWidget.reLayout.bind(textWidget));
        theSplitter.mainSplit.onResize.add(imageWidget.reSize.bind(textWidget));
        theSplitter.setSplitDirCallback.push(textWidget.setup.bind(textWidget), imageWidget.reset);
        textWidget.scrollListeners.add(syncScroll);
        theSplitter.fireSetSplitDir();
        document.getElementById("action_buttons").append(...theSplitter.buttons);

        // Finally the pickersets to build the toolbox
        const pickerData = await ajax("GET", `v1/projects/${projectId}/pickersets`);
        constructToolBox(textWidget, pickerData, roundType, proofSettings, projectId);

        // Update the guidelines link
        const docURL = await ajax("GET", `v1/documents/${docMap[roundType]}`);
        document.getElementById("editing_guidelines").href = docURL;

        let dataSaved = false;
        function setPageState(data) {
            // remove \r
            const nlText = data.text.replace(/\r/g, "");
            textWidget.setText(nlText);
            pageState = data.pagestate;
            dataSaved = data.saved;
            params.set("page_state", pageState);
            setUrl();
        }

        function setPageData(data) {
            pageName = data.pagename;
            params.set("imagefile", pageName);

            setPageState(data);
            imageWidget.setImage(data.image_url);
            let infoText = `Page: ${data.pagenum}`;
            let roundInfoArray = data.round_info;
            if (roundInfoArray.length > 0) {
                const infoMap = roundInfoArray.map(function (roundInfo) {
                    const user = roundInfo.username;
                    let userString;
                    if (user == "" || roundInfo.forum_user_id == null) {
                        userString = user == "" ? translate.pgettext("no user", "none") : user;
                    } else {
                        const link = makeUrl(`${forumURL}/ucp.php`, { i: "pm", mode: "compose", u: roundInfo.forum_user_id }, "comments");
                        userString = `<a href='${link}' target='_blank'>${user}</a>`;
                    }
                    return `${roundInfo.round_id}: ${userString}`;
                });
                infoText += ` &mdash; ${infoMap.join(", ")}`;
            }
            document.getElementById("page_number").innerHTML = infoText;
            document.getElementById("view_other_pages").href = makeUrl(`${codeUrl}/tools/page_browser.php`, { project: projectId, imagefile: pageName });
        }

        async function ajaxPage(method, action, data = {}) {
            return await ajax(method, `v1/projects/${projectId}/pages/${pageName}`, { state: projectState, pagestate: pageState, pageaction: action }, data);
        }

        async function toProjectPage() {
            await ajax("PUT", `v1/storage/newpi`, {}, proofSettings);
            const projectUrl = new URL(`${codeUrl}/project.php`);
            projectUrl.search = new URLSearchParams({ id: projectId });
            window.location.href = projectUrl.href;
        }

        const saveButton = document.getElementById("save_button");
        const exitButton = document.getElementById("exit_button");
        const doneAndExitButton = document.getElementById("done_and_exit_button");
        const doneAndNextButton = document.getElementById("done_and_next_button");
        const revertToOrigButton = document.getElementById("revert_to_original_button");
        const revertToSavedButton = document.getElementById("revert_to_saved_button");
        const abandonButton = document.getElementById("abandon_button");
        const reportBadButton = document.getElementById("report_bad_button");

        const actionButtons = [
            saveButton,
            exitButton,
            doneAndExitButton,
            doneAndNextButton,
            revertToOrigButton,
            revertToSavedButton,
            abandonButton,
            reportBadButton,
        ];

        function disableAction() {
            for (const button of actionButtons) {
                button.disabled = true;
            }
            textWidget.toTextMode();
        }

        function enableAction() {
            for (const button of actionButtons) {
                button.disabled = false;
            }
            revertToSavedButton.disabled = !dataSaved;
        }

        async function resumePage() {
            try {
                const data = await ajaxPage("PUT", "resume");
                setPageData(data);
                enableAction();
            } catch (error) {
                alert(error.message);
                toProjectPage();
            }
        }

        async function nextPage() {
            try {
                textWidget.initWordCheck();
                const data = await ajax("PUT", `v1/projects/${projectId}/checkout`, { state: projectState });
                setPageData(data);
                enableAction();
            } catch (error) {
                alert(error.message);
                toProjectPage();
            }
        }

        disableAction();
        if (pageName) {
            textWidget.initWordCheck();
            // page has been given, change to temp if saved
            resumePage();
        } else {
            // get next page
            nextPage();
        }

        function checkValidateText(error) {
            alert(error.message);
            enableAction();
            if (error.code == 125) {
                textWidget.showValidate();
            }
        }

        // we need to report WordCheck and Format Preview results/usage
        // just before leaving the page by Exit, Done & exit, Done & next,
        // but not before Abandon
        async function maybeReportWC() {
            const [wordChecked, acceptedWords] = textWidget.getWCStatus();
            if (wordChecked) {
                await ajax("PUT", `v1/projects/${projectId}/pages/${pageName}/wordcheck`, {}, { accepted_words: acceptedWords });
            }
        }

        async function maybeReportFP() {
            const fpRun = textWidget.getFPStatus();
            if (fpRun) {
                await ajax("PUT", `v1/projects/${projectId}/pages/${pageName}/formatpreview`);
            }
        }

        saveButton.addEventListener("click", async () => {
            disableAction();
            const pageText = textWidget.getText();
            try {
                const data = await ajaxPage("PUT", "save", { text: pageText });
                setPageState(data);
                enableAction();
            } catch (error) {
                checkValidateText(error);
            }
        });

        exitButton.addEventListener("click", async () => {
            if (confirm(translate.gettext("Are you sure you want to stop proofreading?"))) {
                disableAction();
                try {
                    await maybeReportWC();
                    await maybeReportFP();
                } catch (error) {
                    alert(error.messsage);
                }
                toProjectPage();
            }
        });

        doneAndExitButton.addEventListener("click", async () => {
            disableAction();
            const pageText = textWidget.getText();
            try {
                await maybeReportWC();
                await maybeReportFP();
                await ajaxPage("PUT", "checkin", { text: pageText });
                toProjectPage();
            } catch (error) {
                checkValidateText(error);
            }
        });

        doneAndNextButton.addEventListener("click", async () => {
            disableAction();
            const pageText = textWidget.getText();
            try {
                await maybeReportWC();
                await maybeReportFP();
                await ajaxPage("PUT", "checkin", { text: pageText });
                await nextPage();
                enableAction();
            } catch (error) {
                checkValidateText(error);
            }
        });

        revertToOrigButton.addEventListener("click", async () => {
            if (confirm(translate.gettext("Are you sure you want to revert to the original version?"))) {
                disableAction();
                const pageText = textWidget.getText();
                try {
                    const data = await ajaxPage("PUT", "revert", { text: pageText });
                    setPageState(data);
                    enableAction();
                } catch (error) {
                    checkValidateText(error);
                }
            }
        });

        revertToSavedButton.addEventListener("click", async () => {
            if (confirm(translate.gettext("Are you sure you want to revert to your last save?"))) {
                disableAction();
                await resumePage();
                enableAction();
            }
        });

        abandonButton.addEventListener("click", async () => {
            if (
                confirm(
                    translate.gettext(
                        "This will discard all changes you have made on this page. Are you sure you want to return this page to the current round?",
                    ),
                )
            ) {
                disableAction();
                try {
                    await ajaxPage("PUT", "abandon");
                } catch (error) {
                    alert(error.message);
                }
                toProjectPage();
            }
        });

        const badPageReport = document.getElementById("bad_page_report");
        reportBadButton.addEventListener("click", () => {
            badPageReport.showModal();
            badPageReport.scrollTop = 0;
        });

        document.getElementById("cancel_bad_report").addEventListener("click", () => {
            badPageReport.close();
        });

        document.getElementById("submit_bad_report").addEventListener("click", async () => {
            let reasonName = document.getElementById("reason_selector").value;
            if (reasonName == "") {
                alert(translate.gettext("Please select a reason"));
                return;
            }
            disableAction();
            try {
                await ajax("PUT", `v1/projects/${projectId}/pages/${pageName}/reportbad`, {}, { reason: reasonName });
            } catch (error) {
                alert(error.message);
            }
            toProjectPage();
        });
    } catch (error) {
        alert(error.message);
    }
});
