from slam_car_perception.tracking_controller_node import PID


def test_pid_step_response_positive_error():
    pid = PID(kp=2.0, ki=0.0, kd=0.0, limit=10.0)

    assert pid.step(0.5, 0.1) == 1.0


def test_pid_clamps_output():
    pid = PID(kp=10.0, ki=0.0, kd=0.0, limit=0.3)

    assert pid.step(1.0, 0.1) == 0.3
    assert pid.step(-1.0, 0.1) == -0.3
