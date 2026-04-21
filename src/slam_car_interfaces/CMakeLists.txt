cmake_minimum_required(VERSION 3.8)
project(slam_car_interfaces)

find_package(ament_cmake REQUIRED)
find_package(rosidl_default_generators REQUIRED)
find_package(std_msgs REQUIRED)

rosidl_generate_interfaces(${PROJECT_NAME}
  # Existing messages
  "msg/RobotMode.msg"
  # Person tracking messages
  "msg/BoundingBox2D.msg"
  "msg/TrackedPerson.msg"
  "msg/TrackedPersonArray.msg"
  "msg/EnrolledPerson.msg"
  "msg/EnrollmentStatus.msg"
  # Existing services
  "srv/SetMode.srv"
  "srv/ListMaps.srv"
  "srv/LoadMap.srv"
  # Person enrollment services
  "srv/AddPerson.srv"
  "srv/RemovePerson.srv"
  "srv/ListPersons.srv"
  "srv/SetTrackingTarget.srv"
  "srv/GetTrackingTarget.srv"
  DEPENDENCIES std_msgs
)

ament_package()
