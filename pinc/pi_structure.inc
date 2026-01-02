<?php

// "pi" = "proofing interface"

function url_for_pi_do_whichever_page(string $projectid, string $proj_state, bool $escape_amp = false): string
{
    global $code_url;
    if ($escape_amp) {
        $amp = '&amp;';
    } else {
        $amp = '&';
    }
    return "$code_url/tools/proofers/proof.php"
        . "?"
        . "projectid=$projectid"
        . $amp
        . "proj_state=$proj_state";
}

function url_for_pi_do_particular_page(string $projectid, string $proj_state, string $imagefile, string $page_state, bool $escape_amp = false): string
{
    global $code_url;
    if ($escape_amp) {
        $amp = '&amp;';
    } else {
        $amp = '&';
    }
    return "$code_url/tools/proofers/proof.php"
        . "?"
        . "projectid=$projectid"
        . $amp
        . "imagefile=$imagefile"
        . $amp
        . "proj_state=$proj_state"
        . $amp
        . "page_state=$page_state";
}

function draw_toolbox()
{
    echo "
<div class='fixed-box tool_box row_flex' id='toolbox'>
    <div id='character-picker' class='fixed-box'>
        <div id='picker-widgets' class='row_flex'>
            <button type='button' id='hide-picker-button' title='", attr_safe(_("Hide the character picker")), "'>&lang;</button>
            <div class='char_box'><input type='text' readonly class='big_text' id='large-char'></div>
            <div id='picker_box'>
            </div>
        </div>
        <button type='button' id='show-picker-button' style='display: none;' title='", attr_safe(_("Show the character picker")), "'>&rang;</button>
    </div>
    <div id='tools' class='stretch-box right-align'>
    <div class='tool_row'>",
    action_button('italic', '<i>i</i>', _('italics'), "format_tool"),
    action_button('bold', '<b>B</b>', _('Bold'), "format_tool"),
    action_button('small_caps', '<span style="font-variant: small-caps;">Sc</span>', _('Small Caps markup'), "format_tool"),
    action_button('gesperrt', 'g', _('Gesperrt (spaced out)'), "format_tool"),
    action_button('antiqua', 'f', _('Antiqua'), "format_tool"),
    action_button('remove_markup', "<span style='text-decoration: line-through;'>&lt;x&gt;</span>", _('Remove markup from selection')),
    action_button('upper_case', 'ABC', _('Uppercase selection')),
    action_button('title_case', 'Abc', _('Title case selection')),
    action_button('lower_case', 'abc', _('Lowercase selection')),
    "</div>
    <div class='tool_row'>",
    action_button('sidenote', '[Sidenote: ]', '[Sidenote:', "format_tool"),
    action_button('illustration', '[Illustration: ]', '[Illustration:', "format_tool"),
    action_button('note', '[** ]', _('Note')),
    action_button('brackets', '[ ]', '[ ]'),
    action_button('braces', '{ }', '{ }'),
    action_button('footnote', '[Footnote #: ]', '[Footnote #:', "format_tool"),
    action_button('slash_star', '/* */', _('Start poetry/table'), "format_tool"),
    action_button('slash_number', '/# #/', _('Start block quote'), "format_tool"),
    action_button('thought_break', '&lt;tb&gt;', _('Thought Break'), "format_tool"),
    action_button('blank_page', '[Blank Page]', '[Blank Page]'),
    "</div>
        </div>
</div>";
}

function action_button($id, $label, $title = "", $class = "")
{
    $class_attr = $class ? "class='$class'" : "";
    return "<button type='button' id='$id' title='$title' $class_attr>$label</button>";
}
