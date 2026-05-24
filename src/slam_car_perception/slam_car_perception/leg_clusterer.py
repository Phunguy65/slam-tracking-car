import math
from dataclasses import dataclass


@dataclass(frozen=True)
class LegCluster:
    centroid_range: float
    centroid_angle: float
    width: float
    x: float
    y: float


def cluster_scan(
    ranges,
    angle_min: float,
    angle_increment: float,
    min_width: float = 0.05,
    max_width: float = 0.30,
    min_range: float = 0.3,
    max_range: float = 3.0,
    range_jump_threshold: float = 0.05,
) -> list[LegCluster]:
    """Cluster adjacent LiDAR points into leg-sized objects."""
    clusters = []
    current = []

    def add_current_cluster():
        if len(current) < 2:
            return

        xs = [r * math.cos(a) for r, a in current]
        ys = [r * math.sin(a) for r, a in current]
        width = math.hypot(xs[-1] - xs[0], ys[-1] - ys[0])
        centroid_x = sum(xs) / len(xs)
        centroid_y = sum(ys) / len(ys)
        centroid_range = math.hypot(centroid_x, centroid_y)
        centroid_angle = math.atan2(centroid_y, centroid_x)

        if min_width <= width <= max_width and min_range <= centroid_range <= max_range:
            clusters.append(
                LegCluster(
                    centroid_range=centroid_range,
                    centroid_angle=centroid_angle,
                    width=width,
                    x=centroid_x,
                    y=centroid_y,
                )
            )

    previous_range = None
    for index, raw_range in enumerate(ranges):
        current_angle = angle_min + index * angle_increment
        valid = math.isfinite(raw_range) and min_range <= raw_range <= max_range
        if not valid:
            add_current_cluster()
            current = []
            previous_range = None
            continue

        if (
            previous_range is not None
            and abs(raw_range - previous_range) > range_jump_threshold
        ):
            add_current_cluster()
            current = []

        current.append((float(raw_range), current_angle))
        previous_range = float(raw_range)

    add_current_cluster()
    return clusters


def pair_legs(
    clusters: list[LegCluster],
    min_gap: float = 0.15,
    max_gap: float = 0.35,
) -> list[tuple[float, float]]:
    """Pair leg clusters by centroid gap and return centroid range and bearing."""
    pairs = []
    for left_index, left in enumerate(clusters):
        for right in clusters[left_index + 1 :]:
            gap = math.hypot(left.x - right.x, left.y - right.y)
            if min_gap <= gap <= max_gap:
                x = (left.x + right.x) / 2.0
                y = (left.y + right.y) / 2.0
                pairs.append((math.hypot(x, y), math.atan2(y, x)))
    return pairs
