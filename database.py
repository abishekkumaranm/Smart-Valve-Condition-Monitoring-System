history = {i:[] for i in range(1,11)}

def log_event(valve_id,message):

    history[valve_id].append(message)

def get_history(valve_id):

    return history[valve_id]