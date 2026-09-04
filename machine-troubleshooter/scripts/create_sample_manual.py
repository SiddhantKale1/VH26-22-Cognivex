#!/usr/bin/env python3
"""Generate a sample test PDF manual for acceptance testing.

Creates a multi-page PDF with realistic machine troubleshooting content
including error codes, procedures, and technical specifications.

Usage:
    python scripts/create_sample_manual.py
"""

import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

import fitz  # PyMuPDF


MANUAL_PAGES = [
    # Page 1: Cover / Introduction
    (
        "CNC-X200 Service Manual\n\n"
        "Model: X200-4A\n"
        "Manufacturer: CogniVex Industrial Systems\n"
        "Document Version: 2.1\n\n"
        "This service manual provides comprehensive troubleshooting procedures, "
        "maintenance guidelines, and technical specifications for the CNC-X200 "
        "machining center.\n\n"
        "WARNING: This equipment operates at high voltages and speeds. "
        "Only qualified technicians should perform maintenance.\n\n"
        "Table of Contents:\n"
        "1. Safety Precautions ............... Page 2\n"
        "2. Spindle System .................. Page 3\n"
        "3. Error Codes ..................... Page 4\n"
        "4. Motor Troubleshooting ........... Page 5\n"
        "5. Coolant System .................. Page 6\n"
    ),
    # Page 2: Safety Precautions
    (
        "Chapter 1: Safety Precautions\n\n"
        "1.1 General Safety\n\n"
        "Before performing any maintenance or troubleshooting on the CNC-X200:\n\n"
        "1. Ensure the main power switch is in the OFF position\n"
        "2. Lock out and tag out all energy sources\n"
        "3. Wait at least 5 minutes for capacitors to discharge\n"
        "4. Verify zero energy state with a multimeter\n"
        "5. Wear appropriate PPE including safety glasses and gloves\n\n"
        "1.2 Electrical Safety\n\n"
        "The CNC-X200 operates on 480V three-phase power. Contact with live "
        "conductors can result in severe injury or death. Always follow "
        "lockout/tagout procedures before opening electrical panels.\n\n"
        "1.3 Mechanical Safety\n\n"
        "The spindle can rotate at speeds up to 12,000 RPM. Never attempt to "
        "stop the spindle by hand. Ensure all guards are in place before "
        "operating the machine.\n"
    ),
    # Page 3: Spindle System
    (
        "Chapter 2: Spindle System\n\n"
        "2.1 Spindle Overview\n\n"
        "The CNC-X200 uses a direct-drive spindle motor rated at 15kW. "
        "The spindle assembly consists of:\n"
        "- Main spindle motor (AC servo)\n"
        "- Angular contact bearings (front and rear)\n"
        "- Spindle encoder for position feedback\n"
        "- Automatic tool clamping mechanism\n"
        "- Coolant-through-spindle system\n\n"
        "2.2 Spindle Troubleshooting\n\n"
        "If the spindle is overheating, check the following:\n"
        "1. Verify coolant flow rate is within specification (2-4 L/min)\n"
        "2. Check bearing condition using vibration analysis\n"
        "3. Inspect spindle oil level and quality\n"
        "4. Verify the spindle load does not exceed 80% of rated capacity\n"
        "5. Check ambient temperature is below 40°C\n\n"
        "If the spindle fails to start:\n"
        "1. Check the spindle drive for fault codes\n"
        "2. Verify the spindle enable signal is active\n"
        "3. Check for mechanical interference\n"
        "4. Inspect the spindle motor cables for damage\n"
    ),
    # Page 4: Error Codes
    (
        "Chapter 3: Error Codes\n\n"
        "3.1 Spindle Error Codes\n\n"
        "Error E404 indicates spindle overload. "
        "Possible causes:\n"
        "1. Excessive spindle load\n"
        "2. Insufficient lubrication\n"
        "3. Abnormal motor current\n\n"
        "Corrective action for E404:\n"
        "- Reduce cutting parameters (speed, feed, depth of cut)\n"
        "- Check spindle bearing condition\n"
        "- Verify lubrication system operation\n"
        "- Monitor motor current during operation\n\n"
        "Error E405 indicates spindle encoder fault. "
        "Possible causes:\n"
        "1. Damaged encoder cable\n"
        "2. Encoder contamination\n"
        "3. Encoder alignment issue\n\n"
        "Error E410 indicates spindle overtemperature. "
        "The spindle temperature has exceeded the safe operating limit of 70°C. "
        "Allow the spindle to cool before resuming operation.\n\n"
        "3.2 Drive Error Codes\n\n"
        "Error E501 indicates servo drive overcurrent. "
        "Check motor winding resistance and cable connections.\n\n"
        "Error E502 indicates servo drive overvoltage. "
        "Check the power supply and braking resistor.\n"
    ),
    # Page 5: Motor Troubleshooting
    (
        "Chapter 4: Motor Troubleshooting\n\n"
        "4.1 Motor Not Starting\n\n"
        "If the motor is not starting, perform the following checks:\n\n"
        "1. Verify power supply voltage at the motor terminals\n"
        "2. Check the motor contactor is engaging properly\n"
        "3. Inspect thermal overload relay — reset if tripped\n"
        "4. Measure motor winding resistance between phases\n"
        "   - Expected: 2.5 ± 0.3 ohms between any two phases\n"
        "   - If open circuit: winding damage suspected\n"
        "   - If short circuit: insulation failure\n"
        "5. Check the motor drive parameters:\n"
        "   - Parameter P001: Motor rated current = 32A\n"
        "   - Parameter P002: Motor rated speed = 3000 RPM\n"
        "   - Parameter P003: Acceleration time = 5.0 sec\n\n"
        "4.2 Motor Vibration\n\n"
        "Excessive motor vibration may indicate:\n"
        "- Misalignment between motor and load\n"
        "- Worn or damaged bearings\n"
        "- Unbalanced rotating components\n"
        "- Loose mounting bolts\n\n"
        "Use a vibration analyzer to measure vibration levels. "
        "Acceptable limits: < 4.5 mm/s RMS velocity.\n"
    ),
    # Page 6: Coolant System
    (
        "Chapter 5: Coolant System\n\n"
        "5.1 Coolant System Overview\n\n"
        "The CNC-X200 uses a flood coolant system with the following specifications:\n"
        "- Tank capacity: 200 liters\n"
        "- Pump flow rate: 20 L/min at 3 bar\n"
        "- Recommended coolant concentration: 6-8%\n\n"
        "5.2 Coolant System Troubleshooting\n\n"
        "Error E301 indicates low coolant level. "
        "Refill the coolant tank and check for leaks in the system.\n\n"
        "Error E302 indicates coolant pump failure. "
        "Check pump motor and impeller. Verify electrical connections.\n\n"
        "5.3 Coolant Maintenance\n\n"
        "- Check coolant concentration weekly using a refractometer\n"
        "- Clean the coolant filter every 500 hours\n"
        "- Replace coolant every 2000 hours or when bacterial count exceeds limits\n"
        "- Inspect hoses and fittings monthly for leaks\n\n"
        "5.4 Coolant-Through-Spindle (CTS)\n\n"
        "The CTS system provides coolant directly through the tool at 70 bar. "
        "Ensure the rotary union seal is intact. Replace the seal if coolant "
        "leaks from the spindle housing.\n"
    ),
]


def create_sample_manual():
    """Create a sample PDF manual for testing."""
    output_dir = project_root / "data" / "manuals"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "CNC_X200_Service_Manual.pdf"

    doc = fitz.open()

    for page_text in MANUAL_PAGES:
        page = doc.new_page(width=595, height=842)  # A4 size
        # Insert text with a readable font
        text_rect = fitz.Rect(50, 50, 545, 792)
        page.insert_textbox(
            text_rect,
            page_text,
            fontsize=11,
            fontname="helv",
        )

    doc.save(str(output_path))
    doc.close()

    print(f"Sample manual created: {output_path}")
    print(f"  Pages: {len(MANUAL_PAGES)}")
    return output_path


if __name__ == "__main__":
    create_sample_manual()
