#!/usr/bin/env php
<?php
// Echo out the value of a site configuration setting.

if (php_sapi_name() != "cli") {
    echo "ERROR: Script can only be run from CLI\n";
    exit(1);
}

function error_abort(string $message): void
{
    fwrite(STDERR, "ERROR: $message\n");
    fwrite(STDERR, "Usage: get_config_value [--config /path/to/site_vars.php] setting_name\n");
    exit(1);
}

$args = getopt("", ["config:", "setting"], $rest_index);
$pos_args = array_slice($argv, $rest_index);

if (empty($pos_args)) {
    error_abort("No configuration setting specified.");
}

$config_file = $args["config"] ?? (__DIR__ . "/../pinc/site_vars.php");
$setting_name = $pos_args[0];

require_once(__DIR__ . "/../pinc/SiteConfig.inc");
SiteConfig::load($config_file);

$site_config = SiteConfig::get();
$reflection = new ReflectionObject($site_config);
if (! $reflection->hasProperty($setting_name)) {
    error_abort("'$setting_name' is not a valid setting name");
} else {
    echo SiteConfig::get()->$setting_name . "\n";
}
