# Milestone photography

Self-hosted rather than hot-linked, so a change on someone else's CDN cannot
break the site or silently swap what a reader sees.

Each file is named for the milestone it belongs to, and the milestone's own
frontmatter carries the caption and the credit:

```yaml
media:
  url: "/media/2017-first-ai-for-good-global-summit.jpg"
  caption: "Sophia, the Hanson Robotics humanoid, on stage at …"
  credit: "© ITU/R. Farrell · CC BY 2.0 · flickr.com/photos/itupictures/34328656564"
```

The path is site-root-relative on purpose. `lib/timelinejs.ts` prefixes the
deployment base (`/unaiverse`) at build time, so content files never encode
where the site happens to live.

## What is here

| File | Licence | Credit |
| --- | --- | --- |
| `2017-first-ai-for-good-global-summit.jpg` | **CC BY 2.0** | © ITU/R. Farrell |
| `2023-ai-for-good-global-summit-2023.jpg` | CC BY-NC-SA 2.0 | © ITU/Rowan Farrell |
| `2024-ai-for-good-global-summit-2024.jpg` | CC BY-NC-SA 2.0 | © ITU Pictures |
| `2025-ai-for-good-global-summit-2025.jpg` | CC BY-NC-SA 4.0 | © ITU Pictures |
| `2026-ai-for-good-global-summit-2026.jpg` | CC BY-NC-SA 4.0 | © ITU/D. Woldu |

All five come from [ITU Pictures on Flickr](https://www.flickr.com/photos/itupictures/).
Licences vary photo by photo: the 2017 frame is CC BY, the rest are
NonCommercial-ShareAlike, so check the specific photo page before adding
another. NC is compatible with this project; it would not be with a commercial
one.

## Why there are only five

Two rules decide whether a milestone gets a photograph.

**It has to be free to use.** UN Photo is the obvious source for the General
Assembly and Security Council moments and it is closed: every image on the
[UN Photo Flickr](https://www.flickr.com/photos/un_photo/) is marked *All rights
reserved*, and `dam.media.un.org` returns 403 without an account. Getting those
photos means a permission request, not a download. UN News hero images are
hot-linkable but are mostly stock or file photos of other meetings: the story
announcing the AI Advisory Body runs an Unsplash circuit board, and the one
announcing the first General Assembly AI resolution runs a photo of a December
2023 emergency session.

**It has to be the actual thing.** The inaugural Global Dialogue on AI
Governance has no photo here even though ITU's Geneva coverage from the same
week is sitting right there, because that milestone's own text says the Dialogue
"was a separate UN event from the AI for Good Global Summit". An illustration
that contradicts the paragraph under it is worse than a blank.

Most milestones are documents and votes, not visual events. For those the
distinctive artefact is the resolution symbol and the date, which a rendered
card carries better, and more honestly, than another wide shot of a hall.
