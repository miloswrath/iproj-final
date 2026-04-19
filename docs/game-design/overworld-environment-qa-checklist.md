# Overworld Environment QA Checklist

Use this checklist for every handcrafted overworld zone before merging.

## Route Readability

- [ ] Primary route is visible within 10 seconds from spawn.
- [ ] Critical route keeps 2+ tile width; no forced 1-tile choke on main path.
- [ ] Landmark anchors appear every 16-20 tiles on major route.
- [ ] Dungeon gate/objective marker is visible and distinct from decor.

## Tile And Layer Integrity

- [ ] Ground layer uses deterministic tile assignment only.
- [ ] Transition layer appears only on path-adjacent blend cells.
- [ ] Collision layer is source of truth; no hidden blockers in visual-only layers.
- [ ] Decor and foreground layers never hide objective text/marker.
- [ ] No obvious seam, gap, or broken edge at map boundaries.

## Collision And Traversal

- [ ] Spawn cell is not blocked.
- [ ] Goal/dungeon gate cell is not blocked.
- [ ] A valid walkable route exists from spawn to gate.
- [ ] Normal movement traversal completes 3 full loops with no stuck points.
- [ ] Sprint traversal completes 3 full loops with no unexpected clipping.

## Ambient And Performance

- [ ] Ambient types are limited to approved list (foliage, water, torch/fx, critters).
- [ ] Simultaneously visible ambient loops are <= 35.
- [ ] Average FPS remains >= 60 during traversal.
- [ ] No large frame drops during city-approach camera movement.

## Regression Guard

- [ ] Overworld -> dungeon entry flow still works with E interaction.
- [ ] Returning from dungeon preserves expected spawn context.
- [ ] HUD prompts remain readable over all tested backgrounds.
