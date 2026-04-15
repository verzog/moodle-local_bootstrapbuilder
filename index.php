<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Main entry point for the Bootstrap Page Generator tool.
 *
 * @package    local_bootstrapbuilder
 * @copyright  2024 Bootstrap Page Generator contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once('../../config.php');

$context = context_system::instance();
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/local/bootstrapbuilder/index.php'));
$PAGE->set_title(get_string('pluginname', 'local_bootstrapbuilder'));
$PAGE->set_heading(get_string('pluginname', 'local_bootstrapbuilder'));

// 'base' layout gives us the Moodle header/footer without the course sidebar.
// Switch to 'admin' if you want the standard admin nav in the header.
$PAGE->set_pagelayout('base');

require_login();
require_capability('local/bootstrapbuilder:use', $context);

// jQuery UI is still available in Moodle 4.x but is deprecated.
// It provides $.fn.draggable and $.fn.sortable which this tool depends on.
// TODO: migrate drag/drop to a vanilla JS library (e.g. SortableJS) to
//       remove this dependency before Moodle eventually drops jQuery UI.
$PAGE->requires->jquery_plugin('ui');
$PAGE->requires->jquery_plugin('ui-css');

// Boot the AMD module after the page loads.
// Pass any PHP-side config the JS needs here.
$PAGE->requires->js_call_amd('local_bootstrapbuilder/builder', 'init', [[
    'wwwroot'    => $CFG->wwwroot,
    'pluginpath' => $CFG->wwwroot . '/local/bootstrapbuilder',
    'sesskey'    => sesskey(),
]]);

echo $OUTPUT->header();

// Render the main template. The template contains the full builder UI:
// sidebar toolbox + canvas area + modals.
$templatecontext = [
    'wwwroot'       => $CFG->wwwroot,
    'pluginpath'    => $CFG->wwwroot . '/local/bootstrapbuilder',
    // Section headings and help text come from lang strings.
    'str_grid'      => get_string('gridsystem', 'local_bootstrapbuilder'),
    'str_basecss'   => get_string('basecss', 'local_bootstrapbuilder'),
    'str_forms'     => get_string('forms', 'local_bootstrapbuilder'),
    'str_components'=> get_string('components', 'local_bootstrapbuilder'),
    'str_js'        => get_string('javascript', 'local_bootstrapbuilder'),
    'str_helpgrid'  => get_string('helpgrid', 'local_bootstrapbuilder'),
    'str_helpbase'  => get_string('helpbasecss', 'local_bootstrapbuilder'),
    'str_editcontent' => get_string('editcontent', 'local_bootstrapbuilder'),
    'str_save'      => get_string('save', 'local_bootstrapbuilder'),
    'str_cancel'    => get_string('cancel', 'local_bootstrapbuilder'),
    'str_download'  => get_string('download', 'local_bootstrapbuilder'),
    'str_clear'     => get_string('clear', 'local_bootstrapbuilder'),
    'str_remove'    => get_string('remove', 'local_bootstrapbuilder'),
    'str_drag'      => get_string('drag', 'local_bootstrapbuilder'),
    'str_fluidpage' => get_string('fluidpage', 'local_bootstrapbuilder'),
    'str_fixedpage' => get_string('fixedpage', 'local_bootstrapbuilder'),
    'str_copyhtml'  => get_string('copyhtml', 'local_bootstrapbuilder'),
    'str_developer' => get_string('developer', 'local_bootstrapbuilder'),
    'str_preview'   => get_string('preview', 'local_bootstrapbuilder'),
];

echo $OUTPUT->render_from_template('local_bootstrapbuilder/main', $templatecontext);

echo $OUTPUT->footer();
