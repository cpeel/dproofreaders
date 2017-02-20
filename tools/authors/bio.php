<?php
// Display the biography specified by bio_id-argument
$relPath = '../../pinc/';
include_once($relPath.'base.inc');
include_once($relPath.'theme.inc');
include_once($relPath.'misc.inc'); // get_integer_param(), html_safe()
include_once('authors.inc');
include_once('menu.inc');

require_login();

$bio_id  = get_integer_param($_GET, 'bio_id', null, 0, null, true);
$message = @$_GET['message'];

// argument provided?
if (isset($bio_id)) {
    $id = $bio_id;
}
else {
    output_header(_('No biography-id specified'));
    echo _('An error occurred.') . ' ' . _('No biography-id was specified.') . ' ';
    echo sprintf(_('You may return to the <a href="%1$s">authors-listing</a>.'), 'listing.php');
    exit();
}

// try to get bio
$result = mysql_query("SELECT author_id, bio FROM biographies WHERE bio_id=$id;");
$row = mysql_fetch_assoc($result);
if (!$row) {
    output_header(_('Invalid biography-id specified'));
    echo _('An error occurred.') . ' ' . _('The specified biography-id was invalid.') . ' ';
    echo sprintf(_('You may return to the <a href="%1$s">authors-listing</a>.'), 'listing.php');
    exit();
}
$author_id = $row["author_id"];
$bio = $row["bio"];

$bio = preg_replace("/�/", "&aring;", $bio);

// the author
$result = mysql_query("SELECT last_name, other_names FROM authors WHERE author_id=$author_id;");
$row = mysql_fetch_assoc($result);
$last_name = $row["last_name"];
$other_names = $row["other_names"];

$name = $last_name . ($other_names!=''?", $other_names":'');

// Start outputting
output_header(_('Biography:') . " $name");

echo_menu($bio_id);

echo '<h1 align="center">' . _('Biography') . '</h1>';

if (isset($message))
    echo '<center>' . html_safe($message) . '</center><br />';
?>
<h2 align="center"><?php echo html_safe($name); ?> 
<a href='<?php echo $code_url; ?>/tools/authors/bioxml.php?bio_id=<?php echo $id; ?>'><img src='<?php echo $code_url; ?>/graphics/xml.gif' border='0' width='36' height='14' style='vertical-align:middle'></a>
</h2>
<?php
if (user_is_PM() || user_is_authors_db_manager()) {
    echo _('To include this biography into the project comments of a project, insert the following snippet into the project comments:');
    echo " <b>[biography=$id]</b>";
}
?>
<br /><br />
<table align="center" border="1">
<tr><td>
<?php echo html_safe($bio); ?>
</td></tr>
</table>
<?php

echo_menu($bio_id);

// vim: sw=4 ts=4 expandtab
