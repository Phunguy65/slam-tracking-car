from setuptools import setup

package_name = "slam_car_navigation"

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
    description="Navigation management nodes for SLAM Tracking Car",
    license="MIT",
    tests_require=["pytest"],
    entry_points={
        "console_scripts": [
            "map_manager_node = slam_car_navigation.map_manager_node:main",
        ],
    },
)
