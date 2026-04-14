<?php
// This file is part of Moodle - https://moodle.org/
defined('MOODLE_INTERNAL') || die();

$capabilities = [
    // Who can open and use the page builder tool.
    'local/pagegenerator:use' => [
        'captype'      => 'write',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes'   => [
            'editingteacher' => CAP_ALLOW,
            'teacher'        => CAP_ALLOW,
            'manager'        => CAP_ALLOW,
        ],
    ],
];
