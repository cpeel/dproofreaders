<?
$relPath='../pinc/';
include_once($relPath.'dp_main.inc');
include_once($relPath.'f_dpsql.inc');
include_once($relPath.'theme.inc');
include_once($relPath.'page_tally.php');

$tally_name = @$_GET['tally_name'];
if ( empty($tally_name) )
{
	die("parameter 'tally_name' is unset/empty");
}

// -----------------------------------

$title = sprintf( _("Miscellaneous Statistics for Round %s"), $tally_name );
theme($title, "header");

echo "<br><br><h2>$title</h2><br>\n";

show_all_time_total();

show_month_sums( 'top_ten' );

show_top_days( 30, 'ever' );
show_top_days( 10, 'this_year' );

show_month_sums( 'all_chron' );
show_month_sums( 'all_by_pages' );

show_months_with_most_days_over(5000);
show_months_with_most_days_over(6000);
show_months_with_most_days_over(7000);
show_months_with_most_days_over(8000);
show_months_with_most_days_over(9000);

// -----------------------------------------------------------------------------

function show_all_time_total()
{
	global $tally_name;

	$sub_title = _("Total Pages Proofread Since Statistics Were Kept");
	echo "<h3>$sub_title</h3>\n";


	$site_tallyboard = new TallyBoard( $tally_name, 'S' );
	$holder_id = 1;
	echo $site_tallyboard->get_current_tally($holder_id);

	echo "<br>\n";
	echo "<br>\n";
}

function show_top_days( $n, $when )
{
	global $tally_name;

	switch ( $when )
	{
		case 'ever':
			$where = '';
			$sub_title = sprintf( _('Top %d Proofreading Days Ever'), $n );
			break;

		case 'this_year':
			$where = 'WHERE {is_curr_year}';
			$sub_title = sprintf( _('Top %d Proofreading Days This Year'), $n );
			break;

		default:
			die( "bad value for 'when': '$when'" );
	}

	echo "<h3>$sub_title</h3>\n";

	dpsql_dump_themed_ranked_query(
		select_from_site_past_tallies_and_goals(
			$tally_name,
			"SELECT
				{date} as 'Date',
				tally_delta as 'Pages Proofread',
				IF({is_curr_month}, '******',' ') as 'This Month?'",
			$where,
			"",
			"ORDER BY 2 DESC",
			"LIMIT $n"
		)
	);

	echo "<br>\n";
}

function show_month_sums( $which )
{
	global $tally_name;

	switch ( $which )
	{
		case 'top_ten':
			$sub_title = _("Top Ten Best Proofreading Months");
			$order = '2 DESC';
			$limit = 'LIMIT 10';
			break;

		case 'all_chron':
			$sub_title = _("Historical Log of Total Pages Proofread Per Month");
			$order = '1'; // chronological
			$limit = '';
			break;

		case 'all_by_pages':
			$sub_title = _("Total Pages Proofread Per Month");
			$order = '2 DESC';
			$limit = '';
			break;

		default:
			die( "bad value for 'which': '$which'" );
	}

	echo "<h3>$sub_title</h3>\n";

	dpsql_dump_themed_ranked_query(
		select_from_site_past_tallies_and_goals(
			$tally_name,
			"SELECT
				{year_month} as 'Month',
				SUM(tally_delta) as 'Pages Proofread',
				SUM(goal) as 'Monthly Goal',
				IF({is_curr_month}, '******',' ') as 'This Month?'",
			"",
			"GROUP BY 1",
			"ORDER BY $order",
			$limit
		)
	);

	echo "<br>\n";
}

function show_months_with_most_days_over( $n )
{
	global $tally_name;

	$sub_title = sprintf( _('Months with most days over %s pages'), number_format($n) );
	echo "<h3>$sub_title</h3>\n";

	dpsql_dump_themed_ranked_query(
		select_from_site_past_tallies_and_goals(
			$tally_name,
			"SELECT
				{year_month} as 'Month',
				count(*) as 'Number of Days',
				IF({is_curr_month}, '******',' ') as 'This Month?'",
			"WHERE tally_delta >= $n",
			"GROUP BY 1",
			"ORDER BY 2 DESC",
			"LIMIT 10"
		)
	);

	echo "<br>\n";
}

theme("","footer");
?>

