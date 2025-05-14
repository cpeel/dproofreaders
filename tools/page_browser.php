<?php
$relPath = '../pinc/';
include_once($relPath.'base.inc');
include_once($relPath.'slim_header.inc');

require_login();

$title = _("Browse pages");

$js_files = [
    "$code_url/scripts/splitControl.js",
    "$code_url/scripts/misc.js",
    "$code_url/tools/page_browser.js|module",
    "https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js",
];

$header_args = [
    "css_files" => [
        "$code_url/styles/struct.css",
        "https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.core.css",
    ],
    "js_files" => $js_files,
    "body_attributes" => 'class="no-margin overflow-hidden fix-full"',
];

slim_header($title, $header_args);

echo "<div id='page_browser' class='column-flex'></div>";
