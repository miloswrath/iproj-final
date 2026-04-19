# Overworld Tile Workflow (Sprint 2 Baseline)

## Purpose

This document defines deterministic placement rules for the handcrafted overworld zone used in Sprint 2. The goal is consistent visual quality, route readability, and collision clarity across runs.

## Fixed Layer Stack

1. Ground layer
- Base terrain tiles only (field, city, water, path).
- No collision logic in this layer.

2. Transition layer
- Soft blend cells where path meets field/city.
- Decorative-only; never blocks movement.

3. Collision layer
- Single source of truth for blocked cells.
- Blockers are visible with edge marking; no hidden blockers on critical routes.

4. Decor layer
- Bushes, trees, flowers, and lanterns.
- Visual depth and landmark support without obscuring route.

5. Foreground layer
- High-depth props that can overlap the player visually (for depth composition).
- Must not remove readability of objective marker or critical path.

## Tile Placement Rules

- Overworld layout is handcrafted and deterministic: no random generation.
- Critical route must be at least 2 tiles wide at all points.
- Path contrast target is +15% against adjacent ground colors.
- Transition cells are auto-generated only on path-adjacent field/city cells.
- Water cells are always collision-blocked.
- City approach zone is explicitly bounded and separated from outskirts by route turns.
- Landmark spacing along major route targets 16-20 tiles.

## Collision Rules

- Collision logic uses blocked-cell map only.
- Main route is audited for hidden blockers after each layout change.
- Decorative collision (trees/banners) is allowed only off the critical route.
- Boundary walls are always blocked to prevent out-of-map traversal.

## Decoration Rules

- Decoration is deterministic with fixed coordinates (no procedural clutter).
- Props are authored in named clusters (spawn outskirts, bridge pocket, path guidance, city entry lights) to avoid random hotspots.
- Approved ambient types for Sprint 2:
  - foliage sway placeholders
  - water animation placeholders
  - torch/fx loop placeholders
  - critter loop placeholders
- Animated ambient loop count must stay <= 35 visible at once (current baseline: 13).
- If final art is missing, use placeholder sprites/shapes and preserve hook points for swaps.
- Place landmarks before secondary decor to protect route/objective readability.

## Validation Checklist

- Traverse map perimeter and verify no seam-like gaps or orphaned transitions.
- Traverse critical route with normal and sprint speeds without collision confusion.
- Verify dungeon gate and route landmarks are identifiable within 10 seconds.
- Confirm all blockers are visually marked and represented in collision layer.
