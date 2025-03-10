<?php
// This file defines the class 'Stage', which (depending on your point of view)
// represents:
// -- a stage in the life of a project, or
// -- the set of all projects currently in that stage, or
// -- an area that houses that set of projects.
//
// It's a generalization of the existing ideas of 'round' and 'pool',
// and a specialization of the concept of 'Activity'.

include_once($relPath.'Activity.inc');

/*
 * A singleton container class for accessing Stage objects.
 * See the Activities class definition for more information.
 */
class Stages extends Activities
{
}

class Stage extends Activity
{
    public string $description;
    public ?string $document;
    public string $relative_url;

    /**
     * Stage constructor
     *
     * @param string $description
     *   A sentence or two explaining what happens in this stage.
     * @param ?string $document
     *   The path (relative to `$code_url/faq/`) of a document that tells you
     *   everything you need to know about working in this stage.
     *   Or NULL if there is no such document.
     * @param string $relative_url
     *   The "home" location (relative to `$code_url/`) of the stage.
     */
    public function __construct(
        string $id,
        string $name,
        /** @var array<string,int> */
        array $access_minima,
        string $after_satisfying_minima,
        string $evaluation_criteria,
        ?string $access_change_callback,
        string $description,
        ?string $document,
        string $relative_url
    ) {
        parent::__construct(
            $id,
            $name,
            $access_minima,
            $after_satisfying_minima,
            $evaluation_criteria,
            $access_change_callback
        );

        $this->description = $description;
        $this->document = $document;
        $this->relative_url = $relative_url;
    }


    /**
     * Display a page-header, either an image (if available) or a textual title
     * for this stage.
     */
    public function page_header(string $title): void
    {
        echo "<h1>$title</h1>\n" . get_page_header_image($this->id);
    }

    public function page_top(object $uao): void
    {
        $this->page_header("{$this->id}: {$this->name}");

        if (!$uao->can_access) {
            echo "<p>";
            echo sprintf(_("Welcome to %s!"), $this->id), "\n";
            echo _("Feel free to explore this stage."), "\n";
            echo _("You can find out what happens here, and follow the progress of projects from earlier rounds."), "\n";
            echo _("If you're interested in working in this stage, see below to find out how you can qualify."), "\n";
            echo "</p>";
            echo "\n";
        }

        echo "<p>";
        echo "<b>";
        echo _('What happens in this stage');
        echo ":</b><br>";
        echo $this->description;
        echo "</p>\n";
    }
}

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

function get_Stage_for_id(string $id): ?Stage
{
    return Stages::get_by_id($id);
}

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

function user_can_work_in_stage(string $username, string $stage_id): bool
{
    $stage = get_Stage_for_id($stage_id);
    $uao = $stage->user_access($username);
    return $uao->can_access;
}

// XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

/** @return Stage[] */
function get_stages_user_can_work_in(string $username): array
{
    $accessible_stages = [];
    foreach (Stages::get_all() as $stage) {
        $uao = $stage->user_access($username);
        if ($uao->can_access) {
            $accessible_stages[$stage->id] = $stage;
        }
    }

    return $accessible_stages;
}

/**
 * Return an array of stages for which the user has access to all prereq stages.
 *
 * If $include_accessible_stages is true, this array also includes
 * stages the user has access to.
 *
 * @return Stage[]
 */
function get_stages_for_which_user_has_access_to_prereqs(string $username, bool $include_accessible_stages = false): array
{
    $satisfied_prereq_stages = [];

    // get stages that the user can currently access
    $accessible_stages = get_stages_user_can_work_in($username);

    // if the caller wants the accessible stages too (not just the prereq
    // stages) start with the accessible list
    if ($include_accessible_stages) {
        $satisfied_prereq_stages = $accessible_stages;
    }

    foreach (Stages::get_all() as $stage) {
        // skip stages for which the user already has access
        if (isset($accessible_stages[$stage->id])) {
            continue;
        }

        // get all pre-reqs for this stage
        $prereq_criteria = [];
        foreach ($stage->access_minima as $criterion => $value) {
            $prereq_criteria = array_merge($prereq_criteria, explode('+', $criterion));
        }
        $prereq_criteria = array_unique($prereq_criteria);

        // don't include rounds that have no round access requirements (eg: PPV)
        if (count($prereq_criteria) == 0) {
            $has_access_to_all_prereq_stages = false;
        } else {
            // check to see if the user has access to all pre-req stages
            // assume they do and see about disproving it
            $has_access_to_all_prereq_stages = true;

            foreach ($prereq_criteria as $prereq_criterion) {
                // check that the criterion in question is a stage
                // and that the user can access it
                if (Stages::get_by_id($prereq_criterion) && !isset($accessible_stages[$prereq_criterion])) {
                    $has_access_to_all_prereq_stages = false;
                    break;
                }
            }
        }

        if ($has_access_to_all_prereq_stages) {
            $satisfied_prereq_stages[$stage->id] = $stage;
        }
    }

    return $satisfied_prereq_stages;
}
