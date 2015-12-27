<?php
include_once($relPath.'site_vars.php');

    function maybe_mail( $to, $subject, $message, $additional_headers = null )
    // If this is for real, send the message.
    // If we're testing, just report what would have been sent.
    {
        global $testing, $auto_email_addr;

        assert(is_null($additional_headers) || is_array($additional_headers));
        if (empty($additional_headers))
        {
            $additional_headers = array();
        }

        if (!preg_grep('/^From: /', $additional_headers))
        {
            array_unshift($additional_headers, "From: $auto_email_addr");
            if (!preg_grep('/^Reply-To: /', $additional_headers))
            {
                array_unshift($additional_headers, "Reply-To: $auto_email_addr");
            }
        }

        $additional_headers = implode($additional_headers, "\r\n") . "\r\n";

        if ( $testing )
        {
            echo "\n<hr>\n";
            echo "\$testing is $testing. If it were FALSE, the following mail would have been sent:\n";
            echo "<pre>\n";
            echo htmlspecialchars("To: $to\n", ENT_NOQUOTES);
            echo htmlspecialchars("Subject: $subject\n", ENT_NOQUOTES);
            echo htmlspecialchars("$additional_headers", ENT_NOQUOTES);
            echo "\n";
            echo htmlspecialchars("$message\n", ENT_NOQUOTES);
            echo "</pre>\n";
            echo "<hr>\n";
        }
        else
        {
            mail( $to, $subject, $message, $additional_headers );
        }
    }

function maybe_mail_project_manager( $project, $info, $prefix)
// $project is either a string containing a projectid,
// or an associative array containing various attributes of a project.
{
	global $code_url, $site_name, $site_signoff;

	if (is_string($project))
	{
		$project = mysql_fetch_assoc(mysql_query("
			SELECT projectid, nameofwork, username FROM projects WHERE projectid='$project'
		"));
	}

	$projectid  = $project['projectid'];
	$nameofwork = $project['nameofwork'];
	$username   = $project['username'];

	$body =
_("Hello")." $username,\n".
sprintf(_("This is an automated message from the %s site."),$site_name)."

"._("Regarding").":
\"$nameofwork\"
  ($projectid)
  $code_url/project.php?id=$projectid

$info

$site_signoff
";

	$email_addr = mysql_result(mysql_query("
		SELECT email FROM users WHERE username = '$username'
	"),0);

	maybe_mail($email_addr, "$prefix: \"$nameofwork\"", $body);
}


?>