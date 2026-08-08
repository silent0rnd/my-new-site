from __future__ import annotations

import argparse
import os
import shutil
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.spatial import cKDTree


FRAME_COUNT = 35
FRAME_DURATION_MS = 40
DRAWING_LAST_FRAME = FRAME_COUNT - 2
EXPECTED_SIZE = (1120, 747)


@dataclass(frozen=True)
class PenMove:
    name: str
    points: tuple[tuple[float, float], ...]
    start: float
    end: float
    radius: float


# Coordinates are in the 1120 x 747 raster used by the footer animation.
# Intersections are intentionally repeated: the earliest passing pen move owns them.
PEN_MOVES = (
    PenMove(
        "left-loop",
        (
            (363, 467), (405, 413), (450, 355), (480, 306), (490, 274),
            (478, 263), (445, 263), (399, 276), (347, 300), (293, 337),
            (244, 382), (203, 432), (174, 487), (160, 535), (161, 567),
            (176, 588), (207, 598), (247, 590), (294, 567), (342, 536),
            (391, 496), (430, 458), (462, 421),
        ),
        0.00,
        0.34,
        18,
    ),
    PenMove(
        "first-high-stroke",
        ((455, 412), (487, 357), (520, 297), (551, 238), (581, 180), (613, 126)),
        0.34,
        0.45,
        15,
    ),
    PenMove(
        "second-high-stroke",
        (
            (400, 557), (430, 507), (460, 459), (493, 408), (527, 357),
            (563, 304), (601, 249), (638, 195), (671, 147), (693, 123),
        ),
        0.45,
        0.58,
        18,
    ),
    PenMove(
        "central-letters",
        (
            (451, 409), (478, 420), (500, 409), (513, 390), (529, 372),
            (543, 366), (545, 376), (534, 387), (517, 391), (505, 399),
            (521, 405), (548, 397), (570, 381), (590, 356), (600, 350),
            (603, 360), (593, 374), (579, 383), (592, 388), (618, 381),
            (644, 365), (651, 351), (653, 339), (645, 350), (634, 365),
            (647, 373), (674, 370), (704, 357), (738, 338), (772, 316),
            (797, 298),
        ),
        0.58,
        0.77,
        20,
    ),
    PenMove(
        "final-rise",
        (
            (507, 680), (523, 644), (550, 604), (581, 561), (613, 517),
            (646, 472), (681, 425), (718, 375), (756, 325), (795, 280),
        ),
        0.77,
        0.90,
        15,
    ),
    PenMove(
        "final-loop",
        (
            (795, 280), (824, 234), (856, 188), (891, 143), (925, 106),
            (956, 79), (980, 66), (998, 68), (1005, 77), (1000, 94),
            (983, 119), (955, 148), (921, 177), (884, 207), (846, 234),
            (812, 259), (795, 280),
        ),
        0.90,
        0.995,
        15,
    ),
)


def sample_move(move: PenMove) -> tuple[np.ndarray, np.ndarray]:
    points = np.asarray(move.points, dtype=np.float64)
    segments = points[1:] - points[:-1]
    lengths = np.linalg.norm(segments, axis=1)
    total_length = float(lengths.sum())
    samples: list[np.ndarray] = []
    progress: list[np.ndarray] = []
    distance_before = 0.0

    for index, (start, delta, length) in enumerate(zip(points[:-1], segments, lengths)):
        sample_count = max(2, int(np.ceil(length)) + 1)
        segment_progress = np.linspace(0.0, 1.0, sample_count, endpoint=index == len(lengths) - 1)
        samples.append(start + segment_progress[:, None] * delta)
        progress.append((distance_before + segment_progress * length) / total_length)
        distance_before += float(length)

    return np.concatenate(samples), np.concatenate(progress)


def build_reveal_time(source: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    alpha = source[:, :, 3]
    foreground = alpha > 0
    y, x = np.where(foreground)
    pixels = np.column_stack((x, y))

    best_distance = np.full(len(pixels), np.inf, dtype=np.float64)
    best_time = np.zeros(len(pixels), dtype=np.float64)
    reveal_time = np.full(len(pixels), np.nan, dtype=np.float64)

    for move in PEN_MOVES:
        samples, progress = sample_move(move)
        distance, sample_index = cKDTree(samples).query(pixels, workers=-1)
        move_time = move.start + progress[sample_index] * (move.end - move.start)
        better = distance < best_distance
        best_distance[better] = distance[better]
        best_time[better] = move_time[better]

        unassigned = np.isnan(reveal_time)
        claimed = unassigned & (distance <= move.radius)
        reveal_time[claimed] = move_time[claimed]

    reveal_time[np.isnan(reveal_time)] = best_time[np.isnan(reveal_time)]

    time_map = np.full(foreground.shape, np.inf, dtype=np.float64)
    time_map[y, x] = reveal_time
    return foreground, time_map


def create_frames(source: np.ndarray, frame_directory: Path) -> None:
    foreground, reveal_time = build_reveal_time(source)
    reveal_frame = np.full(foreground.shape, DRAWING_LAST_FRAME, dtype=np.int16)
    reveal_frame[foreground] = np.minimum(
        DRAWING_LAST_FRAME,
        np.floor(reveal_time[foreground] * (DRAWING_LAST_FRAME + 1)).astype(np.int16),
    )
    opaque_y, opaque_x = np.argwhere(source[:, :, 3] == 255)[0]

    for frame_index in range(FRAME_COUNT):
        visible = foreground & (reveal_frame <= min(frame_index, DRAWING_LAST_FRAME))
        frame = source.copy()
        frame[:, :, 3] = np.where(visible, source[:, :, 3], 0)
        if frame_index == DRAWING_LAST_FRAME:
            # Keep the 40 ms hold as a separate WebP frame. The one-level alpha
            # difference is inside an opaque stroke and is visually imperceptible.
            frame[opaque_y, opaque_x, 3] = 254
        Image.fromarray(frame, "RGBA").save(frame_directory / f"frame-{frame_index:03d}.png")


def encode_webp(frame_directory: Path, output: Path) -> None:
    frames = [
        Image.open(frame_directory / f"frame-{frame_index:03d}.png").convert("RGBA")
        for frame_index in range(FRAME_COUNT)
    ]
    frames[0].save(
        output,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_DURATION_MS,
        loop=1,
        lossless=True,
        quality=100,
        method=4,
        minimize_size=False,
        allow_mixed=False,
    )


def load_source(path: Path) -> np.ndarray:
    image = Image.open(path)
    if getattr(image, "n_frames", 1) > 1:
        image.seek(image.n_frames - 1)
    rgba = image.convert("RGBA")
    if rgba.size != EXPECTED_SIZE:
        raise ValueError(f"source must be {EXPECTED_SIZE[0]} x {EXPECTED_SIZE[1]}, got {rgba.size}")
    return np.asarray(rgba).copy()


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate the footer signature animation")
    parser.add_argument("--source", required=True, type=Path, help="1120 x 747 RGBA source image")
    parser.add_argument("--output", required=True, type=Path, help="output animated WebP")
    return parser.parse_args()


def main() -> None:
    arguments = parse_arguments()
    source = load_source(arguments.source)
    arguments.output.parent.mkdir(parents=True, exist_ok=True)

    frame_directory = arguments.output.parent / f".signature-writing-frames-{os.getpid()}"
    frame_directory.mkdir(exist_ok=False)

    try:
        create_frames(source, frame_directory)
        encode_webp(frame_directory, arguments.output)
    finally:
        shutil.rmtree(frame_directory, ignore_errors=True)

    print(arguments.output)


if __name__ == "__main__":
    main()
