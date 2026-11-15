# Changelog

## 0.3.0

- The arrow keys move focus between entries in every view and in search results, following the layout (also right to left), without changing the selection; arrows with a modifier key are left alone.
- Focus stays in the Finder when navigating removes the focused entry or disables Back or Forward, so Cmd/Ctrl+Shift+G keeps working.
- Go to folder: its field is named "Go to folder" for screen readers, and Enter and the arrow keys no longer act while an input method is composing.

## 0.2.0

- Columns in the columns view can be resized by dragging their right edge, as in Finder: Option-drag resizes all of them, a double-click resets, and the arrow keys work on the focused edge.

## 0.1.0

- First release: Finder-style icons, list and columns views over any `FinderFS`, with adapters for in-memory trees, modern-monaco and just-bash.
