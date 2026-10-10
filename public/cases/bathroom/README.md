# Bathroom Demo Cases

RoomFacelift AI redesign demonstrations for the `/bathroom-design` page.

These are **AI concept redesigns**, not real-world construction outcomes. They must
never be described as actual completed renovations, customer projects, contractor
work, or real-world construction results.

## Folder structure

```
public/cases/bathroom/
├── modern/
│   ├── before.jpg   # original source photo
│   ├── after.jpg    # actual RoomFacelift generated final frame
│   └── after.mp4    # actual RoomFacelift before→after video
├── japandi/
│   ├── before.jpg
│   ├── after.jpg
│   └── after.mp4
└── luxury/
    ├── before.jpg
    ├── after.jpg
    └── after.mp4
```

## Case mapping

| Style   | Folder                      |
| ------- | --------------------------- |
| Modern  | `public/cases/bathroom/modern/`  |
| Japandi | `public/cases/bathroom/japandi/` |
| Luxury  | `public/cases/bathroom/luxury/`  |

## Future generated asset convention

Each case will eventually contain exactly three files:

- `before.jpg` — the original source photo
- `after.jpg` — the actual RoomFacelift generated final frame
- `after.mp4` — the actual RoomFacelift before→after video

Only add these files after they are actually generated. Do not fabricate results
or use unrelated photos as before/after examples.

## General BEFORE photo requirements

- A real bathroom photograph.
- Legally usable by RoomFacelift (owned or licensed for commercial use).
- No visible watermark, and no copyrighted stock watermark.
- No identifiable people.
- No private or personal information (names, addresses, faces, documents).
- One clearly framed room.
- Camera reasonably level.
- Bathroom geometry clearly visible.
- Walls, floor, vanity, shower, or tub visible where possible.
- No extreme fisheye distortion.
- No heavy filters or HDR look.
- Minimum preferred resolution: 1200px on the long edge.
- JPEG preferred.
- Avoid extremely dark or overexposed images.

## Modern BEFORE photo

Target a normal or slightly dated small/medium bathroom.

Prefer:

- Visible vanity.
- Shower or bathtub.
- Plain tile.
- Neutral existing materials.
- Clear opportunity for a modern redesign.

Avoid:

- Already highly designed luxury bathrooms.
- Extremely cluttered rooms.

Expected filename: `public/cases/bathroom/modern/before.jpg`

## Japandi BEFORE photo

Target a simple bathroom with clear structure and enough visible surfaces to
apply natural materials.

Prefer:

- Neutral starting palette.
- Visible floor and walls.
- Vanity.
- Clean geometry.
- Natural light if possible.

Expected filename: `public/cases/bathroom/japandi/before.jpg`

## Luxury BEFORE photo

Target a medium/large bathroom that can visibly support a more premium redesign.

Prefer:

- Bathtub or walk-in shower.
- Larger vanity.
- More visible wall and floor area.
- Enough visual space for premium materials and lighting.

Expected filename: `public/cases/bathroom/luxury/before.jpg`

## Truthful presentation

When these cases are connected to the page, show a small visible label near the
examples:

**AI concept redesign**

This keeps the presentation honest and distinguishes demonstration renders from
real renovations.