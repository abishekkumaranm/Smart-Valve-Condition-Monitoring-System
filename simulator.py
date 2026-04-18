import random
import time

valves = {}

for i in range(1,11):

    valves[i] = {
        "pressure": random.uniform(65,75),
        "temperature": random.uniform(45,55),
        "vibration": random.uniform(0.3,0.6),
        "position":"OPEN",
        "flow":"FORWARD",
        "failure":False
    }

demo_failure_valve = 3


def simulate_failure():

    if random.random() < 0.05:
        valves[demo_failure_valve]["failure"] = True


def update_valves():

    simulate_failure()

    for v in valves:

        valve = valves[v]

        if valve["failure"]:

            valve["pressure"] -= random.uniform(1,3)
            valve["temperature"] += random.uniform(0.5,1.2)
            valve["vibration"] += random.uniform(0.3,0.7)

        else:

            valve["pressure"] += random.uniform(-0.5,0.5)
            valve["temperature"] += random.uniform(-0.3,0.3)
            valve["vibration"] += random.uniform(-0.05,0.05)

        valve["pressure"] = max(40,min(120,valve["pressure"]))
        valve["temperature"] = max(30,min(120,valve["temperature"]))
        valve["vibration"] = max(0.1,min(5,valve["vibration"]))

    return valves