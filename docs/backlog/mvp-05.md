## Goal and current evidence

Mobile Chromium emulation does not validate physical iOS behavior. The primary tester uses an iPhone 17 and Safari. Exercise both camera capture and photo-library selection over HTTPS, including orientation, HEIC-origin images, large photos, camera cancellation and retry.

Inspect what Safari actually delivers before deciding whether a format-conversion change is necessary.

## Dependencies

- {{MVP-02}}
- {{MVP-03}}

## Acceptance criteria

- [ ] Taking a new photo and selecting an existing photo each complete the scan-to-match flow on the physical device.
- [ ] Portrait/landscape rotation and client normalization keep OCR coordinates aligned with the displayed photo.
- [ ] HEIC/library input either converts reliably or gives clear, actionable format guidance; failures do not leave the UI stuck.
- [ ] Photo preview, processing consent, loading, cancel and retry controls work without horizontal overflow or clipped primary actions.

## Tracking

Backlog ID: `MVP-05`. Phase: MVP.
