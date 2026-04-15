# Bootstrap Builder for Moodle (`local_bootstrapbuilder`)

A drag-and-drop Bootstrap 5 page builder for Moodle. Teachers visually build a layout from a sidebar of components, then **copy or download the generated HTML** to paste into any Moodle rich text editor (Page, Label, Book chapter, etc.).

No content is stored in the database — the tool is a design aid, not a content type.

---

## Features

- **Drag-and-drop layout builder** — drag grid rows and content elements from the sidebar onto the canvas
- **Grid system** — define custom column layouts (values must sum to 12)
- **Base CSS components** — Heading, Paragraph, Button, Alert, Table, Jumbotron
- **JavaScript components** — Accordion, Tabs, Modal
- **Edit / Developer / Preview modes** — inspect clean output before downloading
- **Viewport simulation** — preview at Desktop / Laptop / Tablet / Mobile widths
- **Undo / Redo** — full history backed by `localStorage`
- **Download or copy HTML** — generates a standalone Bootstrap 5 HTML file or snippet ready to paste into Moodle

---

## Requirements

| Requirement | Version |
|---|---|
| Moodle | 4.1 or later |
| PHP | 7.4 or later |
| Theme | Boost (or a Boost-based theme) |

> **Note:** The plugin uses jQuery UI (`.draggable` / `.sortable`) which is bundled with Moodle but deprecated as of Moodle 4.x. It continues to work; a future release will migrate to a vanilla JS drag library.

---

## Installation

### From GitHub

1. Download or clone this repository:
   ```bash
   git clone https://github.com/verzog/moodle-local_bootstrapbuilder.git local_bootstrapbuilder
   ```
2. Copy the `local_bootstrapbuilder` folder into your Moodle installation's `local/` directory:
   ```
   {moodle_root}/local/local_bootstrapbuilder/
   ```
3. Log in to Moodle as an administrator and go to **Site Administration → Notifications** to trigger the plugin installer.

### AMD build (production)

The plugin ships with an unminified copy of the AMD module in `amd/build/` which works when JavaScript caching is disabled. For production use, compile a proper minified build from the Moodle root:

```bash
grunt amd --root=local/local_bootstrapbuilder
```

During development, disable caching at **Site Administration → Development → Debugging → Cache JavaScript = No**.

---

## Configuration

### Grant access

By default no roles have the `local/bootstrapbuilder:use` capability. Grant it to the roles that should have access:

1. Go to **Site Administration → Users → Permissions → Define roles**
2. Edit the relevant role (e.g. *Editing teacher*, *Manager*)
3. Search for `local/bootstrapbuilder:use` and set it to **Allow**

### Access the tool

Navigate directly to:
```
https://your-moodle.com/local/bootstrapbuilder/index.php
```

You can add this URL as a custom menu item under **Site Administration → Appearance → Theme settings → Custom menu items**.

---

## Usage

1. **Build your layout** — drag row templates from the *Grid System* section onto the canvas, then drag content elements into the columns
2. **Edit content** — click the *Editor* button on any element to edit its HTML directly
3. **Preview** — use the *Developer* or *Preview* mode buttons to see the clean output
4. **Export** — click *Download HTML* to copy the snippet or download a standalone HTML file
5. **Paste into Moodle** — switch a Page/Label/Text to HTML source view and paste the snippet

---

## Plugin structure

```
local_bootstrapbuilder/
├── version.php                      Plugin metadata
├── index.php                        Main controller (auth + template render)
├── styles.css                       Scoped UI styles
├── db/
│   └── access.php                   Capability definitions
├── lang/en/
│   └── local_bootstrapbuilder.php   English language strings
├── templates/
│   └── main.mustache                Builder UI (toolbar, sidebar, canvas, modals)
└── amd/
    ├── src/builder.js               AMD source module
    └── build/builder.min.js         Build output (sync from src until grunt is run)
```

---

## License

This plugin is free software: you can redistribute it and/or modify it under the terms of the [GNU General Public License](https://www.gnu.org/licenses/gpl-3.0.html) as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
