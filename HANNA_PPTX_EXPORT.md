# Hanna PPTX export

Hanna can export the latest assistant response as PDF, DOCX, or PPTX. PPTX exports support four visual templates and three transition settings.

| Template | Visual direction |
|---|---|
| `liverton` | Liverton green accent on a light slate background. This is the default. |
| `minimal` | Neutral grayscale styling on a clean white background. |
| `midnight` | Dark navy background with a bright blue accent and light text. |
| `sunrise` | Warm cream background with an orange accent and dark brown text. |

| Animation | PowerPoint behavior |
|---|---|
| `none` | No slide transition metadata is added. |
| `calm` | Adds a slow fade transition to each slide. |
| `dynamic` | Adds a fast leftward push transition to each slide. |

The authenticated `POST /api/hanna-artifact` endpoint accepts the existing `title`, `content`, and `format` fields. When `format` is `pptx`, it also accepts `template` and `animation`. Invalid values are rejected with a client error, and omitted values fall back to `liverton` and `none`.

Example request body:

```json
{
  "title": "Photosynthesis lesson",
  "content": "# Overview\nPlants use light energy.",
  "format": "pptx",
  "template": "midnight",
  "animation": "calm"
}
```

The Hanna interface exposes both selectors beside the latest-response export controls. The selected settings are sent only for PPTX exports; PDF and DOCX exports continue to use their existing generation paths.

PowerPoint transition metadata is applied directly to the generated Office Open XML slide package after slide creation. This means the settings are preserved when the downloaded file is opened in PowerPoint-compatible software.
