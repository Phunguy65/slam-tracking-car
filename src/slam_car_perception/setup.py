from setuptools import setup

package_name = "slam_car_perception"

setup(
    name=package_name,
    version="0.1.0",
    packages=[package_name],
    data_files=[
        ("share/ament_index/resource_index/packages", ["resource/" + package_name]),
        ("share/" + package_name, ["package.xml"]),
    ],
    install_requires=["setuptools"],
    zip_safe=True,
    maintainer="SLAM Car Dev",
    maintainer_email="dev@slamcar.local",
    description="Vision and face tracking nodes for SLAM Tracking Car",
    license="MIT",
    tests_require=["pytest"],
    entry_points={
        "console_scripts": [
            "cam_bridge_node = slam_car_perception.cam_bridge_node:main",
            "face_tracker_node = slam_car_perception.face_tracker_node:main",
            "face_follow_controller = slam_car_perception.face_follow_controller:main",
        ],
    },
)
