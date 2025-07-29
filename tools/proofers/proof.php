<?php
$relPath = "./../../pinc/";
include_once($relPath.'base.inc');
include_once($relPath.'slim_header.inc');
include_once($relPath.'bad_page_instructions.inc');
include_once($relPath.'draw_toolbox.inc');
include_once($relPath.'DPage.inc');  // PAGE_BADNESS_REASONS

require_login();

// (User clicked on "Start Proofreading" link or
// one of the links in "Done" or "In Progress" trays.)

$title = _("Proof test");

$header_args = [
    "js_modules" => [
        "$code_url/tools/proofers/proof.js",
    ],
    "js_files" => [
        "$code_url/scripts/misc.js",
        "$code_url/node_modules/quill/dist/quill.js",
    ],
    "css_files" => [
        "$code_url/styles/struct.css",
        "$code_url/node_modules/quill/dist/quill.core.css",
    ],
    "body_attributes" => 'class="no-margin overflow-hidden fix-full"',
];

slim_header($title, $header_args);

function echo_bad_page_report()
{
    global $PAGE_BADNESS_REASONS;

    echo "<div id='bad_page_report' style='display:none;'>";
    echo_bad_page_instructions();
    echo "<p><b>" . _("Reason") . ":</b>
    <select id='reason_selector' class='margin_a'>";
    echo "<option disabled selected value=''>", _("Please select a reason"), "</option>";
    foreach ($PAGE_BADNESS_REASONS as $reason) {
        echo "<option value='" . $reason["name"] . "'>" . $reason["string"] . "</option>";
    }
    echo "</select>",
    action_button('submit_bad_report', _("Submit")),
    action_button('cancel_bad_report', _("Cancel")),
    "</div>";
}

$forum_url_encoded = json_encode(get_url_for_forum());

echo "
<div id='proofreading_interface' data-forum_url='$forum_url_encoded' class='column-flex'>
    <div class='fixed-box border_1' id='page_control'>
        <div class='row_flex'>
            <span class='stretch-box margin_a' id='project_title'>
            </span>
            <span class='fixed-box'>
                <span id='page_number'></span>
                <a id=view_other_pages target='lg_image'>", _("View other pages"), "</a>
            </span>
        </div>
        <div class='row_flex'>
            <span class='stretch-box margin_a'>
                <a id='project_page' target='project-comments' title='", _("View Project Comments in New Window"), "'>" . _("Project Page") . "</a>
            </span>
            <span class='fixed-box'>
                <a id=editing_guidelines target='roundDoc'>", _('Guidelines'), "</a>
                <a target='viewcomments' href = '../../faq/prooffacehelp.php'>" . _('Interface Help') . "</a>
            </span>
        </div>
        <div id='action_buttons'>",
action_button('save_button', _("Save")),
action_button('exit_button', _("Exit")),
action_button('done_and_exit_button', _("Done & Exit")),
action_button('done_and_next_button', _("Done & Next")),
action_button('revert_to_original_button', _("Revert to Original")),
action_button('revert_to_saved_button', _("Revert to Saved")),
action_button('abandon_button', _("Abandon")),
action_button('report_bad_button', _("Report Bad Page")),
"</div>";
echo_bad_page_report();
echo "
</div>
<div class='stretch-box' id='image_text'>
<div id='image_container' class='column-flex'></div>
<div id='text_div' class='column-flex'></div>
</div>";
draw_toolbox();
echo "</div>";
