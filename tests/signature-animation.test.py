from pathlib import Path
import hashlib
import sys

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ANIMATION = (
    Path(sys.argv[1])
    if len(sys.argv) > 1
    else ROOT / "images" / "signature" / "maxim-signature-writing.webp"
)
EXPECTED_SIZE = (1120, 747)
EXPECTED_FRAME_COUNT = 35
EXPECTED_FRAME_DURATION_MS = 40
EARLY_LEFT_STROKE_LAST_FRAME = 18
EXPECTED_FINAL_RGBA_SHA256 = "27a22a9f7af781e926bd631b9d58e34a2d1deb2aac964ea3a97b7303462a45ad"


def read_webp_frame_durations(path: Path) -> list[int]:
    data = path.read_bytes()
    offset = 12
    durations: list[int] = []

    while offset + 8 <= len(data):
        tag = data[offset : offset + 4]
        size = int.from_bytes(data[offset + 4 : offset + 8], "little")
        payload = data[offset + 8 : offset + 8 + size]
        if tag == b"ANMF":
            durations.append(int.from_bytes(payload[12:15], "little"))
        offset += 8 + size + (size & 1)

    return durations


def load_alpha_frames(path: Path) -> np.ndarray:
    image = Image.open(path)
    assert image.size == EXPECTED_SIZE, f"unexpected animation size: {image.size}"
    assert image.n_frames == EXPECTED_FRAME_COUNT, f"unexpected frame count: {image.n_frames}"
    assert image.info.get("loop") == 1, "signature animation must play once"

    frames = []
    for frame_index in range(image.n_frames):
        image.seek(frame_index)
        frames.append(np.asarray(image.convert("RGBA"))[:, :, 3] > 8)

    return np.stack(frames)


def main() -> None:
    assert ANIMATION.exists(), "signature animation is missing"

    durations = read_webp_frame_durations(ANIMATION)
    assert durations == [EXPECTED_FRAME_DURATION_MS] * EXPECTED_FRAME_COUNT, durations
    assert sum(durations) == 1400, f"unexpected duration: {sum(durations)} ms"

    frames = load_alpha_frames(ANIMATION)
    disappearing = frames[:-1] & ~frames[1:]
    assert not disappearing.any(), "visible signature pixels disappear between frames"

    first_visible = np.argmax(frames, axis=0)
    ever_visible = frames.any(axis=0)
    first_visible[~ever_visible] = -1

    y, x = np.indices(first_visible.shape)
    indicated_stroke = (
        (x >= 440)
        & (x <= 500)
        & (np.abs(y - (-1.44 * x + 1105)) <= 15)
        & ever_visible
    )
    late_indicated_pixels = indicated_stroke & (first_visible > EARLY_LEFT_STROKE_LAST_FRAME)
    assert not late_indicated_pixels.any(), (
        f"{int(late_indicated_pixels.sum())} pixels of the indicated left stroke "
        "still appear after the central part has started"
    )

    final_burst = first_visible == EXPECTED_FRAME_COUNT - 1
    assert not final_burst.any(), (
        f"the final frame still reveals {int(final_burst.sum())} previously missing pixels"
    )

    image = Image.open(ANIMATION)
    image.seek(image.n_frames - 1)
    final_hash = hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()
    assert final_hash == EXPECTED_FINAL_RGBA_SHA256, "final frame differs from the accepted original"

    print("signature animation checks passed")


if __name__ == "__main__":
    main()
