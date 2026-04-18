from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4

import matplotlib.pyplot as plt
import datetime
import os


def generate_report(valve_id, data):

    pressure = data["pressure"]
    temperature = data["temperature"]
    vibration = data["vibration"]

    # --- AI Recommendation ---
    if vibration > 8:
        ai_text = "AI Recommendation: High vibration detected. Immediate inspection required."
    else:
        ai_text = "AI Recommendation: Valve operating within optimal parameters."

    # --- Chart Generation ---
    chart_file = f"chart_{valve_id}.png"

    values = [pressure, temperature, vibration]
    labels = ["Pressure", "Temperature", "Vibration"]

    plt.figure()
    plt.bar(labels, values)
    plt.title(f"Valve {valve_id} Sensor Snapshot")
    plt.savefig(chart_file)
    plt.close()

    # --- PDF File ---
    file_path = f"valve_report_{valve_id}.pdf"

    styles = getSampleStyleSheet()
    elements = []

    # --- Company Logo ---
    logo = "logo.png"
    if os.path.exists(logo):
        elements.append(Image(logo, width=120, height=60))

    elements.append(Paragraph("Industrial Valve Monitoring Report", styles['Title']))
    elements.append(Spacer(1, 10))

    # --- Date & Time ---
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    elements.append(Paragraph(f"Generated on: {now}", styles['Normal']))
    elements.append(Spacer(1, 20))

    # --- Sensor Table ---
    table_data = [
        ["Parameter", "Value"],
        ["Valve ID", f"V{valve_id}"],
        ["Pressure", f"{pressure} bar"],
        ["Temperature", f"{temperature} °C"],
        ["Vibration", vibration],
    ]

    table = Table(table_data)
    elements.append(table)

    elements.append(Spacer(1, 20))

    # --- AI Recommendation ---
    elements.append(Paragraph(ai_text, styles['Heading3']))

    elements.append(Spacer(1, 20))

    # --- Chart Image ---
    if os.path.exists(chart_file):
        elements.append(Image(chart_file, width=400, height=250))

    pdf = SimpleDocTemplate(file_path, pagesize=A4)
    pdf.build(elements)

    return file_path