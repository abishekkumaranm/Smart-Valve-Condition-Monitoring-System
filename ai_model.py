from sklearn.ensemble import IsolationForest
import numpy as np

model = IsolationForest(contamination=0.1)

training_data = np.array([
[70,50,0.4],
[72,52,0.5],
[68,48,0.4],
[75,55,0.6],
[65,47,0.3]
])

model.fit(training_data)


def predict_health(pressure,temp,vibration):

    X = np.array([[pressure,temp,vibration]])

    pred = model.predict(X)

    score = model.decision_function(X)[0]

    if pred[0] == -1:

        status = "CRITICAL"
        health = 30

    else:

        status = "HEALTHY"
        health = 90 + score*10

    return round(health,2), status