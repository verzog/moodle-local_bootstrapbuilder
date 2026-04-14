<?php
// This file is part of Moodle - https://moodle.org/
require_once('../../config.php');

$context = context_system::instance();
$PAGE->set_context($context);
$PAGE->set_url(new moodle_url('/local/pagegenerator/index.php'));
$PAGE->set_title(get_string('pluginname', 'local_pagegenerator'));
$PAGE->set_heading(get_string('pluginname', 'local_pagegenerator'));

// 'base' layout gives us the Moodle header/footer without the course sidebar.
// Switch to 'admin' if you want the standard admin nav in the header.
$PAGE->set_pagelayout('base');

require_login();
require_capability('local/pagegenerator:use', $context);

// jQuery UI is still available in Moodle 4.x but is deprecated.
// It provides $.fn.draggable and $.fn.sortable which this tool depends on.
// TODO: migrate drag/drop to a vanilla JS library (e.g. SortableJS) to
//       remove this dependency before Moodle eventually drops jQuery UI.
$PAGE->requires->jquery_plugin('ui');
$PAGE->requires->jquery_plugin('ui-css');

// Boot the AMD module after the page loads.
// Pass any PHP-side config the JS needs here.
$PAGE->requires->js_call_amd('local_pagegenerator/builder', 'init', [[
    'wwwroot'    => $CFG->wwwroot,
    'pluginpath' => $CFG->wwwroot . '/local/pagegenerator',
    'sesskey'    => sesskey(),
]]);

echo $OUTPUT->header();

// Render the main template. The template contains the full builder UI:
// sidebar toolbox + canvas area + modals.
$templatecontext = [
    'wwwroot'       => $CFG->wwwroot,
    'pluginpath'    => $CFG->wwwroot . '/local/pagegenerator',
    // Section headings and help text come from lang strings.
    'str_grid'      => get_string('gridsystem', 'local_pagegenerator'),
    'str_basecss'   => get_string('basecss', 'local_pagegenerator'),
    'str_forms'     => get_string('forms', 'local_pagegenerator'),
    'str_components'=> get_string('components', 'local_pagegenerator'),
    'str_js'        => get_string('javascript', 'local_pagegenerator'),
    'str_helpgrid'  => get_string('helpgrid', 'local_pagegenerator'),
    'str_helpbase'  => get_string('helpbasecss', 'local_pagegenerator'),
    'str_editcontent' => get_string('editcontent', 'local_pagegenerator'),
    'str_save'      => get_string('save', 'local_pagegenerator'),
    'str_cancel'    => get_string('cancel', 'local_pagegenerator'),
    'str_download'  => get_string('download', 'local_pagegenerator'),
    'str_clear'     => get_string('clear', 'local_pagegenerator'),
    'str_remove'    => get_string('remove', 'local_pagegenerator'),
    'str_drag'      => get_string('drag', 'local_pagegenerator'),
    'str_fluidpage' => get_string('fluidpage', 'local_pagegenerator'),
    'str_fixedpage' => get_string('fixedpage', 'local_pagegenerator'),
    'str_copyhtml'  => get_string('copyhtml', 'local_pagegenerator'),
    'str_developer' => get_string('developer', 'local_pagegenerator'),
    'str_preview'   => get_string('preview', 'local_pagegenerator'),
];

echo $OUTPUT->render_from_template('local_pagegenerator/main', $templatecontext);

echo $OUTPUT->footer();
