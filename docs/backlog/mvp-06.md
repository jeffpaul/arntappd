## Goal and current evidence

A controlled three-beer menu was previously reported as working. Accuracy on real restaurant/bar menus has not been established. Gather a small, permission-appropriate evaluation set covering multiple columns, brewery + beer names, prices, descriptions, vintages, dense menus, low light and glare.

Record extracted lines, expected beer, top-three match coverage, false confident matches, and whether the user can recover. This milestone is still-photo beer menus; shelves, tap handles and live camera tracking belong after MVP.

## Dependencies

- {{MVP-03}}
- {{MVP-05}}

## Acceptance criteria

- [ ] At least five representative real menu photos have recorded expected matches and actual results, with photos kept out of public Git history unless approved.
- [ ] A user can choose among up to three plausible candidates, search for the correct beer, and remove non-beer lines without silently accepting a match.
- [ ] Confirmed statistics attach to the intended beer; callouts do not overlap misleadingly, and crowded menus have a usable list fallback.
- [ ] Agreed alpha acceptance criteria and remaining limitations are documented using observed results, not only a successful demo.

## Tracking

Backlog ID: `MVP-06`. Phase: MVP.
