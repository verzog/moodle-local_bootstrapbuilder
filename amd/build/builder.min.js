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
 * AMD module: local_bootstrapbuilder/builder
 *
 * Main entry point for the Bootstrap Page Generator tool.
 * Initialised from index.php via:
 *   $PAGE->requires->js_call_amd('local_bootstrapbuilder/builder', 'init', [config]);
 *
 * @module     local_bootstrapbuilder/builder
 * @copyright  2024 Bootstrap Page Generator contributors
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define([
    'jquery',
    'jqueryui',
    'core/notification',
    'core/str',
], function($, jqueryui, Notification, Str) {

    // ── Config passed from PHP ──────────────────────────────────────────────
    var cfg = {};

    // ── State ───────────────────────────────────────────────────────────────
    var layoutHistory = null;
    var stopSave = 0;
    var startDrag = 0;
    var currentEditor = null;   // reference to the .pg-view being edited
    var generatedHtml = '';

    // ── LocalStorage helpers ────────────────────────────────────────────────
    /**
     * Check whether the browser supports localStorage.
     *
     * @returns {boolean} True if localStorage is available.
     */
    function supportsStorage() {
        return typeof window.localStorage === 'object';
    }

    /**
     * Snapshot the current canvas HTML and push it onto the undo history.
     */
    function saveLayout() {
        var html = $('.pg-demo').html();
        if (!layoutHistory) {
            layoutHistory = {count: 0, list: []};
        }
        // Trim redo branch when saving a new state
        layoutHistory.list = layoutHistory.list.slice(0, layoutHistory.count);
        layoutHistory.list.push(html);
        layoutHistory.count = layoutHistory.list.length;
        if (supportsStorage()) {
            localStorage.setItem('pg_layoutdata', JSON.stringify(layoutHistory));
        }
    }

    /**
     * Restore the last saved canvas state from localStorage on page load.
     */
    function restoreData() {
        if (!supportsStorage()) { return; }
        var stored = localStorage.getItem('pg_layoutdata');
        if (!stored) { return; }
        try {
            layoutHistory = JSON.parse(stored);
            var html = layoutHistory.list[layoutHistory.count - 1];
            if (html) { $('.pg-demo').html(html); }
        } catch (e) {
            Notification.exception(e);
        }
    }

    /**
     * Step back one entry in the undo history.
     *
     * @returns {boolean} True if an undo was possible.
     */
    function undoLayout() {
        if (!layoutHistory || layoutHistory.count < 2) { return false; }
        layoutHistory.count--;
        $('.pg-demo').html(layoutHistory.list[layoutHistory.count - 1]);
        if (supportsStorage()) {
            localStorage.setItem('pg_layoutdata', JSON.stringify(layoutHistory));
        }
        return true;
    }

    /**
     * Step forward one entry in the undo history.
     *
     * @returns {boolean} True if a redo was possible.
     */
    function redoLayout() {
        if (!layoutHistory || !layoutHistory.list[layoutHistory.count]) { return false; }
        $('.pg-demo').html(layoutHistory.list[layoutHistory.count]);
        layoutHistory.count++;
        if (supportsStorage()) {
            localStorage.setItem('pg_layoutdata', JSON.stringify(layoutHistory));
        }
        return true;
    }

    // Periodic save (1 second debounce)
    var lastHtml = '';
    /**
     * Periodic auto-save callback. Saves only when the canvas content has changed.
     */
    function handleSaveLayout() {
        var html = $('.pg-demo').html();
        if (!stopSave && html !== lastHtml) {
            stopSave++;
            lastHtml = html;
            saveLayout();
            stopSave--;
        }
    }

    // ── Drag & Drop ─────────────────────────────────────────────────────────
    /**
     * Initialise the canvas and column sortable widgets.
     */
    function initContainer() {
        // Canvas + columns are sortable
        $('.pg-demo, .pg-demo .column').sortable({
            connectWith: '.column',
            opacity: 0.9,
            tolerance: 'pointer',
            placeholder: 'ui-sortable-placeholder',
            forcePlaceholderSize: true,
            handle: '.pg-drag',
            start: function() {
                $('body').addClass('pg-dragging');
                if (!startDrag) { stopSave++; }
                startDrag = 1;
            },
            stop:  function() {
                $('body').removeClass('pg-dragging');
                if (stopSave > 0) { stopSave--; }
                startDrag = 0;
            }
        });
        initConfigurationHandlers();
    }

    /**
     * Initialise sidebar items as jQuery UI draggables.
     * Rows connect to the canvas sortable; boxes connect to column sortables.
     */
    function initDraggables() {
        // Sidebar rows → draggable into canvas (whole item is the handle)
        $('#pg-sidebar .pg-lyrow').draggable({
            connectToSortable: '.pg-demo',
            helper: 'clone',
            appendTo: 'body',
            cursor: 'grabbing',
            start: function() {
                $('body').addClass('pg-dragging');
                if (!startDrag) { stopSave++; }
                startDrag = 1;
            },
            drag:  function(e, ui) { ui.helper.width(420); },
            stop:  function() {
                $('body').removeClass('pg-dragging');
                // Make new columns sortable, then re-init box draggables so
                // they can connect to the newly created columns.
                $('.pg-demo .column').sortable({
                    opacity: 0.9,
                    tolerance: 'pointer',
                    placeholder: 'ui-sortable-placeholder',
                    forcePlaceholderSize: true,
                    connectWith: '.column',
                    start: function() {
                        $('body').addClass('pg-dragging');
                        if (!startDrag) { stopSave++; }
                        startDrag = 1;
                    },
                    stop:  function() {
                        $('body').removeClass('pg-dragging');
                        if (stopSave > 0) { stopSave--; }
                        startDrag = 0;
                    }
                });
                initBoxDraggables();
                if (stopSave > 0) { stopSave--; }
                startDrag = 0;
            }
        });

        initBoxDraggables();
    }

    /**
     * Initialise (or re-initialise) sidebar box draggables.
     * Called at startup and after every row drop so boxes can connect to
     * any newly created .column sortables on the canvas.
     */
    function initBoxDraggables() {
        // Destroy existing draggable first to avoid double-binding.
        $('#pg-sidebar .pg-box').each(function() {
            if ($(this).data('ui-draggable')) {
                $(this).draggable('destroy');
            }
        });

        $('#pg-sidebar .pg-box').draggable({
            connectToSortable: '.column',
            helper: 'clone',
            appendTo: 'body',
            cursor: 'grabbing',
            start: function() {
                $('body').addClass('pg-dragging');
                if (!startDrag) { stopSave++; }
                startDrag = 1;
            },
            drag:  function(e, ui) { ui.helper.width(420); },
            stop:  function() {
                $('body').removeClass('pg-dragging');
                handleJsIds();
                if (stopSave > 0) { stopSave--; }
                startDrag = 0;
            }
        });
    }

    // ── Element removal ─────────────────────────────────────────────────────
    /**
     * Bind delegated click handler for removing rows and elements from the canvas.
     */
    function initRemoveHandler() {
        // Delegated so it works on dynamically dropped elements
        $('.pg-demo').on('click', '.pg-remove', function(e) {
            e.preventDefault();
            $(this).closest('.pg-lyrow, .pg-box-element').remove();
            if (!$('.pg-demo .pg-lyrow').length) {
                clearDemo();
            }
        });
    }

    // ── Configuration toolbar handlers ──────────────────────────────────────
    // Handles the small per-element config toolbars (align, emphasis, etc.)
    /**
     * Bind per-element configuration toolbar handlers (alignment, emphasis, etc.).
     */
    function initConfigurationHandlers() {
        // Simple toggle button (e.g. "Lead", "Pull Right")
        $('.pg-demo').on('click', '.pg-configuration > a', function(e) {
            e.preventDefault();
            var target = $(this).closest('.pg-configuration').siblings('.pg-view').children();
            $(this).toggleClass('active');
            target.toggleClass($(this).attr('rel'));
        });

        // Dropdown option (e.g. Align: Left / Center / Right)
        $('.pg-demo').on('click', '.pg-configuration .dropdown-menu a', function(e) {
            e.preventDefault();
            var menu    = $(this).closest('.dropdown-menu');
            var target  = menu.closest('.pg-configuration').siblings('.pg-view').children();
            var current = menu.find('li.active a').attr('rel');
            menu.find('li').removeClass('active');
            $(this).closest('li').addClass('active');
            if (current) { target.removeClass(current); }
            if ($(this).attr('rel')) { target.addClass($(this).attr('rel')); }
            // Close the dropdown (BS5)
            $(this).closest('.dropdown').removeClass('show');
            menu.removeClass('show');
        });
    }

    // ── Grid system generator ────────────────────────────────────────────────
    // Re-builds the .pg-view columns when the user edits the preview input.
    /**
     * Re-generate column divs when the user edits a grid preview input.
     * Values must be space-separated integers that sum to 12.
     */
    function initGridGenerator() {
        $('#pg-sidebar').on('keyup', '.pg-lyrow .pg-preview input', function() {
            var total = 0;
            var html  = '';
            var valid = true;
            var parts = $(this).val().split(' ').slice(0, 12);
            parts.forEach(function(n) {
                var v = parseInt(n, 10);
                if (isNaN(v) || v <= 0) { valid = false; return; }
                total += v;
                html += '<div class="col-' + v + ' column"></div>';
            });
            var view = $(this).closest('.pg-lyrow').find('.pg-view');
            if (valid && total === 12) {
                view.children('.pg-row-block').html(html);
            }
        });
    }

    // ── Section accordion in sidebar ─────────────────────────────────────────
    /**
     * Initialise the sidebar section accordion toggle behaviour.
     * Opens the Grid System section by default.
     */
    function initSidebar() {
        $('#pg-sidebar').on('click', '.pg-section-header', function() {
            var id = $(this).data('section');
            // Toggle this section; close others
            $('#pg-sidebar .pg-section-body').not('#' + id).removeClass('active');
            $('#' + id).toggleClass('active');
        });
        // Open grid section by default
        $('#pg-grid').addClass('active');
    }

    // ── Editor modal ─────────────────────────────────────────────────────────
    // Opens with the selected element's HTML; saves back on confirm.
    //
    // TODO: Replace the plain <textarea> with Moodle's TinyMCE 6 editor.
    //       Use editor_textarea_use_editor() in PHP + require('editor_tiny/editor')
    //       in this AMD module to initialise it on modal open.
    /**
     * Initialise the content editor modal (open/save cycle).
     *
     * TODO: Replace the plain textarea with Moodle TinyMCE 6 via
     *       editor_textarea_use_editor() in PHP + require('editor_tiny/editor').
     */
    function initEditorModal() {
        // Open: populate textarea from the element's .pg-view
        $('#bootstrapbuilder-wrap').on('click', '[data-bs-target="#pg-editorModal"]', function(e) {
            e.preventDefault();
            currentEditor = $(this).closest('.pg-box-element').find('.pg-view');
            $('#pg-contenteditor').val(currentEditor.html());
        });

        // Save: write textarea content back
        $('#pg-savecontent').on('click', function() {
            if (currentEditor) {
                currentEditor.html($('#pg-contenteditor').val());
            }
        });
    }

    // ── Download / HTML generation ───────────────────────────────────────────
    /**
     * Generate clean Bootstrap 5 HTML from the current canvas and populate
     * the download modal textarea.
     */
    function downloadLayoutSrc() {
        var $layout = $('#pg-download-layout');
        $layout.children().html($('.pg-demo').html());
        var $t = $layout.children();

        // Strip builder chrome
        $t.find('.pg-preview, .pg-configuration, .pg-drag, .pg-remove').remove();

        // Unwrap lyrow/box-element wrappers (leave only the row/col structure)
        $t.find('.pg-lyrow, .pg-box-element').each(function() {
            $(this).replaceWith($(this).children('.pg-view').children());
        });

        // Clean up jQuery UI classes
        $t.find('.column').removeClass('ui-sortable column');
        $t.find('.pg-row-block').removeClass('pg-row-block clearfix').addClass('row');

        // Use container vs container-fluid based on current selection
        if ($('#pg-fixedPage').hasClass('active')) {
            $layout.find('.container-fluid').removeClass('container-fluid').addClass('container');
        }

        // Format and display
        var html = $layout.html();
        $('#pg-generatedhtml').val(html);
        generatedHtml = html;
    }

    // Copy to clipboard
    /**
     * Bind the Copy HTML button in the download modal.
     */
    function initCopyButton() {
        $('#pg-copyhtml').on('click', function() {
            var text = $('#pg-generatedhtml').val();
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(function() {
                    Str.get_string('copiedtoclipboard', 'local_bootstrapbuilder').then(function(s) {
                        Notification.addNotification({message: s, type: 'success'});
                        return;
                    }).catch(Notification.exception);
                });
            } else {
                // Fallback for older browsers
                var $ta = $('#pg-generatedhtml');
                $ta.select();
                document.execCommand('copy');
            }
        });
    }

    // ── Save as .html file (uses FileSaver pattern) ──────────────────────────
    // Called by the Download button's onclick="pgSaveHtml()"
    /**
     * Trigger a browser file download of the generated HTML page.
     * Exposed on window so it can be called from an inline onclick in the template.
     *
     * @global
     */
    window.pgSaveHtml = function() {
        var html = [
            '<!DOCTYPE html>',
            '<html lang="en">',
            '<head>',
            '  <meta charset="utf-8">',
            '  <meta name="viewport" content="width=device-width, initial-scale=1">',
            '  <title>Generated Page</title>',
            '  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">',
            '</head>',
            '<body>',
            generatedHtml,
            '  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"><\/script>',
            '</body>',
            '</html>'
        ].join('\n');

        var blob = new Blob([html], {type: 'text/html;charset=utf-8'});
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href   = url;
        a.download = 'webpage.html';
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── View mode toggles ────────────────────────────────────────────────────
    /**
     * Bind the Edit / Developer / Preview mode toggle buttons.
     */
    function initViewModes() {
        var $wrap = $('#bootstrapbuilder-wrap');

        $('#pg-edit').on('click', function() {
            $wrap.removeClass('devpreview sourcepreview').addClass('edit');
            setActiveMode(this);
        });
        $('#pg-devpreview').on('click', function() {
            $wrap.removeClass('edit sourcepreview').addClass('devpreview');
            setActiveMode(this);
        });
        $('#pg-sourcepreview').on('click', function() {
            $wrap.removeClass('edit').addClass('devpreview sourcepreview');
            setActiveMode(this);
        });

        function setActiveMode(btn) {
            $('#pg-viewModeGroup .btn').removeClass('active');
            $(btn).addClass('active');
        }
    }

    // ── Canvas resize (simulates viewport sizes) ──────────────────────────────
    /**
     * Resize the canvas to simulate a viewport breakpoint.
     * Exposed on window so it can be called from inline onclick in the template.
     *
     * @global
     * @param {string} size - Breakpoint key: 'lg', 'md', 'sm', or 'xs'.
     */
    window.pgResizeCanvas = function(size) {
        var sizes = {lg: '100%', md: '992px', sm: '768px', xs: '480px'};
        $('#pg-canvas .pg-demo').css('max-width', sizes[size] || '100%');
    };

    // ── Toolbar buttons ──────────────────────────────────────────────────────
    /**
     * Bind toolbar button handlers: clear, undo, redo, download modal, fluid/fixed toggle.
     */
    function initToolbar() {
        $('#pg-clear').on('click', function() {
            clearDemo();
        });
        $('#pg-undo').on('click', function() {
            stopSave++;
            if (undoLayout()) { initContainer(); }
            stopSave--;
        });
        $('#pg-redo').on('click', function() {
            stopSave++;
            if (redoLayout()) { initContainer(); }
            stopSave--;
        });

        // Populate HTML textarea when download modal opens
        $('#pg-downloadModal').on('show.bs.modal', function() {
            downloadLayoutSrc();
        });

        // Fluid / Fixed page toggle
        $('#pg-fluidPage').on('click', function() {
            $(this).addClass('active').removeClass('btn-outline-info').addClass('btn-info');
            $('#pg-fixedPage').removeClass('active').addClass('btn-outline-info').removeClass('btn-info');
            downloadLayoutSrc();
        });
        $('#pg-fixedPage').on('click', function() {
            $(this).addClass('active').removeClass('btn-outline-info').addClass('btn-info');
            $('#pg-fluidPage').removeClass('active').addClass('btn-outline-info').removeClass('btn-info');
            downloadLayoutSrc();
        });
    }

    // ── Clear ────────────────────────────────────────────────────────────────
    /**
     * Clear the canvas and reset undo history.
     */
    function clearDemo() {
        $('.pg-demo').empty();
        layoutHistory = null;
        if (supportsStorage()) { localStorage.removeItem('pg_layoutdata'); }
    }

    // ── JS ID handlers (prevent duplicate IDs when components are dropped) ───
    /**
     * Assign unique IDs to all JS component instances in the canvas.
     * Called after a box is dropped to prevent duplicate IDs.
     */
    function handleJsIds() {
        handleModalIds();
        handleAccordionIds();
        handleTabsIds();
    }

    /**
     * Generate a random 6-digit integer for use in unique IDs.
     *
     * @returns {number} A random integer between 0 and 999999.
     */
    function randomId() {
        return Math.floor(Math.random() * 1000000);
    }

    /**
     * Reassign unique IDs to accordion components dropped into the canvas.
     */
    function handleAccordionIds() {
        $('.pg-demo #myAccordion').each(function() {
            var newId = 'accordion-' + randomId();
            $(this).attr('id', newId);
            $(this).find('.accordion-item').each(function() {
                var bodyId = 'acc-' + randomId();
                var headId = 'head-' + randomId();
                $(this).find('.accordion-button').attr({
                    'data-bs-target': '#' + bodyId,
                    'aria-controls':   bodyId
                });
                $(this).find('.accordion-collapse').attr({
                    'id':               bodyId,
                    'aria-labelledby':  headId,
                    'data-bs-parent':  '#' + newId
                });
                $(this).find('.accordion-header').attr('id', headId);
            });
        });
    }

    /**
     * Reassign unique IDs to modal components dropped into the canvas.
     */
    function handleModalIds() {
        $('.pg-demo #myModalLink').each(function() {
            var modalId = 'modal-' + randomId();
            var linkId  = 'link-' + randomId();
            $(this).attr({'id': linkId, 'data-bs-target': '#' + modalId});
            $(this).siblings('[id="myModalContainer"]').attr('id', modalId);
        });
    }

    /**
     * Reassign unique IDs to tab components dropped into the canvas.
     */
    function handleTabsIds() {
        $('.pg-demo #myTabs').each(function() {
            var newId = 'tabs-' + randomId();
            $(this).attr('id', newId);
            $(this).find('.tab-pane').each(function() {
                var oldId = $(this).attr('id');
                var newPaneId = 'pane-' + randomId();
                $(this).attr('id', newPaneId);
                $(this).closest('.tab-content')
                    .siblings('.nav-tabs')
                    .find('a[href="#' + oldId + '"]')
                    .attr('href', '#' + newPaneId);
            });
        });
    }

    // ── Public init ─────────────────────────────────────────────────────────
    return {
        init: function(config) {
            cfg = config || {};

            restoreData();
            initSidebar();
            initContainer();
            initDraggables();
            initRemoveHandler();
            initGridGenerator();
            initEditorModal();
            initViewModes();
            initToolbar();
            initCopyButton();

            // Auto-save every second
            setInterval(handleSaveLayout, 1000);
        }
    };
});
