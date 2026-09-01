<?php
// This configuration file is used for environment set up as part of
// Continuous Integration.

$testing = true;

$db_server = "localhost";
$db_user = "dp_test_user";
$db_password = "dp_test_password";
$db_name = "dp_test_db";

$archive_db_name = "dp_test_archive";
$archive_projects_dir = getenv("HOME") . "/projects.archive";

$code_dir = __DIR__ . "/../";
$code_url = "http://127.0.0.1:12345";

$projects_dir = getenv("HOME") . "/projects";
$projects_url = "$code_url/projects";

$dyn_dir = $code_dir;
$dyn_url = $code_url;

$uploads_dir = getenv("HOME") . "/uploads";

$forum_type = "json";
$forums_json_users = "$code_dir/SETUP/tests/smoketests/users.json";
$forums_json_posts = "$code_dir/SETUP/tests/smoketests/posts.json";

$site_name = "CI";
$site_abbreviation = "TCI";
$site_url = $code_url;

$api_storage_keys = ["valid"];
