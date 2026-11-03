/**
 * deepchess — Host half.
 *
 * The whole game is a browser-side surface: rules, AI, dialogue and the panel
 * live in the Client half (`./client.js`). A local game needs no Host data, no
 * Tool and no prompt section, so this half is intentionally empty; the row
 * exists so the bundle owns the Client registration lifetime.
 */

/** Activate the bundle. No Host-side resources are registered. */
export function apply() {}
