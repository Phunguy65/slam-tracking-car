import math

from slam_car_perception.leg_clusterer import cluster_scan, pair_legs


def test_cluster_scan_filters_leg_sized_cluster():
    ranges = [math.inf] * 20
    for index in range(9, 12):
        ranges[index] = 1.0

    clusters = cluster_scan(
        ranges,
        angle_min=-0.5,
        angle_increment=0.05,
        min_width=0.05,
        max_width=0.30,
    )

    assert len(clusters) == 1
    assert 0.9 < clusters[0].centroid_range < 1.1
    assert 0.05 <= clusters[0].width <= 0.30


def test_pair_legs_respects_gap_thresholds():
    clusters = cluster_scan(
        [1.0, 1.0, 1.0, math.inf, 1.0, 1.0, 1.0],
        angle_min=-0.15,
        angle_increment=0.05,
        min_width=0.05,
        max_width=0.30,
    )

    assert pair_legs(clusters, 0.10, 0.35)
    assert not pair_legs(clusters, 0.30, 0.35)
